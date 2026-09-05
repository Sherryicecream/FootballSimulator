import { createNarrativeServer } from '../src/server/narrative-server';
import { getLocalNarrativeHealth } from '../src/server/health';
import { createSafeNarrativeAdapter } from '../src';
import type { NarrativePolishRequest } from '@football/contracts';
import { buildNarrativePolishRequest } from '../src';
import type { AddressInfo, Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';

const draft = {
  response: '周教练听完解释后，暂时放下了疑虑。',
  participantResponses: [
    { personId: 'coach-1', personName: '周教练', role: 'youth-coach', text: '先把训练做好。' },
  ],
  followUp: '下一场训练中，你们的配合会受到观察。',
};

const request: NarrativePolishRequest = buildNarrativePolishRequest({
  kind: 'event-feedback',
  eventTitle: '训练场上的误会',
  choiceText: '澄清误会',
  playerName: '林河',
  participants: [{ personId: 'coach-1', personName: '周教练', role: 'youth-coach' }],
  draft,
});

const countingAdapter = () => {
  let calls = 0;
  const adapter = createSafeNarrativeAdapter({
    generate: async () => ({
      response: '周教练听完解释，眉头松开了。',
      participantResponses: [{ personId: 'coach-1', text: '先把训练做好。' }],
      followUp: draft.followUp,
    }),
  });
  return {
    adapter,
    calls: () => calls,
    wrap: () => ({
      polish: async (input: NarrativePolishRequest) => {
        calls += 1;
        return adapter.polish(input);
      },
    }),
  };
};

const startServer = async (server: Server): Promise<string> => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
};

const post = async (url: string, body: string): Promise<{ status: number; json: unknown }> => {
  const response = await fetch(`${url}/v1/narrative-polish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null };
};

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

describe('narrative server', () => {
  it('exposes health including provider configuration', async () => {
    server = createNarrativeServer({ adapter: createSafeNarrativeAdapter() });
    const url = await startServer(server);
    const response = await fetch(`${url}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      service: 'local-ai',
      status: 'ready',
      promptVersion: 'narrative-polish-v1',
      provider: { configured: false, model: null },
    });
    expect(getLocalNarrativeHealth({ providerConfigured: true, model: 'qwen' })).toEqual({
      service: 'local-ai',
      status: 'ready',
      promptVersion: 'narrative-polish-v1',
      provider: { configured: true, model: 'qwen' },
    });
  });

  it('polishes a request and serves identical requests from cache', async () => {
    const counted = countingAdapter();
    server = createNarrativeServer({ adapter: counted.wrap() });
    const url = await startServer(server);

    const first = await post(url, JSON.stringify(request));
    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ source: 'provider', reason: 'provider' });
    const second = await post(url, JSON.stringify(request));
    expect(second.json).toEqual(first.json);
    expect(counted.calls()).toBe(1);
  });

  it('returns fallback results without caching them as hits', async () => {
    const fallbackAdapter = {
      polish: async () => ({
        source: 'fallback' as const,
        reason: 'disabled' as const,
        draft: {
          response: draft.response,
          participantResponses: [{ personId: 'coach-1', text: '先把训练做好。' }],
          followUp: draft.followUp,
        },
      }),
    };
    server = createNarrativeServer({ adapter: fallbackAdapter });
    const url = await startServer(server);
    const result = await post(url, JSON.stringify(request));
    expect(result.status).toBe(200);
    expect(result.json).toMatchObject({ source: 'fallback', reason: 'disabled' });
  });

  it('rejects malformed bodies and wrong methods without crashing', async () => {
    server = createNarrativeServer({ adapter: createSafeNarrativeAdapter() });
    const url = await startServer(server);

    const badJson = await post(url, '{not-json');
    expect(badJson.status).toBe(400);

    const wrongMethod = await fetch(`${url}/v1/narrative-polish`);
    expect(wrongMethod.status).toBe(405);

    const oversized = await post(
      url,
      JSON.stringify({ ...request, context: { ...request.context, playerName: '名'.repeat(80) } }),
    );
    expect([200, 400]).toContain(oversized.status);
    const healthAfter = await fetch(`${url}/health`);
    expect(healthAfter.status).toBe(200);
  });
});
