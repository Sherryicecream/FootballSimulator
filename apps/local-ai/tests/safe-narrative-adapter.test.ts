import { describe, expect, it } from 'vitest';
import {
  buildCareerSummaryRequest,
  buildNarrativePolishRequest,
  createDeterministicMockProvider,
  createSafeNarrativeAdapter,
} from '../src';

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
  canonicalFactsHash: 'b'.repeat(64),
});

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

  it('supports factual career summaries while keeping the authored fallback available', async () => {
    const fallback = await createSafeNarrativeAdapter().summarize(summaryRequest);
    expect(fallback.source).toBe('fallback');
    expect(fallback.draft.summary).toContain('未入选国家队');

    const adapter = createSafeNarrativeAdapter({
      generate: async () => ({
        summary: 'AI 只负责组织已经存在的事实，不会添加新的荣誉或国家队经历。'.repeat(5),
      }),
    });
    const result = await adapter.summarize(summaryRequest);
    expect(result.source).toBe('provider');
    expect(result.draft.summary).toContain('不会添加');
  });

  it('rejects a career summary that introduces an unsupported number', async () => {
    const adapter = createSafeNarrativeAdapter({
      generate: async () => ({
        summary: '这段总结声称球员获得了 99 座奖杯，但事实包没有这项记录。'.repeat(5),
      }),
    });
    const result = await adapter.summarize(summaryRequest);
    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('unsafe-output');
  });

  it('rejects unsupported honour and national-team claims even without numbers', async () => {
    const adapter = createSafeNarrativeAdapter({
      generate: async () => ({
        summary: '球员赢得了世界杯冠军，并代表国家队出场，成为国脚。'.repeat(6),
      }),
    });
    const result = await adapter.summarize(summaryRequest);
    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('unsafe-output');
  });

  it('rejects a world cup title when the facts only record a runner-up finish', async () => {
    const requestWithRunnerUp = buildCareerSummaryRequest({
      facts: {
        ...summaryRequest.facts,
        honours: [
          {
            evidenceId: 'honour-1',
            kind: 'world-cup-runner-up',
            label: '世界杯亚军',
            seasonId: 'season-1',
          },
        ],
        evidenceIds: ['honour-1'],
      },
      mode: 'short',
      canonicalFactsHash: 'd'.repeat(64),
    });
    const adapter = createSafeNarrativeAdapter({
      generate: async () => ({
        summary: '他赢得了世界杯冠军，这段经历成为生涯的重要荣誉。'.repeat(7),
      }),
    });

    const result = await adapter.summarize(requestWithRunnerUp);

    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('unsafe-output');
  });
});
