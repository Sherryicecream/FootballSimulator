import { createNarrativeServer } from '../src/server/narrative-server';
import { getLocalNarrativeHealth } from '../src/server/health';
import { createSafeNarrativeAdapter } from '../src';
import { MilestoneInputSchema, type NarrativePolishRequest } from '@football/contracts';
import {
  buildCareerSummaryRequest,
  buildMilestoneNarrationRequest,
  buildNarrativePolishRequest,
} from '../src';
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

const summaryRequest = buildCareerSummaryRequest({
  facts: {
    player: { name: '林河', hometown: '上海', position: '前锋', country: '中国' },
    tierLabel: '稳健生涯',
    ending: null,
    seasons: 1,
    clubs: 1,
    totals: { appearances: 10, minutes: 600, goals: 2, assists: 1 },
    nationalTeam: { capped: false, caps: 0, goals: 0 },
    overseasSpells: false,
    honours: [],
    seasonsTimeline: [],
    keyMoments: [],
    dimensions: [],
    behindTheScenes: { potentials: [], traits: [], missedOpportunities: [] },
    evidenceIds: [],
  },
  mode: 'short',
  canonicalFactsHash: 'c'.repeat(64),
});

const milestoneRequest = buildMilestoneNarrationRequest({
  input: MilestoneInputSchema.parse({
    kind: 'national-team',
    playerName: '林河',
    seasonId: 'national-2030',
    competitionType: '亚洲杯',
    competitionName: '2030 亚洲杯',
    appearances: 4,
    goals: 2,
    knockoutRound: '四强',
    honours: [{ kind: 'cup-champion', label: '足协杯冠军', seasonId: 'pro-2029' }],
    keyStats: [{ label: '职业生涯出场', value: 168, unit: '次' }],
    signatureMatches: [],
  }),
  canonicalFactsHash: 'd'.repeat(64),
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

  it('accepts career-summary requests on the existing narrative endpoint', async () => {
    let calls = 0;
    server = createNarrativeServer({
      adapter: {
        polish: async () => {
          throw new Error('not used');
        },
        summarize: async () => {
          calls += 1;
          return {
            source: 'provider',
            reason: 'provider',
            draft: { summary: '只根据事实包整理表达，不新增荣誉或国家队经历。'.repeat(8) },
          };
        },
      },
    });
    const url = await startServer(server);
    const first = await post(url, JSON.stringify(summaryRequest));
    const second = await post(url, JSON.stringify(summaryRequest));

    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ source: 'provider', reason: 'provider' });
    expect(second.json).toEqual(first.json);
    expect(calls).toBe(1);
  });

  it('accepts milestone requests on the existing narrative endpoint and caches provider output', async () => {
    let calls = 0;
    const narrative = '只根据国家队真实出场、荣誉和关键数据组织这一节点，不补写未提供的比赛事实。'
      .repeat(5)
      .slice(0, 200);
    server = createNarrativeServer({
      adapter: {
        polish: async () => {
          throw new Error('not used');
        },
        narrateMilestone: async () => {
          calls += 1;
          return { source: 'provider', reason: 'provider', draft: { narrative } };
        },
      },
    });
    const url = await startServer(server);
    const first = await post(url, JSON.stringify(milestoneRequest));
    const second = await post(url, JSON.stringify(milestoneRequest));

    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ source: 'provider', reason: 'provider' });
    expect(second.json).toEqual(first.json);
    expect(calls).toBe(1);
  });

  it('does not cache an unsafe provider result returned by a custom adapter', async () => {
    let calls = 0;
    server = createNarrativeServer({
      adapter: {
        polish: async () => {
          throw new Error('not used');
        },
        summarize: async () => {
          calls += 1;
          return {
            source: 'provider',
            reason: 'provider',
            draft: { summary: '他赢得了世界杯冠军。'.repeat(16) },
          };
        },
      },
    });
    const url = await startServer(server);

    const first = await post(url, JSON.stringify(summaryRequest));
    const second = await post(url, JSON.stringify(summaryRequest));

    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ source: 'fallback' });
    expect(second.json).toMatchObject({ source: 'fallback' });
    expect(calls).toBe(2);
  });
});
