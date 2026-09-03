import { describe, expect, it } from 'vitest';
import { ContractOfferV3Schema, migrateCareerSaveV5 } from '../src/index';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

const legacyOffer = {
  id: 'offer-1',
  clubId: 'club-a',
  clubName: '东岸竞技',
  clubTier: 5,
  salaryPerYear: 12000,
  contractYears: 2,
  squadRole: 'rotation' as const,
  promise: { kind: 'none' as const },
  releaseClauseNote: '',
};

describe('转会与租借存档契约', () => {
  it('旧版要约没有 offerKind 时默认视为永久签约', () => {
    expect(ContractOfferV3Schema.parse(legacyOffer).offerKind).toBe('permanent');
  });

  it('旧版 v5 存档迁移时补齐租借默认字段', () => {
    const legacyV5 = {
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5 as const,
      careerPhase: 'free-agent' as const,
      pendingOffers: [legacyOffer],
    };

    const migrated = migrateCareerSaveV5(legacyV5);

    expect(migrated.activeLoan).toBeNull();
    expect(migrated.loanHistory).toEqual([]);
    expect(migrated.pendingOffers[0]?.offerKind).toBe('permanent');
  });

  it('职业赛季与当前租借状态的赛季不一致时拒绝迁移', () => {
    const raw = {
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5 as const,
      careerPhase: 'pro-season' as const,
      proSeason: {
        id: 'pro-season-2031',
        startDate: '2031-08-01',
        endDate: '2032-05-31',
        currentDate: '2031-08-01',
        currentWeek: 1,
        currentMonth: '2031-08',
        clubId: 'loan-club',
        competitionId: 'tier-5',
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
      },
      activeLoan: {
        parentClubId: 'parent-club',
        parentClubName: '母队',
        parentClubTier: 5,
        loanClubId: 'loan-club',
        loanClubName: '租借队',
        loanClubTier: 5,
        startedOn: '2030-08-01',
        returnsOn: '2031-06-30',
        seasonId: 'pro-season-2030',
      },
    };

    expect(() => migrateCareerSaveV5(raw)).toThrow(/租借.*赛季/);
  });
});
