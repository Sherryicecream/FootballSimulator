import { describe, expect, it } from 'vitest';
import { CareerSaveV8Schema, migrateCareerSaveV7, migrateCareerSaveV8 } from '../src';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

describe('CareerSaveV8', () => {
  it('adds an empty world registry when migrating an older save', () => {
    const migrated = migrateCareerSaveV8(buildYouthSaveV2Fixture());

    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.worldRegistry).toEqual({ entries: [], clubPulses: [] });
    expect(CareerSaveV8Schema.parse(migrated)).toEqual(migrated);
  });

  it('preserves a v7 save and its world registry when upgrading', () => {
    const v7 = migrateCareerSaveV7(buildYouthSaveV2Fixture());
    const withRegistry = {
      ...v7,
      worldRegistry: {
        entries: [
          {
            country: 'england' as const,
            source: 'world' as const,
            seasonId: 'world-england-2030-tier-1',
            completed: true,
            promoted: [],
            relegated: [],
          },
        ],
      },
    };
    const migrated = migrateCareerSaveV8(withRegistry);

    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.worldRegistry.entries[0]?.country).toBe('england');
    expect(migrated.ledger).toEqual(v7.ledger);
  });
});
