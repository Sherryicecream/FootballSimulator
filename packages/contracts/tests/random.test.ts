import { describe, it, expect } from 'vitest';
import { RandomStateSchema } from '../src/random';

describe('RandomState', () => {
  it('validates a random state with seed and position', () => {
    const valid = RandomStateSchema.parse({
      seed: 12345,
      sequencePosition: 0,
    });
    expect(valid.seed).toBe(12345);
    expect(valid.sequencePosition).toBe(0);
  });

  it('rejects negative seed', () => {
    expect(() => RandomStateSchema.parse({ seed: -1, sequencePosition: 0 })).toThrow();
  });

  it('rejects negative sequence position', () => {
    expect(() => RandomStateSchema.parse({ seed: 42, sequencePosition: -5 })).toThrow();
  });

  it('accepts 32-bit integer seed values', () => {
    const valid = RandomStateSchema.parse({ seed: 2147483647, sequencePosition: 100 });
    expect(valid.seed).toBe(2147483647);
  });
});