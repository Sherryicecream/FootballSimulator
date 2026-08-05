import { describe, it, expect } from 'vitest';
import { initializePlayerState } from '../../src/career/initial-state';

describe('initializePlayerState', () => {
  it('returns a valid PlayerState', () => {
    const state = initializePlayerState();
    expect(state.fitness).toBe(70);
    expect(state.morale).toBe(60);
    expect(state.coachTrust).toBe(35);
    expect(state.fatigue).toBe(5);
    expect(state.teamStatus).toBe('fringe');
  });

  it('all values are within valid range', () => {
    const state = initializePlayerState();
    expect(state.fitness).toBeGreaterThanOrEqual(0);
    expect(state.fitness).toBeLessThanOrEqual(100);
    expect(state.morale).toBeGreaterThanOrEqual(0);
    expect(state.morale).toBeLessThanOrEqual(100);
    expect(state.coachTrust).toBeGreaterThanOrEqual(0);
    expect(state.coachTrust).toBeLessThanOrEqual(100);
    expect(state.fatigue).toBeGreaterThanOrEqual(0);
    expect(state.fatigue).toBeLessThanOrEqual(100);
  });
});