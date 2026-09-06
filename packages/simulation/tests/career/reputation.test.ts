import { describe, expect, it } from 'vitest';
import { applyReputationGain, leagueTierFactor } from '../../src/career/reputation';

describe('applyReputationGain', () => {
  it('applies full gains below the solid band', () => {
    expect(applyReputationGain(20, 4)).toBe(24);
  });

  it('dampens gains as reputation climbs the ladder', () => {
    expect(applyReputationGain(50, 4)).toBe(52); // 45–59 ×0.6
    expect(applyReputationGain(70, 4)).toBe(72); // 60–74 ×0.45
    expect(applyReputationGain(90, 4)).toBe(91); // ≥75 ×0.18
  });

  it('keeps the ladder monotone and clamped', () => {
    expect(applyReputationGain(64, 4)).toBeGreaterThanOrEqual(64);
    expect(applyReputationGain(100, 10)).toBe(100);
    expect(applyReputationGain(30, -5)).toBe(25);
  });
});

describe('leagueTierFactor', () => {
  it('is 1.0 at the top tier and shrinks toward lower tiers with a floor', () => {
    expect(leagueTierFactor(8)).toBe(1);
    expect(leagueTierFactor(5)).toBeCloseTo(0.82, 2);
    expect(leagueTierFactor(3)).toBeCloseTo(0.7, 2);
    expect(leagueTierFactor(1)).toBeCloseTo(0.58, 2);
  });
});
