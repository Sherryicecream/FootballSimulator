import { describe, it, expect } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness';
import { generateCoach, generateTeammates } from '../../src/relationships/initial-people';

describe('generateCoach', () => {
  it('returns a coach person', () => {
    const rng = createSeededRandomSource(42);
    const coach = generateCoach(rng);
    expect(coach.role).toBe('coach');
    expect(coach.name).toBeTruthy();
    expect(coach.age).toBeGreaterThanOrEqual(35);
    expect(coach.age).toBeLessThanOrEqual(55);
  });

  it('same seed produces same coach', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    expect(generateCoach(rng1).name).toBe(generateCoach(rng2).name);
  });
});

describe('generateTeammates', () => {
  it('returns 2 teammates', () => {
    const rng = createSeededRandomSource(42);
    const teammates = generateTeammates('MIDFIELDER', rng);
    expect(teammates).toHaveLength(2);
  });

  it('teammates have role teammate', () => {
    const rng = createSeededRandomSource(42);
    const teammates = generateTeammates('MIDFIELDER', rng);
    for (const tm of teammates) {
      expect(tm.role).toBe('teammate');
    }
  });

  it('same seed produces same teammates', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const t1 = generateTeammates('MIDFIELDER', rng1);
    const t2 = generateTeammates('MIDFIELDER', rng2);
    expect(t1[0].name).toBe(t2[0].name);
    expect(t1[1].name).toBe(t2[1].name);
  });

  it('different seeds produce different teammates', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(99);
    const t1 = generateTeammates('MIDFIELDER', rng1);
    const t2 = generateTeammates('MIDFIELDER', rng2);
    // Very unlikely to be the same
    const same = t1[0].name === t2[0].name && t1[1].name === t2[1].name;
    expect(same).toBe(false);
  });
});