import { describe, expect, it } from 'vitest';
import {
  buildMilestoneNarrationRequest,
  createDeterministicMockProvider,
  createSafeNarrativeAdapter,
} from '../src';
import { MilestoneInputSchema } from '@football/contracts';

const input = MilestoneInputSchema.parse({
  kind: 'injury-return',
  playerName: '林河',
  seasonId: 'pro-2027',
  injuryType: '踝关节扭伤',
  durationWeeks: 6,
  recoveryChoices: ['降低训练负荷'],
  returnOutcome: 'fully-recovered',
  honours: [{ kind: 'cup-champion', label: '足协杯冠军', seasonId: 'pro-2029' }],
  keyStats: [{ label: '职业生涯出场', value: 168, unit: '次' }],
  signatureMatches: [],
});

const request = buildMilestoneNarrationRequest({
  input,
  canonicalFactsHash: 'b'.repeat(64),
});

describe('safe milestone narration adapter', () => {
  it('keeps a deterministic authored fallback within 150-250 Chinese characters', async () => {
    const result = await createSafeNarrativeAdapter().narrateMilestone(request);

    expect(result.source).toBe('fallback');
    expect(result.draft.narrative.length).toBeGreaterThanOrEqual(150);
    expect(result.draft.narrative.length).toBeLessThanOrEqual(250);
    expect(result.draft.narrative).toContain('踝关节扭伤');
  });

  it('supports the mock provider without introducing unsupported numbers', async () => {
    const result = await createSafeNarrativeAdapter(
      createDeterministicMockProvider(),
    ).narrateMilestone(request);

    expect(result.source).toBe('provider');
    expect(result.draft.narrative.length).toBeGreaterThanOrEqual(150);
    expect(result.draft.narrative.length).toBeLessThanOrEqual(250);
    expect(result.draft.narrative).toContain('6');
  });

  it('covers all five milestone kinds in mock mode', async () => {
    const inputs = [
      input,
      {
        kind: 'first-contract',
        playerName: '林河',
        seasonId: 'pro-2026',
        club: '杭州城',
        contractYears: 3,
        annualSalary: 120,
        transferFee: null,
        clubPromise: null,
        honours: [],
        keyStats: [],
        signatureMatches: [],
      },
      {
        kind: 'key-transfer',
        playerName: '林河',
        seasonId: 'pro-2028',
        fromClub: '杭州城',
        toClub: '大阪海湾',
        transferFeeRange: null,
        adaptationStatusChange: '之后进入首发',
        honours: [],
        keyStats: [],
        signatureMatches: [],
      },
      {
        kind: 'national-team',
        playerName: '林河',
        seasonId: 'national-2030',
        competitionType: '亚洲杯',
        competitionName: null,
        appearances: 4,
        goals: 2,
        knockoutRound: null,
        honours: [],
        keyStats: [],
        signatureMatches: [],
      },
      {
        kind: 'retirement',
        playerName: '林河',
        seasonId: 'pro-2034',
        careerOverview: {
          seasons: 12,
          clubs: 3,
          appearances: 168,
          minutes: 12400,
          goals: 48,
          assists: 27,
        },
        regret: null,
        biggestAchievement: null,
        honours: [],
        keyStats: [],
        signatureMatches: [],
      },
    ] as const;
    const adapter = createSafeNarrativeAdapter(createDeterministicMockProvider());

    for (const [index, rawInput] of inputs.entries()) {
      const parsedInput = MilestoneInputSchema.parse(rawInput);
      const result = await adapter.narrateMilestone(
        buildMilestoneNarrationRequest({
          input: parsedInput,
          canonicalFactsHash: String(index + 10).padStart(64, '0'),
        }),
      );
      expect(result.source).toBe('provider');
      expect(result.draft.narrative.length).toBeGreaterThanOrEqual(150);
      expect(result.draft.narrative.length).toBeLessThanOrEqual(250);
    }
  });

  it('falls back when the provider introduces a number absent from the fact package', async () => {
    const adapter = createSafeNarrativeAdapter({
      generate: async () => ({ narrative: '复出后出场 999 次，改变了整个职业生涯。'.repeat(8) }),
    });

    const result = await adapter.narrateMilestone(request);

    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('unsafe-output');
    expect(result.draft.narrative).not.toContain('999');
  });

  it('falls back when the provider introduces an unsupported honour without a new number', async () => {
    const adapter = createSafeNarrativeAdapter({
      generate: async () => ({
        narrative:
          '林河在这段经历中赢得世界杯冠军，并因此成为国家队历史上的重要人物。这个判断没有对应的事实记录，评价应当只保留已提供的伤病、恢复选择和复出结果。'
            .repeat(4)
            .slice(0, 200),
      }),
    });

    const result = await adapter.narrateMilestone(request);

    expect(result.source).toBe('fallback');
    expect(result.reason).toBe('unsafe-output');
    expect(result.draft.narrative).not.toContain('世界杯冠军');
  });
});
