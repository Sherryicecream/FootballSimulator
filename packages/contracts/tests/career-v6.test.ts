import { describe, expect, it } from 'vitest';
import { CareerSaveV5Schema, CareerSaveV6Schema, migrateCareerSaveV6 } from '../src/index';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

describe('CareerSaveV6 terminal boundary', () => {
  it('migrates an active v5 save with no career ending', () => {
    const v5 = CareerSaveV5Schema.parse({
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5,
      careerPhase: 'offseason',
    });
    const v6 = migrateCareerSaveV6(v5);
    expect(v6).toMatchObject({ schemaVersion: 6, careerPhase: 'offseason', careerEnd: null });
    expect(v6.randomState).toEqual(v5.randomState);
    expect(v6.ledger).toEqual(v5.ledger);
  });

  it('migrates a retired v5 save into a voluntary retirement ending', () => {
    const v5 = CareerSaveV5Schema.parse({
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5,
      careerPhase: 'retired',
      retiredOn: '2040-06-30',
    });
    expect(migrateCareerSaveV6(v5).careerEnd).toMatchObject({
      kind: 'voluntary-retirement',
      endedOn: '2040-06-30',
    });
  });

  it('accepts each terminal ending kind with matching retired fields', () => {
    const base = migrateCareerSaveV6({
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5,
      careerPhase: 'retired',
      retiredOn: '2040-06-30',
    });
    for (const kind of ['youth-no-contract', 'voluntary-retirement', 'market-exit'] as const) {
      expect(
        CareerSaveV6Schema.safeParse({
          ...base,
          careerEnd: {
            kind,
            endedOn: '2040-06-30',
            summary: '职业生涯已结束。',
            evidenceIds: [],
          },
        }).success,
      ).toBe(true);
    }
  });
  it('rejects terminal fields that disagree', () => {
    const parsed = CareerSaveV6Schema.safeParse({
      ...migrateCareerSaveV6(buildYouthSaveV2Fixture()),
      careerPhase: 'retired',
      retiredOn: '2027-06-30',
      careerEnd: {
        kind: 'youth-no-contract',
        endedOn: '2027-06-29',
        summary: '青训年龄窗口结束，未获得职业合同。',
        evidenceIds: ['season-outcome-youth-2026'],
      },
    });
    expect(parsed.success).toBe(false);
  });
});
