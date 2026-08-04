// Mulberry32 -- a fast, high-quality 32-bit seeded PRNG.
// Returns a generator of deterministic floats in [0, 1).
export interface SeededRandomSource {
  /** Next float in [0, 1) */
  next(): number;
  /** Next integer in [min, max] inclusive */
  nextInt(min: number, max: number): number;
  /** Pick a random element from an array */
  pick<T>(items: readonly T[]): T;
  /** Pick weighted (weights sum to > 0) */
  pickWeighted<T>(items: readonly T[], weights: readonly number[]): T;
  /** Fisher-Yates shuffle (returns new array) */
  shuffle<T>(items: readonly T[]): T[];
  /** Current sequence position */
  getPosition(): number;
}

export const createSeededRandomSource = (seed: number): SeededRandomSource => {
  let state = seed | 0; // Ensure 32-bit integer
  let position = 0;

  const next = (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    position++;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const nextInt = (min: number, max: number): number => {
    return Math.floor(next() * (max - min + 1)) + min;
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('Cannot pick from an empty array');
    return items[nextInt(0, items.length - 1)]!;
  };

  const pickWeighted = <T>(items: readonly T[], weights: readonly number[]): T => {
    if (items.length === 0) throw new Error('Cannot pick from an empty array');
    if (items.length !== weights.length)
      throw new Error('Items and weights must have the same length');

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) throw new Error('Total weight must be greater than 0');

    let random = next() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      random -= weights[i]!;
      if (random <= 0) return items[i]!;
    }
    return items[items.length - 1]!;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = nextInt(0, i);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  };

  const getPosition = (): number => position;

  return { next, nextInt, pick, pickWeighted, shuffle, getPosition };
};
