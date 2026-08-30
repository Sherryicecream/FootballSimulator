import { describe, expect, it } from 'vitest';
import { CareerSaveV4Schema, migrateCareerSaveV4 } from '../src/index';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

describe('CareerSaveV4 边界', () => {
  it('v3 结构存档解析为 v4 并填充默认字段', () => {
    const v3 = {
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 4,
      careerPhase: 'youth-season',
    };
    const v4 = CareerSaveV4Schema.parse(v3);
    expect(v4.schemaVersion).toBe(4);
    expect(v4.proSeason).toBeNull();
    expect(v4.proPhase).toBe('preseason');
    expect(v4.promiseReviews).toEqual([]);
    expect(v4.proSeasonStats.leagueAppearances).toBe(0);
  });

  it('v3 存档经 migrateCareerSaveV4 保留关键数据并补默认', () => {
    const v3 = {
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 3,
      careerPhase: 'professional-contract',
      contract: {
        id: 'offer-1',
        clubId: 'river-club',
        clubName: '闽江渔火',
        clubTier: 5,
        salaryPerYear: 9000,
        contractYears: 3,
        squadRole: 'rotation',
        promise: { kind: 'playing-time', minimumShare: 0.3 },
        releaseClauseNote: '',
        signedOn: '2027-07-01',
        seasonsCompleted: 0,
        promiseStatus: 'pending',
      },
    };
    const v4 = migrateCareerSaveV4(v3);
    expect(v4.careerPhase).toBe('professional-contract');
    expect(v4.contract?.clubName).toBe('闽江渔火');
    expect(v4.proSeason).toBeNull();
    expect(v4.schemaVersion).toBe(4);
  });

  it('v4 存档原样通过迁移', () => {
    const v4 = CareerSaveV4Schema.parse({
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 4,
      careerPhase: 'pro-season',
      proPhase: 'league',
    });
    expect(migrateCareerSaveV4(v4)).toEqual(v4);
  });

  it('拒绝非法 proPhase 与超范围阵容', () => {
    const base = { ...buildYouthSaveV2Fixture(), schemaVersion: 4, careerPhase: 'pro-season' };
    expect(CareerSaveV4Schema.safeParse({ ...base, proPhase: 'offseason' }).success).toBe(false);
    expect(
      CareerSaveV4Schema.safeParse({
        ...base,
        proSeason: {
          id: 'pro-1',
          startDate: '2027-08-01',
          endDate: '2028-05-31',
          currentDate: '2027-08-01',
          currentWeek: 1,
          currentMonth: '2027-08',
          clubId: 'river-club',
          competitionId: 'tier5',
          fixtures: [],
          standings: [],
          squad: [],
          depthChart: {},
          completed: false,
        },
      }).success,
    ).toBe(false);
  });
});
