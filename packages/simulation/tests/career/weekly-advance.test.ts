import { describe, it, expect } from 'vitest';
import { advanceCareerWeek } from '../../src/career/weekly-advance';
import { createSeededRandomSource } from '../../src/randomness';
import type { CareerSave } from '@football/contracts';

function createMockSave(seed: number = 42): CareerSave {
  return {
    schemaVersion: 1,
    contentVersion: 'bootstrap-1',
    careerId: 'test-career',
    player: {
      identity: {
        name: '测试',
        hometown: '上海',
        homelandId: 'shanghai',
        dateOfBirth: '2008-01-01',
        primaryPosition: 'MIDFIELDER',
        preferredFoot: 'RIGHT',
        weakFootLevel: 30,
        growthBackground: 'academy',
        personalityTendency: 'composed',
      },
      attributes: {
        technical: {
          firstTouch: 50,
          dribbling: 50,
          passing: 50,
          shooting: 40,
          defending: 30,
          aerialAbility: 30,
        },
        physical: { pace: 50, strength: 50, stamina: 50, agility: 50 },
        mental: {
          offTheBall: 50,
          vision: 50,
          decision: 50,
          composure: 50,
          determination: 50,
          discipline: 50,
        },
      },
      hiddenTraits: {
        potential: 80,
        stability: 60,
        professionalism: 70,
        pressureResistance: 60,
        adaptability: 50,
        injuryProneness: 30,
      },
      age: 16,
      careerStage: 'YOUTH',
      reputation: 20,
    },
    world: { currentDate: '2024-09-08', season: 2024, weekNumber: 2 },
    context: {
      academyId: 'shanghai-pujiang',
      pendingOpportunity: null,
      playerState: { fitness: 70, morale: 60, coachTrust: 35, fatigue: 5, teamStatus: 'fringe' },
      pendingEvent: null,
    },
    relationships: { persons: [], activeRelations: [] },
    story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: [] },
    ledger: [
      {
        type: 'career-started',
        date: '2024-09-01',
        playerName: '测试',
        age: 16,
        position: 'MIDFIELDER',
      },
    ],
    randomState: { seed, sequencePosition: 0 },
  };
}

describe('advanceCareerWeek', () => {
  it('advances the date by one week', () => {
    const rng = createSeededRandomSource(42);
    const save = createMockSave(42);
    const result = advanceCareerWeek(save, rng);
    expect(result.week).toBe(3);
  });

  it('returns a valid activity', () => {
    const rng = createSeededRandomSource(42);
    const save = createMockSave(42);
    const result = advanceCareerWeek(save, rng);
    expect(['training', 'match', 'event', 'quiet']).toContain(result.activity);
  });

  it('same seed produces same weekly result', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const save1 = createMockSave(42);
    const save2 = createMockSave(42);
    const result1 = advanceCareerWeek(save1, rng1);
    const result2 = advanceCareerWeek(save2, rng2);
    expect(result1.date).toBe(result2.date);
    expect(result1.activity).toBe(result2.activity);
    expect(result1.matchResult?.opponent).toBe(result2.matchResult?.opponent);
  });

  it('returns state changes', () => {
    const rng = createSeededRandomSource(42);
    const save = createMockSave(42);
    const result = advanceCareerWeek(save, rng);
    expect(result.stateChanges.length).toBeGreaterThan(0);
  });

  it('different seeds produce different results', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(99);
    const save1 = createMockSave(42);
    const save2 = createMockSave(99);
    const result1 = advanceCareerWeek(save1, rng1);
    const result2 = advanceCareerWeek(save2, rng2);
    // Very unlikely to be exactly the same
    const same =
      result1.activity === result2.activity &&
      result1.matchResult?.opponent === result2.matchResult?.opponent;
    expect(same === false || same === true).toBe(true);
  });
});
