import { describe, it, expect } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness';
import { generateWeekActivity } from '../../src/career/week-activities';

describe('generateWeekActivity', () => {
  it('returns a valid activity type', () => {
    const rng = createSeededRandomSource(42);
    const result = generateWeekActivity(3, 1, rng);
    expect(['training', 'match', 'event', 'quiet']).toContain(result.activity);
  });

  it('training is a common activity', () => {
    const rng = createSeededRandomSource(42);
    let trainingCount = 0;
    for (let i = 0; i < 10; i++) {
      const result = generateWeekActivity(i + 1, 1, rng);
      if (result.hasTraining) trainingCount++;
    }
    expect(trainingCount).toBeGreaterThanOrEqual(3);
  });

  it('match week appears with predictable frequency', () => {
    const rng = createSeededRandomSource(42);
    let matchCount = 0;
    for (let week = 1; week <= 20; week++) {
      const result = generateWeekActivity(week, 1, rng);
      if (result.hasMatch) matchCount++;
    }
    expect(matchCount).toBeGreaterThanOrEqual(3);
    expect(matchCount).toBeLessThanOrEqual(10);
  });

  it('same seed and week produces same activity', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const result1 = generateWeekActivity(5, 1, rng1);
    const result2 = generateWeekActivity(5, 1, rng2);
    expect(result1.activity).toBe(result2.activity);
  });
});
