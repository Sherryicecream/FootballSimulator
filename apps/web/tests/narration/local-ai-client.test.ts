import { describe, expect, it, vi } from 'vitest';
import {
  buildCareerSummaryRequest,
  buildMilestoneNarrationRequest,
  buildNarrativePolishRequest,
  type CareerSummaryFacts,
  type CareerSummaryOutput,
  type NarrativePolishOutput,
} from '@football/contracts';
import { MilestoneInputSchema } from '@football/contracts';
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

const summaryFacts: CareerSummaryFacts = {
  player: { name: '林河', hometown: '杭州', position: 'ST', country: '中国' },
  tierLabel: '稳健生涯',
  ending: { label: '主动退役', summary: '在合同结束后退役。', endedOn: '2030-06-30' },
  seasons: 8,
  clubs: 2,
  totals: { appearances: 168, minutes: 12_400, goals: 48, assists: 27 },
  nationalTeam: { capped: false, caps: 0, goals: 0 },
  overseasSpells: false,
  honours: [],
  seasonsTimeline: [],
  keyMoments: [
    { evidenceId: 'contract-1', kind: 'contract', title: '第一份合同', summary: '签下职业合同。' },
  ],
  dimensions: [],
  behindTheScenes: { potentials: [], traits: [], missedOpportunities: [] },
  evidenceIds: ['contract-1'],
};

const summaryOutput: CareerSummaryOutput = {
  summary: 'AI 只负责改善表达，不会改变本地事实结算。'.repeat(8),
};

const milestoneRequest = buildMilestoneNarrationRequest({
  input: MilestoneInputSchema.parse({
    kind: 'first-contract',
    playerName: '林河',
    seasonId: 'pro-2026',
    club: '杭州城',
    contractYears: 3,
    annualSalary: 120,
    transferFee: null,
    clubPromise: '提供一线队训练机会',
    honours: [],
    keyStats: [{ label: '职业生涯出场', value: 168, unit: '次' }],
    signatureMatches: [],
  }),
  canonicalFactsHash: 'c'.repeat(64),
});

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

  it('summarizes career facts through the same endpoint and returns provider text', async () => {
    const request = buildCareerSummaryRequest({
      facts: summaryFacts,
      mode: 'short',
      canonicalFactsHash: 'a'.repeat(64),
    });
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ source: 'provider', reason: 'provider', draft: summaryOutput }),
          {
            status: 200,
          },
        ),
    );
    const client = createLocalNarrativeClient({ endpoint: 'http://127.0.0.1:8787', fetchImpl });

    await expect(
      Promise.all([client.summarize(request), client.summarize(request)]),
    ).resolves.toEqual([summaryOutput, summaryOutput]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/v1/narrative-polish',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('narrates a milestone through the same endpoint and deduplicates its fact hash', async () => {
    const narrative = '这段评价只组织已记录事实，早期选择与后来结果在此相连。'.repeat(6);
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ source: 'provider', reason: 'provider', draft: { narrative } }),
          { status: 200 },
        ),
    );
    const client = createLocalNarrativeClient({ endpoint: 'http://127.0.0.1:8787', fetchImpl });

    await expect(
      Promise.all([
        client.narrateMilestone(milestoneRequest),
        client.narrateMilestone(milestoneRequest),
      ]),
    ).resolves.toEqual([{ narrative }, { narrative }]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string)).toMatchObject({
      kind: 'milestone',
      canonicalFactsHash: 'c'.repeat(64),
    });
  });

  it('does not permanently cache a failed milestone request', async () => {
    let attempts = 0;
    const narrative = '这段评价只组织已记录事实，早期选择与后来结果在此相连。'.repeat(6);
    const fetchImpl = vi.fn(async () => {
      attempts += 1;
      return attempts === 1
        ? new Response('unavailable', { status: 503 })
        : new Response(
            JSON.stringify({ source: 'provider', reason: 'provider', draft: { narrative } }),
            { status: 200 },
          );
    });
    const client = createLocalNarrativeClient({ endpoint: 'http://127.0.0.1:8787', fetchImpl });

    await expect(client.narrateMilestone(milestoneRequest)).resolves.toBeNull();
    await expect(client.narrateMilestone(milestoneRequest)).resolves.toEqual({ narrative });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('returns null when a career summary contradicts the facts', async () => {
    const summary = '球员赢得了世界杯冠军。'.repeat(16);
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            source: 'provider',
            reason: 'provider',
            draft: { summary },
          }),
          { status: 200 },
        ),
    );
    const client = createLocalNarrativeClient({ endpoint: 'http://127.0.0.1:8787', fetchImpl });
    const summaryRequest = buildCareerSummaryRequest({
      facts: summaryFacts,
      mode: 'short',
      canonicalFactsHash: 'd'.repeat(64),
    });

    await expect(client.summarize(summaryRequest)).resolves.toBeNull();
  });

  it('returns null when a milestone narration contradicts its facts', async () => {
    const narrative = '林河赢得了世界杯冠军，这项荣誉改变了他的职业道路。'.repeat(5);
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            source: 'provider',
            reason: 'provider',
            draft: { narrative },
          }),
          { status: 200 },
        ),
    );
    const client = createLocalNarrativeClient({ endpoint: 'http://127.0.0.1:8787', fetchImpl });

    await expect(client.narrateMilestone(milestoneRequest)).resolves.toBeNull();
  });

  it('does not cache a contradicted career summary', async () => {
    let attempts = 0;
    const unsafeSummary = '球员赢得了世界杯冠军。'.repeat(16);
    const fetchImpl = vi.fn(async () => {
      attempts += 1;
      return new Response(
        JSON.stringify({
          source: 'provider',
          reason: 'provider',
          draft: { summary: attempts === 1 ? unsafeSummary : summaryOutput.summary },
        }),
        { status: 200 },
      );
    });
    const client = createLocalNarrativeClient({ endpoint: 'http://127.0.0.1:8787', fetchImpl });
    const summaryRequest = buildCareerSummaryRequest({
      facts: summaryFacts,
      mode: 'short',
      canonicalFactsHash: 'e'.repeat(64),
    });

    await expect(client.summarize(summaryRequest)).resolves.toBeNull();
    await expect(client.summarize(summaryRequest)).resolves.toEqual(summaryOutput);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('returns null instead of hanging when the provider exceeds the timeout', async () => {
    const fetchImpl = vi.fn(() => new Promise<Response>(() => undefined));
    const client = createLocalNarrativeClient({
      endpoint: 'http://127.0.0.1:8787',
      timeoutMs: 20,
      fetchImpl,
    });

    await expect(client.polish(request)).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
