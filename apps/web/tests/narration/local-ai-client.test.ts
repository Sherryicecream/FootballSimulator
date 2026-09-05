import { describe, expect, it, vi } from 'vitest';
import { buildNarrativePolishRequest, type NarrativePolishOutput } from '@football/contracts';
import {
  createLocalNarrativeClient,
  createLocalNarrativeClientFromEnv,
} from '../../src/narration/local-ai-client';

const request = buildNarrativePolishRequest({
  kind: 'event-feedback',
  eventTitle: '训练场上的误会',
  choiceText: '当面澄清误会',
  playerName: '林河',
  participants: [{ personId: 'coach-1', personName: '周教练', role: 'youth-coach' }],
  draft: {
    response: '周教练听完解释后，暂时放下了疑虑。',
    participantResponses: [
      { personId: 'coach-1', personName: '周教练', role: 'youth-coach', text: '先把训练做好。' },
    ],
    followUp: '下一场训练中，你们的配合会受到观察。',
  },
});

const polished: NarrativePolishOutput = {
  response: '周教练听完解释，眉头松开了。',
  participantResponses: [{ personId: 'coach-1', text: '先把训练做好。' }],
  followUp: request.draft.followUp,
};

describe('local narrative client', () => {
  it('returns the provider draft from a healthy local service', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ source: 'provider', reason: 'provider', draft: polished }), {
          status: 200,
        }),
    );
    const client = createLocalNarrativeClient({ endpoint: 'http://127.0.0.1:8787', fetchImpl });
    await expect(client.polish(request)).resolves.toEqual(polished);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/v1/narrative-polish',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns null when the service is unavailable or unhelpful', async () => {
    const notFound = createLocalNarrativeClient({
      endpoint: 'http://127.0.0.1:8787',
      fetchImpl: async () => new Response('nope', { status: 404 }),
    });
    await expect(notFound.polish(request)).resolves.toBeNull();

    const networkError = createLocalNarrativeClient({
      endpoint: 'http://127.0.0.1:8787',
      fetchImpl: async () => {
        throw new Error('connection refused');
      },
    });
    await expect(networkError.polish(request)).resolves.toBeNull();

    const fallback = createLocalNarrativeClient({
      endpoint: 'http://127.0.0.1:8787',
      fetchImpl: async () =>
        new Response(JSON.stringify({ source: 'fallback', reason: 'disabled', draft: polished }), {
          status: 200,
        }),
    });
    await expect(fallback.polish(request)).resolves.toBeNull();

    const invalid = createLocalNarrativeClient({
      endpoint: 'http://127.0.0.1:8787',
      fetchImpl: async () => new Response('{"source":', { status: 200 }),
    });
    await expect(invalid.polish(request)).resolves.toBeNull();
  });

  it('never sends anything when no endpoint is configured', () => {
    expect(createLocalNarrativeClientFromEnv({})).toBeNull();
    const fetchImpl = vi.fn();
    const client = createLocalNarrativeClientFromEnv(
      { VITE_LOCAL_AI_ENDPOINT: 'http://127.0.0.1:8787' },
      fetchImpl as unknown as typeof fetch,
    );
    expect(client).not.toBeNull();
  });
});
