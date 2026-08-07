import { describe, expect, it } from 'vitest';
import { deriveAge } from '../../src/career/simulate-youth-week';

describe('deriveAge', () => {
  it('changes age only when the birthday is crossed', () => {
    expect(deriveAge('2008-10-10', '2024-10-09')).toBe(15);
    expect(deriveAge('2008-10-10', '2024-10-10')).toBe(16);
    expect(deriveAge('2008-10-10', '2025-06-30')).toBe(16);
  });
});
