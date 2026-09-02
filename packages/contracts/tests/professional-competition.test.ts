import { describe, expect, it } from 'vitest';
import {
  CareerSaveV4Schema,
  ProCupStateSchema,
  ProSeasonStateSchema,
  SeasonHistorySummarySchema,
} from '../src/index';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

const validCup = {
  id: 'cup-pro-2030',
  name: '国内杯',
  competitionId: 'domestic-cup',
  entrants: ['club-a', 'club-b', 'club-c', 'club-d', 'club-e', 'club-f', 'club-g', 'club-h'],
  fixtures: [],
  currentRound: 'quarterfinal' as const,
  winnerClubId: null,
  completed: false,
};

const validProSeason = {
  id: 'pro-2030',
  startDate: '2030-08-01',
  endDate: '2031-05-31',
  currentDate: '2030-08-01',
  currentWeek: 1,
  currentMonth: '2030-08',
  clubId: 'club-a',
  competitionId: 'pro-tier-5',
  fixtures: [],
  standings: [],
  squad: Array.from({ length: 10 }, (_, index) => ({
    personId: `person-${index}`,
    name: `球员${index}`,
    primaryPosition: 'FORWARD' as const,
    currentAbility: 50,
    age: 20,
    form: 50,
    fitness: 80,
    minutesPlayed: 0,
  })),
  depthChart: {
    CENTER_BACK: [],
    FULL_BACK: [],
    DEFENSIVE_MIDFIELDER: [],
    MIDFIELDER: [],
    WINGER: [],
    FORWARD: ['player'],
  },
  completed: false,
};

const legacyV4Save = () => ({
  ...buildYouthSaveV2Fixture(),
  schemaVersion: 4 as const,
  careerPhase: 'pro-season' as const,
  proPhase: 'league' as const,
  proSeason: validProSeason,
  proSeasonStats: {
    leagueAppearances: 0,
    reserveAppearances: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    ratingSum: 0,
    ratingCount: 0,
  },
});

describe('职业赛事契约', () => {
  it('接受完整的八队国内杯状态并保留当前轮次', () => {
    const parsed = ProCupStateSchema.parse(validCup);

    expect(parsed.entrants).toHaveLength(8);
    expect(parsed.currentRound).toBe('quarterfinal');
    expect(parsed.completed).toBe(false);
  });

  it('加载缺少赛事深度字段的旧 v4 存档时填充默认值', () => {
    const parsed = CareerSaveV4Schema.parse(legacyV4Save());

    expect(parsed.proSeason?.domesticCup).toBeNull();
    expect(parsed.proSeason?.nextClubTier).toBeNull();
    expect(parsed.proSeasonStats.cupAppearances).toBe(0);
    expect(parsed.proSeasonStats.cupMinutes).toBe(0);
  });

  it('为旧赛季历史填充空荣誉，并拒绝重复签位和越界层级', () => {
    const history = SeasonHistorySummarySchema.parse({
      seasonId: 'season-1',
      age: 19,
      status: 'retained',
      appearances: 10,
      goals: 2,
      assists: 1,
      avgRating: 6.8,
      signals: ['professional-season'],
      endedOn: '2031-05-31',
    });
    const duplicateEntrants = {
      ...validCup,
      entrants: ['club-a', 'club-a', ...validCup.entrants.slice(2)],
    };

    expect(history.honours).toEqual([]);
    expect(() => ProCupStateSchema.parse(duplicateEntrants)).toThrow();
    expect(() => ProSeasonStateSchema.parse({ ...validProSeason, nextClubTier: 9 })).toThrow();
  });
});
