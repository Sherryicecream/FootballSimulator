import { describe, expect, it } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness';

describe('seeded random source skip', () => {
  it('advances the sequence identically to repeated draws', () => {
    for (const seed of [1, 42, 999983, -12345]) {
      const skipped = createSeededRandomSource(seed);
      const stepped = createSeededRandomSource(seed);
      for (let count = 0; count <= 300; count += 17) {
        skipped.skip(count);
        for (let index = 0; index < count; index += 1) stepped.next();
        expect(skipped.getPosition()).toBe(stepped.getPosition());
        expect(skipped.next()).toBe(stepped.next());
      }
    }
  });

  it('keeps subsequent draws identical after a large skip', () => {
    const skipped = createSeededRandomSource(20260906);
    const stepped = createSeededRandomSource(20260906);
    skipped.skip(5000);
    for (let index = 0; index < 5000; index += 1) stepped.next();
    for (let index = 0; index < 50; index += 1) {
      expect(skipped.nextInt(0, 99)).toBe(stepped.nextInt(0, 99));
    }
  });
});
