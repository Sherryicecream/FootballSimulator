import { describe, it, expect } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness/seeded-random-source';

describe('SeededRandomSource', () => {
  it('produces deterministic results for the same seed', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);

    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());

    expect(values1).toEqual(values2);
  });

  it('produces different results for different seeds', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(99);

    const values1 = Array.from({ length: 5 }, () => rng1.next());
    const values2 = Array.from({ length: 5 }, () => rng2.next());

    expect(values1).not.toEqual(values2);
  });

  it('returns values in [0, 1) range', () => {
    const rng = createSeededRandomSource(12345);

    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('tracks sequence position', () => {
    const rng = createSeededRandomSource(42);
    expect(rng.getPosition()).toBe(0);

    rng.next();
    expect(rng.getPosition()).toBe(1);

    rng.next();
    rng.next();
    expect(rng.getPosition()).toBe(3);
  });

  it('can be restored from a saved position', () => {
    const rng1 = createSeededRandomSource(42);
    rng1.next(); // position 1
    rng1.next(); // position 2
    const valueAt3 = rng1.next(); // position 3

    const rng2 = createSeededRandomSource(42);
    // Fast-forward to position 3
    rng2.next(); rng2.next();

    expect(rng2.next()).toBe(valueAt3);
  });

  it('generates integer in range', () => {
    const rng = createSeededRandomSource(42);

    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(1, 6);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it('generates integer in range with correct distribution', () => {
    const rng = createSeededRandomSource(42);
    const results = Array.from({ length: 1000 }, () => rng.nextInt(1, 100));
    const uniqueValues = new Set(results);
    expect(uniqueValues.size).toBeGreaterThan(50);
  });

  it('picks weighted random element', () => {
    const rng = createSeededRandomSource(42);
    const items = ['a', 'b', 'c'];
    const weights = [1, 1, 1];

    const results = Array.from({ length: 100 }, () => rng.pickWeighted(items, weights));
    expect(results.every(r => items.includes(r))).toBe(true);
  });

  it('shuffles array deterministically', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);

    const arr1 = [1, 2, 3, 4, 5, 6, 7, 8];
    const arr2 = [1, 2, 3, 4, 5, 6, 7, 8];

    const shuffled1 = rng1.shuffle(arr1);
    const shuffled2 = rng2.shuffle(arr2);

    expect(shuffled1).toEqual(shuffled2);
    expect(shuffled1.length).toBe(8);
    expect(shuffled1.sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});