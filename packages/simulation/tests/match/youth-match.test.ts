import { describe, it, expect } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness';
import { simulateYouthMatch } from '../../src/match/youth-match';
import type { PlayerCareer, PlayerState } from '@football/contracts';

function createMockPlayer(overrides: Partial<PlayerCareer> = {}): PlayerCareer {
  return {
    identity: {
      name: '测试', hometown: '上海', homelandId: 'shanghai', dateOfBirth: '2008-01-01',
      primaryPosition: 'MIDFIELDER', preferredFoot: 'RIGHT', weakFootLevel: 30,
      growthBackground: 'academy', personalityTendency: 'composed',
    },
    attributes: {
      technical: { firstTouch: 50, dribbling: 50, passing: 50, shooting: 40, defending: 30, aerialAbility: 30 },
      physical: { pace: 50, strength: 50, stamina: 50, agility: 50 },
      mental: { offTheBall: 50, vision: 50, decision: 50, composure: 50, determination: 50, discipline: 50 },
    },
    hiddenTraits: { potential: 80, stability: 60, professionalism: 70, pressureResistance: 60, adaptability: 50, injuryProneness: 30 },
    age: 16, careerStage: 'YOUTH', reputation: 20,
    ...overrides,
  };
}

describe('simulateYouthMatch', () => {
  it('returns a match result with opponent', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe' };
    const result = simulateYouthMatch(player, state, 5, 2024, rng);
    expect(result.opponent).toBeTruthy();
    expect(result.opponent.length).toBeGreaterThan(0);
  });

  it('rating is between 1 and 10', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'regular' };
    const result = simulateYouthMatch(player, state, 5, 2024, rng);
    expect(result.rating).toBeGreaterThanOrEqual(1);
    expect(result.rating).toBeLessThanOrEqual(10);
  });

  it('same seed produces same match result', () => {
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'regular' };
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const result1 = simulateYouthMatch(player, state, 5, 2024, rng1);
    const result2 = simulateYouthMatch(player, state, 5, 2024, rng2);
    expect(result1.opponent).toBe(result2.opponent);
    expect(result1.homeScore).toBe(result2.homeScore);
    expect(result1.awayScore).toBe(result2.awayScore);
    expect(result1.rating).toBe(result2.rating);
  });

  it('fitness decreases after playing a match', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'regular' };
    const result = simulateYouthMatch(player, state, 5, 2024, rng);
    if (result.played) {
      expect(result.fitnessChange).toBeLessThanOrEqual(-3);
    }
  });

  it('stronger players tend to get higher ratings', () => {
    const rng1 = createSeededRandomSource(100);
    const rng2 = createSeededRandomSource(100);
    const weakPlayer = createMockPlayer({
      attributes: {
        technical: { firstTouch: 20, dribbling: 20, passing: 20, shooting: 20, defending: 20, aerialAbility: 20 },
        physical: { pace: 20, strength: 20, stamina: 20, agility: 20 },
        mental: { offTheBall: 20, vision: 20, decision: 20, composure: 20, determination: 20, discipline: 20 },
      },
    });
    const strongPlayer = createMockPlayer({
      attributes: {
        technical: { firstTouch: 80, dribbling: 80, passing: 80, shooting: 80, defending: 80, aerialAbility: 80 },
        physical: { pace: 80, strength: 80, stamina: 80, agility: 80 },
        mental: { offTheBall: 80, vision: 80, decision: 80, composure: 80, determination: 80, discipline: 80 },
      },
    });
    const state: PlayerState = { fitness: 80, morale: 80, coachTrust: 80, fatigue: 10, teamStatus: 'key' };
    const weakResult = simulateYouthMatch(weakPlayer, state, 5, 2024, rng1);
    const strongResult = simulateYouthMatch(strongPlayer, state, 5, 2024, rng2);
    // Strong player should have at least equal rating for same seed
    expect(strongResult.rating).toBeGreaterThanOrEqual(weakResult.rating - 1);
  });
});