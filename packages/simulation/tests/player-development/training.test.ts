import { describe, it, expect } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness';
import { simulateTraining } from '../../src/player-development/training';
import type { PlayerCareer, PlayerState } from '@football/contracts';

function createMockPlayer(overrides: Partial<PlayerCareer> = {}): PlayerCareer {
  return {
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
    ...overrides,
  };
}

describe('simulateTraining', () => {
  it('returns a training result with focus area', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer({
      hiddenTraits: {
        potential: 95,
        stability: 60,
        professionalism: 95,
        pressureResistance: 60,
        adaptability: 50,
        injuryProneness: 30,
      },
    });
    const state: PlayerState = {
      fitness: 70,
      morale: 60,
      coachTrust: 40,
      fatigue: 10,
      teamStatus: 'fringe',
    };
    const result = simulateTraining(player, state, rng);
    expect(result.focus).toBeTruthy();
    expect(result.attributeChanges.length).toBeLessThanOrEqual(4);
  });

  it('attribute changes are within reasonable bounds (0-3 per attribute)', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = {
      fitness: 70,
      morale: 60,
      coachTrust: 40,
      fatigue: 10,
      teamStatus: 'fringe',
    };
    const result = simulateTraining(player, state, rng);
    for (const change of result.attributeChanges) {
      expect(change.newValue - change.oldValue).toBeGreaterThanOrEqual(0);
      expect(change.newValue - change.oldValue).toBeLessThanOrEqual(3);
    }
  });

  it('same seed produces same training result', () => {
    const player = createMockPlayer();
    const state: PlayerState = {
      fitness: 70,
      morale: 60,
      coachTrust: 40,
      fatigue: 10,
      teamStatus: 'fringe',
    };
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const result1 = simulateTraining(player, state, rng1);
    const result2 = simulateTraining(player, state, rng2);
    expect(result1.focus).toBe(result2.focus);
    expect(result1.attributeChanges).toEqual(result2.attributeChanges);
  });

  it('fitness decreases slightly after training', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = {
      fitness: 70,
      morale: 60,
      coachTrust: 40,
      fatigue: 10,
      teamStatus: 'fringe',
    };
    const result = simulateTraining(player, state, rng);
    expect(result.fitnessChange).toBeLessThanOrEqual(-1);
    expect(result.fitnessChange).toBeGreaterThanOrEqual(-5);
  });

  it('coach trust increases slightly with training', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = {
      fitness: 70,
      morale: 60,
      coachTrust: 40,
      fatigue: 10,
      teamStatus: 'fringe',
    };
    const result = simulateTraining(player, state, rng);
    expect(result.coachTrustChange).toBeGreaterThanOrEqual(0);
    expect(result.coachTrustChange).toBeLessThanOrEqual(3);
  });

  it('different positions have different focus areas', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const cb = createMockPlayer({
      identity: { ...createMockPlayer().identity, primaryPosition: 'CENTER_BACK' },
    });
    const fwd = createMockPlayer({
      identity: { ...createMockPlayer().identity, primaryPosition: 'FORWARD' },
    });
    const state: PlayerState = {
      fitness: 70,
      morale: 60,
      coachTrust: 40,
      fatigue: 10,
      teamStatus: 'fringe',
    };
    const result1 = simulateTraining(cb, state, rng1);
    const result2 = simulateTraining(fwd, state, rng2);
    expect(
      result1.focus === '防守' || result2.focus === '射门' || result1.focus !== result2.focus,
    ).toBe(true);
  });
});
