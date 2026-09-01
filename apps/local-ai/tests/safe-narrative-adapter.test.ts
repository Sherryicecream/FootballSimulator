import { describe, expect, it } from 'vitest';
import {
  buildNarrativePolishRequest,
  createDeterministicMockProvider,
  createSafeNarrativeAdapter,
} from '../src';

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

describe('safe narrative adapter', () => {
  it('falls back to the authored draft when no local provider is configured', async () => {
    const result = await createSafeNarrativeAdapter().polish(request);

    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('disabled');
    expect(result.draft).toEqual({
      response: draft.response,
      participantResponses: [{ personId: 'coach-1', text: '先把训练做好。' }],
      followUp: draft.followUp,
    });
  });
  it('provides a deterministic mock that only adds atmosphere', async () => {
    const result = await createSafeNarrativeAdapter(createDeterministicMockProvider()).polish(
      request,
    );

    expect(result.source).toBe('provider');
    expect(result.draft.response).toContain('场边的空气');
    expect(result.draft.participantResponses[0]?.personId).toBe('coach-1');
  });

  it('accepts a safe text-only rewrite without changing participant identity', async () => {
    const adapter = createSafeNarrativeAdapter({
      generate: async () => ({
        response: '周教练听完解释后，语气缓和了一些。',
        participantResponses: [{ personId: 'coach-1', text: '先把训练做好，再用表现证明自己。' }],
        followUp: '下一场训练中，配合会受到更多观察。',
      }),
    });

    const result = await adapter.polish(request);

    expect(result.source).toBe('provider');
    expect(result.draft.response).toContain('语气缓和');
  });

  it('rejects new numeric facts and falls back without mutating the draft', async () => {
    const adapter = createSafeNarrativeAdapter({
      generate: async () => ({
        response: '周教练听完解释后，给出了 99 分的评价。',
        participantResponses: [{ personId: 'coach-1', text: '先把训练做好。' }],
        followUp: draft.followUp,
      }),
    });

    const result = await adapter.polish(request);

    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('unsafe-output');
    expect(result.draft.response).toBe(draft.response);
  });

  it('falls back when the provider rejects', async () => {
    const adapter = createSafeNarrativeAdapter({
      generate: async () => {
        throw new Error('local model unavailable');
      },
    });

    const result = await adapter.polish(request);

    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('provider-error');
  });

  it('falls back after a provider timeout', async () => {
    const adapter = createSafeNarrativeAdapter(
      { generate: () => new Promise(() => undefined) },
      { timeoutMs: 5 },
    );

    const result = await adapter.polish(request);

    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('timeout');
    expect(result.draft.followUp).toBe(draft.followUp);
  });

  it('falls back when a provider returns an unknown field or mismatched participant', async () => {
    const adapter = createSafeNarrativeAdapter({
      generate: async () => ({
        response: '周教练的语气缓和了一些。',
        participantResponses: [{ personId: 'stranger', text: '我看见了。' }],
        followUp: draft.followUp,
        phaseTransition: 'professional-contract',
      }),
    });

    const result = await adapter.polish(request);

    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('invalid-output');
  });
});
