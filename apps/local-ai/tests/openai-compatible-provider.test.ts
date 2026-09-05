import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { buildNarrativePolishRequest, createSafeNarrativeAdapter } from '../src';
import {
  createOpenAiCompatibleProvider,
  openAiCompatibleConfigFromEnv,
} from '../src/providers/openai-compatible';
import type { IncomingMessage, ServerResponse } from 'node:http';

const draft = {
  response: '周教练听完解释后，暂时放下了疑虑。',
  participantResponses: [
    { personId: 'coach-1', personName: '周教练', role: 'youth-coach', text: '先把训练做好。' },
  ],
  followUp: '下一场训练中，你们的配合会受到观察。',
};

const request = buildNarrativePolishRequest({
  kind: 'event-feedback',
  eventTitle: '训练场上的误会',
  choiceText: '澄清误会',
  playerName: '林河',
  participants: [{ personId: 'coach-1', personName: '周教练', role: 'youth-coach' }],
  draft,
});

const polishedContent = {
  response: '周教练听完解释，眉头松开了，拍拍你的肩膀回到训练。',
  participantResponses: [{ personId: 'coach-1', text: '先把训练做好，其他交给时间。' }],
  followUp: draft.followUp,
};

const completionBody = (content: string) => ({
  choices: [{ message: { role: 'assistant', content } }],
});

let upstream: Server | undefined;

const startUpstream = (
  handler: (req: IncomingMessage, res: ServerResponse, body: string) => void,
): Promise<{ url: string; hits: () => number }> => {
  let count = 0;
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        count += 1;
        handler(req, res, Buffer.concat(chunks).toString('utf-8'));
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      upstream = server;
      resolve({
        url: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/v1`,
        hits: () => count,
      });
    });
  });
};

afterEach(() => {
  upstream?.close();
  upstream = undefined;
});

describe('openai-compatible provider', () => {
  it('polishes through a local chat completion endpoint and sends the versioned request', async () => {
    let seenBody = '';
    let seenAuth = '';
    const { url } = await startUpstream((req, res, body) => {
      seenBody = body;
      seenAuth = req.headers.authorization ?? '';
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(completionBody(JSON.stringify(polishedContent))));
    });
    const provider = createOpenAiCompatibleProvider({
      endpoint: url,
      model: 'test-model',
      apiKey: 'local-key',
    });
    const result = await createSafeNarrativeAdapter(provider).polish(request);

    expect(result.source).toBe('provider');
    expect(result.draft.response).toContain('眉头松开');
    const parsed = JSON.parse(seenBody) as { model: string; temperature: number };
    expect(parsed.model).toBe('test-model');
    expect(parsed.temperature).toBe(0);
    expect(seenAuth).toBe('Bearer local-key');
    expect(seenBody).toContain('narrative-polish-v1');
  });

  it('accepts fenced json output from local models', async () => {
    const { url } = await startUpstream((_req, res) => {
      res.end(
        JSON.stringify(completionBody('```json\n' + JSON.stringify(polishedContent) + '\n```')),
      );
    });
    const result = await createSafeNarrativeAdapter(
      createOpenAiCompatibleProvider({ endpoint: url, model: 'test-model' }),
    ).polish(request);

    expect(result.source).toBe('provider');
    expect(result.draft.participantResponses[0]?.personId).toBe('coach-1');
  });

  it('maps http errors and unparseable content to safe fallbacks', async () => {
    const failing = await startUpstream((_req, res) => {
      res.statusCode = 500;
      res.end('boom');
    });
    const failResult = await createSafeNarrativeAdapter(
      createOpenAiCompatibleProvider({ endpoint: failing.url, model: 'm' }),
    ).polish(request);
    expect(failResult.source).toBe('fallback');
    expect(failResult.reason).toBe('provider-error');

    const garbage = await startUpstream((_req, res) => {
      res.end(JSON.stringify(completionBody('今天的天气不错，我们继续训练吧。')));
    });
    const garbageResult = await createSafeNarrativeAdapter(
      createOpenAiCompatibleProvider({ endpoint: garbage.url, model: 'm' }),
    ).polish(request);
    expect(garbageResult.source).toBe('fallback');
    expect(garbageResult.reason).toBe('invalid-output');
  });

  it('falls back when the local model never answers in time', async () => {
    const { url } = await startUpstream(() => {
      // 上游不响应，触发适配器超时
    });
    const result = await createSafeNarrativeAdapter(
      createOpenAiCompatibleProvider({ endpoint: url, model: 'm' }),
      { timeoutMs: 20 },
    ).polish(request);
    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('timeout');
  });

  it('reads configuration from environment variables and reports absence', () => {
    expect(
      openAiCompatibleConfigFromEnv({
        FOOTBALL_AI_ENDPOINT: 'http://127.0.0.1:11434/v1',
        FOOTBALL_AI_MODEL: 'qwen',
      }),
    ).toEqual({
      endpoint: 'http://127.0.0.1:11434/v1',
      model: 'qwen',
      apiKey: undefined,
      timeoutMs: undefined,
    });
    expect(openAiCompatibleConfigFromEnv({ FOOTBALL_AI_MODEL: 'qwen' })).toBeNull();
    expect(openAiCompatibleConfigFromEnv({})).toBeNull();
  });
});
