import { describe, expect, it } from 'vitest';
import {
  CareerSaveSchema,
  CareerSaveV5Schema,
  CareerSaveV6Schema,
  migrateCareerSaveV6,
} from '../src/index';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

describe('CareerSaveV6 terminal boundary', () => {
  it('deterministically migrates a v1 save through v6', () => {
    const v2 = buildYouthSaveV2Fixture();
    const v1 = CareerSaveSchema.parse({
      schemaVersion: 1,
      contentVersion: 'bootstrap-1',
      careerId: 'career-v1',
      player: {
        identity: v2.player.identity,
        attributes: v2.player.attributes,
        hiddenTraits: {
          potential: 80,
          stability: 60,
          professionalism: 70,
          pressureResistance: 60,
          adaptability: 60,
          injuryProneness: 20,
        },
        age: 16,
        careerStage: 'YOUTH',
        reputation: 10,
      },
      world: { currentDate: '2025-06-30', season: 2024, weekNumber: 44 },
      context: {
        academyId: 'home',
        pendingOpportunity: null,
        playerState: {
          fitness: 80,
          morale: 55,
          coachTrust: 60,
          fatigue: 12,
          teamStatus: 'regular',
        },
        pendingEvent: null,
        trainingFocus: null,
        trainingIntensity: 'normal',
      },
      relationships: v2.relationships,
      story: {
        bootstrapOpportunityWeek: 2,
        resolvedOpportunityIds: [],
        completedStoryIds: [],
        activeStorylines: [],
        cooldowns: {},
      },
      ledger: [
        {
          type: 'career-started',
          date: '2024-09-01',
          playerName: '林河',
          age: 16,
          position: 'FORWARD',
        },
      ],
      randomState: { seed: 42, sequencePosition: 7 },
    });
    const first = migrateCareerSaveV6(v1);
    const second = migrateCareerSaveV6(v1);
    expect(first).toEqual(second);
    expect(first.ledger).toEqual(second.ledger);
    expect(first.ledger).toHaveLength(1);
    expect(first.ledger[0].summary).toBe(JSON.stringify(v1.ledger[0]));
    expect(first.randomState).toEqual(v1.randomState);
  });
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
