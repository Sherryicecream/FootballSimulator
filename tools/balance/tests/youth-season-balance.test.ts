import { describe, expect, it } from 'vitest';
import { runYouthSeasons } from '../src/run-youth-seasons';

describe('youth balance runner', () => {
  it('completes deterministic seasons and reports core distributions', () => {
    const report = runYouthSeasons(1000, 1);
    expect(runYouthSeasons(20, 1).metrics).toEqual(report.metrics.slice(0, 20));
    expect(report.summary.completionRate).toBe(1);
    expect(report.summary.fixtureMedian).toBeGreaterThanOrEqual(18);
    expect(report.summary.fixtureMedian).toBeLessThanOrEqual(26);
    expect(report.summary.decisionMedian).toBeGreaterThanOrEqual(6);
    expect(report.summary.decisionMedian).toBeLessThanOrEqual(12);
    expect(report.summary.maxAttributeGrowthP90).toBeLessThanOrEqual(3);
    expect(report.summary.severeInjuryRate).toBeLessThan(0.03);
    expect(report.summary.firstTeamWatchlistRate).toBeGreaterThanOrEqual(0.1);
    expect(report.summary.firstTeamWatchlistRate).toBeLessThanOrEqual(0.35);
    expect(report.summary.firstTeamAppearanceRate).toBeGreaterThanOrEqual(0.01);
    expect(report.summary.firstTeamAppearanceRate).toBeLessThanOrEqual(0.05);
    expect(report.summary.releaseRate).toBeGreaterThanOrEqual(0.01);
    expect(report.summary.releaseRate).toBeLessThanOrEqual(0.08);
    expect(report.summary.goalsPerMatch).toBeGreaterThanOrEqual(2);
    expect(report.summary.goalsPerMatch).toBeLessThanOrEqual(3.5);
  });
});
