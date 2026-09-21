import { describe, expect, it } from 'vitest';
import {
  MilestoneInputSchema,
  MilestoneNarrationOutputSchema,
  buildMilestoneNarrationRequest,
} from '../../src/narration/milestone-narration';

const sharedFacts = {
  honours: [{ kind: 'cup-champion', label: '足协杯冠军', seasonId: 'pro-2029' }],
  keyStats: [
    { label: '职业生涯出场', value: 168, unit: '次' },
    { label: '职业生涯进球', value: 48, unit: '球' },
  ],
  signatureMatches: [
    {
      matchId: 'match-2029-final',
      competition: '足协杯',
      opponent: '海港队',
      result: '2-1获胜',
      playerGoals: 1,
      playerAssists: 1,
      rating: 8.7,
      highlight: '决赛中打入制胜球并送出助攻',
    },
  ],
};

describe('milestone narration contract', () => {
  it('accepts all five milestone kinds with their required facts', () => {
    const inputs = [
      {
        kind: 'first-contract',
        playerName: '林河',
        seasonId: 'pro-2026',
        club: '杭州城',
        contractYears: 3,
        annualSalary: 120,
        transferFee: null,
        clubPromise: '提供一线队训练机会',
        ...sharedFacts,
      },
      {
        kind: 'injury-return',
        playerName: '林河',
        seasonId: 'pro-2027',
        injuryType: '踝关节扭伤',
        durationWeeks: 6,
        recoveryChoices: ['降低训练负荷', '按计划复健'],
        returnOutcome: 'fully-recovered',
        ...sharedFacts,
      },
      {
        kind: 'key-transfer',
        playerName: '林河',
        seasonId: 'pro-2028',
        fromClub: '杭州城',
        toClub: '大阪海湾',
        transferFeeRange: { minimum: 400, maximum: 600, currency: '万元' },
        adaptationStatusChange: '前两个月出场减少，之后进入首发',
        ...sharedFacts,
      },
      {
        kind: 'national-team',
        playerName: '林河',
        seasonId: 'national-2030',
        competitionType: '亚洲杯',
        competitionName: '2030 亚洲杯',
        appearances: 4,
        goals: 2,
        knockoutRound: '四强',
        ...sharedFacts,
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
        regret: '未能在欧洲赛事走得更远',
        biggestAchievement: '足协杯决赛的制胜球',
        ...sharedFacts,
      },
    ] as const;

    for (const input of inputs) {
      expect(MilestoneInputSchema.parse(input).kind).toBe(input.kind);
    }
  });

  it('requires injury type and return outcome for an injury milestone', () => {
    expect(() =>
      MilestoneInputSchema.parse({
        kind: 'injury-return',
        playerName: '测试球员',
        seasonId: 'pro-2026',
        durationWeeks: 4,
        ...sharedFacts,
      }),
    ).toThrow();
  });

  it('requires contract years and does not invent a transfer fee', () => {
    expect(() =>
      MilestoneInputSchema.parse({
        kind: 'first-contract',
        playerName: '测试球员',
        seasonId: 'pro-2026',
        club: '测试队',
        annualSalary: 120,
        transferFee: null,
        ...sharedFacts,
      }),
    ).toThrow();

    const input = MilestoneInputSchema.parse({
      kind: 'first-contract',
      playerName: '测试球员',
      seasonId: 'pro-2026',
      club: '测试队',
      contractYears: 3,
      annualSalary: 120,
      transferFee: null,
      ...sharedFacts,
    });
    expect(input.kind).toBe('first-contract');
    if (input.kind === 'first-contract') expect(input.transferFee).toBeNull();
  });

  it('limits provider narration to the promised display length', () => {
    expect(() => MilestoneNarrationOutputSchema.parse({ narrative: '太短' })).toThrow();
    expect(
      MilestoneNarrationOutputSchema.parse({ narrative: '节点事实。'.repeat(30) }).narrative.length,
    ).toBe(150);
    expect(() =>
      MilestoneNarrationOutputSchema.parse({ narrative: '节点事实。'.repeat(51) }),
    ).toThrow();
  });

  it('builds a versioned milestone request with a canonical hash', () => {
    const request = buildMilestoneNarrationRequest({
      input: MilestoneInputSchema.parse({
        kind: 'national-team',
        playerName: '林河',
        seasonId: 'national-2030',
        competitionType: '亚洲杯',
        competitionName: null,
        appearances: 2,
        goals: 1,
        knockoutRound: null,
        ...sharedFacts,
      }),
      canonicalFactsHash: 'a'.repeat(64),
    });
    expect(request).toMatchObject({
      kind: 'milestone',
      promptVersion: 'milestone-narration-v1',
      canonicalFactsHash: 'a'.repeat(64),
    });
  });
});
