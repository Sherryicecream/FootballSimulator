import { describe, expect, it } from 'vitest';
import { buildMilestonePrompt } from '../../src/ai/milestone-prompt';
import { MilestoneInputSchema } from '@football/contracts';

const sharedFacts = {
  honours: [{ kind: 'cup-champion', label: '足协杯冠军', seasonId: 'pro-2029' }],
  keyStats: [{ label: '职业生涯出场', value: 168, unit: '次' }],
  signatureMatches: [
    {
      matchId: 'match-1',
      competition: '足协杯',
      opponent: '海港队',
      result: '2-1获胜',
      playerGoals: 1,
      playerAssists: 1,
      rating: 8.7,
      highlight: '决赛制胜球',
    },
  ],
};

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
    recoveryChoices: ['降低训练负荷'],
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
    adaptationStatusChange: '之后进入首发',
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
    regret: '未能走得更远',
    biggestAchievement: '决赛制胜球',
    ...sharedFacts,
  },
] as const;

describe('milestone prompt builder', () => {
  it('uses a dedicated prompt section for every milestone kind', () => {
    const headings = [
      '首份职业合同',
      '重大伤病与复出',
      '关键转会与留洋',
      '国家队重大节点',
      '退役总结',
    ];
    inputs.forEach((raw, index) => {
      const input = MilestoneInputSchema.parse(raw);
      const prompt = buildMilestonePrompt(input);
      expect(prompt).toContain('milestone-narration-v1');
      expect(prompt).toContain(headings[index]);
      expect(prompt).toContain('只能使用事实包');
      expect(prompt).toContain('数字、俱乐部、年龄、赛季、伤病');
      expect(prompt).toContain('事实检查');
      expect(prompt).toContain('足协杯冠军');
      expect(prompt).toContain('168');
      expect(prompt).toContain('决赛制胜球');
    });
  });

  it('explains the requested story connection without changing the facts', () => {
    const prompt = buildMilestonePrompt(MilestoneInputSchema.parse(inputs[4]!));
    expect(prompt).toContain('为什么这是你的故事');
    expect(prompt).toContain('早期选择');
    expect(prompt).toContain('后来结果');
    expect(prompt).toContain('150-250 字');
  });
});
