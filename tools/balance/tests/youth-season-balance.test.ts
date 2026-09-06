import { describe, expect, it } from 'vitest';
import { runYouthSeasons } from '../src/run-youth-seasons';

describe('youth balance runner', () => {
  it('continues a non-expiring professional contract into the next season', () => {
    expect(() => runYouthSeasons(20, 1)).not.toThrow();
  }, 30_000);

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
    // 年龄封顶后 19 岁球员必须进入职业市场，签约率允许略高于旧三季青训口径。
    expect(report.summary.graduationRate).toBeLessThanOrEqual(0.65);
    expect(report.summary.underageGraduationRate).toBeLessThan(0.15);
    expect(report.summary.contractTierCorrelation).toBeGreaterThan(0.3);
    expect(report.summary.rejectRate).toBeGreaterThanOrEqual(0.1);
    // 最后职业窗口增加一次真实的择约节点，拒签玩家占比允许到 30%。
    expect(report.summary.rejectRate).toBeLessThanOrEqual(0.3);
    for (const share of Object.values(report.summary.promiseShares)) {
      expect(share).toBeGreaterThanOrEqual(0.1);
    }

    // M6 职业期三连季校准范围（首轮工程校准）
    expect(report.summary.proPromiseKeptRate).toBeGreaterThanOrEqual(0.7);
    // M10 市场合同允许无出场承诺，兑现率上沿放宽但仍要求不超过 99%。
    expect(report.summary.proPromiseKeptRate).toBeLessThanOrEqual(0.99);
    expect(report.summary.proStarterRate).toBeGreaterThanOrEqual(0.15);
    // 首发率按全部样本统计；年龄封顶后更多球员进入职业期，随毕业率上沿同步放宽。
    expect(report.summary.proStarterRate).toBeLessThanOrEqual(0.65);
    expect(report.summary.proMinutesMedian).toBeGreaterThanOrEqual(55);
    expect(report.summary.proMinutesMedian).toBeLessThanOrEqual(85);
    // 3 个职业季内至少一次重伤的球员占比；约合每季 <4%（设计上限）
    expect(report.summary.proSevereInjuryRate).toBeLessThan(0.12);

    // M7 full-career calibration
    expect(report.summary.proSeasonsPlayedMedian).toBeGreaterThanOrEqual(8);
    expect(report.summary.proSeasonsPlayedMedian).toBeLessThanOrEqual(14);
    expect(report.summary.careerTransferMean).toBeGreaterThanOrEqual(0.5);
    expect(report.summary.careerTransferMean).toBeLessThanOrEqual(2.5);
    expect(report.summary.retirementAgeMedian).toBeGreaterThanOrEqual(30);
    expect(report.summary.retirementAgeMedian).toBeLessThanOrEqual(34);
    expect(report.summary.overseasShare).toBeGreaterThanOrEqual(0.1);
    // 19 岁最后窗口扩大了已毕业样本的年龄构成，留洋占比允许到 40%。
    expect(report.summary.overseasShare).toBeLessThanOrEqual(0.4);
    expect(report.summary.nationalTeamShare).toBeGreaterThanOrEqual(0.25);
    expect(report.summary.nationalTeamShare).toBeLessThanOrEqual(0.5);
    expect(report.summary.reviewGeneratedRate).toBe(1);
    expect(report.summary.proCupAppearanceRate).toBeGreaterThan(0);
    expect(report.summary.proCupHonourRate).toBeGreaterThanOrEqual(0);
    expect(report.summary.proPromotionRate).toBeGreaterThanOrEqual(0);
    expect(report.summary.proRelegationRate).toBeGreaterThanOrEqual(0);
    expect(report.metrics[0]).toEqual(
      expect.objectContaining({ proCupAppearances: expect.any(Number) }),
    );
    const marketRates = [
      report.summary.permanentTransferRate,
      report.summary.loanRate,
      report.summary.loanReturnRate,
      report.summary.loanSeasonAppearanceRate,
      report.summary.overseasMoveRate,
    ];
    for (const rate of marketRates) {
      expect(rate).toBeGreaterThanOrEqual(0);
    }
    for (const metric of report.metrics) {
      expect(metric.permanentMarketRequests).toBeGreaterThanOrEqual(0);
      expect(metric.permanentMarketSignings).toBeGreaterThanOrEqual(0);
      expect(metric.loanMarketRequests).toBeGreaterThanOrEqual(0);
      expect(metric.loanSignings).toBeGreaterThanOrEqual(0);
      expect(metric.loanReturns).toBeGreaterThanOrEqual(0);
      expect(metric.loanSeasonAppearances).toBeGreaterThanOrEqual(0);
      if (metric.loanSignings > 0) {
        expect(metric.loanHistoryCount).toBeGreaterThan(0);
        expect(metric.activeLoanAtEnd).toBe(false);
        expect(metric.loanContractStable).toBe(true);
      }
    }
    // 1,000 季在进程内运行约 5-8 分钟；满载机器上波动更大，放宽到 30 分钟避免把
    // 机器负载波动误报为分布回归（分布断言本身不变）。
  }, 1_800_000);
});
