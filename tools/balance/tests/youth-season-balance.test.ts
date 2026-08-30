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
    expect(report.summary.maxDecisionsInMonth).toBeLessThanOrEqual(2);
    expect(report.summary.decisionMedian).toBeGreaterThanOrEqual(4);
    expect(report.summary.decisionP90).toBeLessThanOrEqual(18);
    expect(report.summary.themeCoverageRate).toBeGreaterThanOrEqual(0.65);
    expect(report.summary.uniqueEventCombinations).toBeGreaterThanOrEqual(80);

    expect(report.summary.severeInjuryRate).toBeLessThan(0.03);
    expect(report.summary.firstTeamWatchlistRate).toBeGreaterThanOrEqual(0.1);
    expect(report.summary.firstTeamWatchlistRate).toBeLessThanOrEqual(0.35);
    expect(report.summary.firstTeamAppearanceRate).toBeGreaterThanOrEqual(0.01);
    expect(report.summary.firstTeamAppearanceRate).toBeLessThanOrEqual(0.05);
    expect(report.summary.releaseRate).toBeGreaterThanOrEqual(0.01);
    expect(report.summary.releaseRate).toBeLessThanOrEqual(0.08);
    expect(report.summary.goalsPerMatch).toBeGreaterThanOrEqual(2);
    expect(report.summary.goalsPerMatch).toBeLessThanOrEqual(3.5);

    // M5 三连季生命周期校准范围（首轮工程校准）
    expect(report.summary.graduationRate).toBeGreaterThanOrEqual(0.3);
    expect(report.summary.graduationRate).toBeLessThanOrEqual(0.6);
    expect(report.summary.underageGraduationRate).toBeLessThan(0.15);
    expect(report.summary.contractTierCorrelation).toBeGreaterThan(0.3);
    expect(report.summary.rejectRate).toBeGreaterThanOrEqual(0.1);
    expect(report.summary.rejectRate).toBeLessThanOrEqual(0.25);
    for (const share of Object.values(report.summary.promiseShares)) {
      expect(share).toBeGreaterThanOrEqual(0.1);
    }
  }, 300_000);
});
