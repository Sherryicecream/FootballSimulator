import { describe, expect, it } from 'vitest';
import {
  CareerMomentSchema,
  CareerSaveV7Schema,
  migrateCareerSaveV6,
  migrateCareerSaveV7,
} from '../src/index';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

describe('CareerMoment schema', () => {
  it('accepts a valid career moment', () => {
    const moment = CareerMomentSchema.parse({
      seasonId: 'pro-2030',
      date: '2030-08-15',
      weekIndex: 3,
    });
    expect(moment.seasonId).toBe('pro-2030');
    expect(moment.date).toBe('2030-08-15');
    expect(moment.weekIndex).toBe(3);
  });

  it('rejects missing fields', () => {
    expect(() => CareerMomentSchema.parse({ seasonId: 'pro-2030' })).toThrow();
  });
});

describe('CareerSaveV7 schema', () => {
  it('accepts v7 with mechanics version and moments', () => {
    const v6 = migrateCareerSaveV6(buildYouthSaveV2Fixture());
    const v7 = CareerSaveV7Schema.parse({
      ...v6,
      schemaVersion: 7,
      mechanicsVersion: 'experience-v1',
      moments: [],
    });
    expect(v7.schemaVersion).toBe(7);
    expect(v7.mechanicsVersion).toBe('experience-v1');
    expect(v7.moments).toEqual([]);
  });

  it('v7 preserves all v6 fields', () => {
    const v6 = migrateCareerSaveV6(buildYouthSaveV2Fixture());
    const v7 = CareerSaveV7Schema.parse({
      ...v6,
      schemaVersion: 7,
      mechanicsVersion: 'experience-v1',
      moments: [],
    });
    expect(v7.careerId).toBe(v6.careerId);
    expect(v7.player.identity.name).toBe(v6.player.identity.name);
    expect(v7.randomState).toEqual(v6.randomState);
    expect(v7.ledger).toEqual(v6.ledger);
  });

  it('defaults mechanicsVersion when missing', () => {
    const v6 = migrateCareerSaveV6(buildYouthSaveV2Fixture());
    const v7 = CareerSaveV7Schema.parse({
      ...v6,
      schemaVersion: 7,
      moments: [],
    });
    expect(v7.mechanicsVersion).toBe('experience-v1');
    expect(v7.moments).toEqual([]);
  });

  it('accepts structured timing metadata on new ledger facts', () => {
    const v6 = migrateCareerSaveV6(buildYouthSaveV2Fixture());
    const v7 = CareerSaveV7Schema.parse({
      ...v6,
      schemaVersion: 7,
      mechanicsVersion: 'experience-v1',
      moments: [],
      ledger: [
        {
          id: 'legacy-fact',
          weekKey: '2025-W01',
          type: 'event',
          summary: '历史事实',
          participantIds: [],
          eventId: 'academy-trial',
          eventId: 'academy-trial',
          occurredOn: '2025-09-01',
          seasonId: 'youth-2025',
          ordinal: 1,
        },
      ],
    });

    expect(v7.ledger[0]).toMatchObject({
      occurredOn: '2025-09-01',
      seasonId: 'youth-2025',
      ordinal: 1,
    });
  });
});

describe('migrateCareerSaveV7', () => {
  it('passes through valid v7 unchanged', () => {
    const v6 = migrateCareerSaveV6(buildYouthSaveV2Fixture());
    const v7 = migrateCareerSaveV7(v6);
    const second = migrateCareerSaveV7(v7);
    expect(second).toEqual(v7);
  });

  it('deterministically migrates v6 to v7', () => {
    const v6 = migrateCareerSaveV6(buildYouthSaveV2Fixture());
    const first = migrateCareerSaveV7(v6);
    const second = migrateCareerSaveV7(v6);
    expect(first).toEqual(second);
    expect(first.schemaVersion).toBe(7);
    expect(first.mechanicsVersion).toBe('experience-v1');
    expect(first.moments).toEqual([]);
  });

  it('migrates a v2-based v6 save to v7 preserving all core fields', () => {
    const v2 = buildYouthSaveV2Fixture();
    const v6 = migrateCareerSaveV6(v2);
    const v7 = migrateCareerSaveV7(v6);
    expect(v7.schemaVersion).toBe(7);
    expect(v7.careerId).toBe(v6.careerId);
    expect(v7.player.identity.name).toBe(v6.player.identity.name);
    expect(v7.randomState).toEqual(v6.randomState);
    expect(v7.ledger).toEqual(v6.ledger);
    expect(v7.moments).toEqual([]);
  });

  it('preserves v6 terminal state through v7 migration', () => {
    // Build a v6 save with retired phase (mimicking a retired v6)
    const v2 = buildYouthSaveV2Fixture();
    const retiredV6 = {
      ...migrateCareerSaveV6(v2),
      careerPhase: 'retired' as const,
      retiredOn: '2040-06-30',
      careerEnd: {
        kind: 'voluntary-retirement' as const,
        endedOn: '2040-06-30',
        summary: '正式宣布退役，结束球员生涯。',
        evidenceIds: [],
      },
    };
    const v7 = migrateCareerSaveV7(retiredV6);
    expect(v7.schemaVersion).toBe(7);
    expect(v7.careerPhase).toBe('retired');
    expect(v7.careerEnd?.kind).toBe('voluntary-retirement');
    expect(v7.careerEnd?.endedOn).toBe('2040-06-30');
  });
});
