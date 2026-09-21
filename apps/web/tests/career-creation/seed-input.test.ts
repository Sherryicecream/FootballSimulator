import { describe, expect, it } from 'vitest';
import { parseSeedInput } from '../../src/career-creation/seed-input';

describe('parseSeedInput', () => {
  it.each([
    ['0', 0],
    ['2147483647', 2147483647],
    [' 42 ', 42],
    ['0007', 7],
  ])('parses valid non-negative integer %s', (text, expected) => {
    expect(parseSeedInput(text)).toBe(expected);
  });

  it.each(['', '   ', '\t\n'])('returns null for blank input %s', (text) => {
    expect(parseSeedInput(text)).toBeNull();
  });

  it.each(['-1', '1.5', '1e3', '0x10', '2147483648', '9007199254740992'])(
    'rejects invalid seed %s',
    (text) => {
      expect(() => parseSeedInput(text)).toThrow();
    },
  );

  it('uses a range-specific message for an out-of-range seed', () => {
    expect(() => parseSeedInput('2147483648')).toThrow('种子超出范围');
  });
});
