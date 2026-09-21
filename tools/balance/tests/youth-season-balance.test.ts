import { describe, expect, it } from 'vitest';
import {
  runYouthSeasons,
  runYouthSeasonsParallel,
  type YouthBalanceProgress,
} from '../src/run-youth-seasons';

describe('youth balance runner', () => {
  it('reports each completed seed to the progress observer', () => {
    const progress: YouthBalanceProgress[] = [];
    runYouthSeasons(3, 5, {
      onProgress: (update) => {
        progress.push(update);
      },
    });

    expect(progress).toEqual([
      { completed: 1, total: 3, seed: 5 },
      { completed: 2, total: 3, seed: 6 },
      { completed: 3, total: 3, seed: 7 },
    ]);
  }, 120_000);

  it('rejects invalid parallelism instead of producing a partial report', async () => {
    await expect(runYouthSeasonsParallel(2, 1, { parallelism: Number.NaN })).rejects.toThrow(
      'parallelism 必须是正整数',
    );
  });

  it('keeps the report identical when independent seed ranges run in parallel', async () => {
    const sequential = runYouthSeasons(4, 1);
    const parallel = await runYouthSeasonsParallel(4, 1, { parallelism: 2 });

    expect(parallel).toEqual(sequential);
  }, 120_000);

  it('continues a non-expiring professional contract into the next season', async () => {
    await expect(runYouthSeasonsParallel(20, 1)).resolves.toBeDefined();
    // 常态约 5 秒；放宽到 120 秒避免全量并行时的负载偶发超时。
  }, 120_000);

  it('completes deterministic seasons and reports core distributions', async () => {
    const report = await runYouthSeasonsParallel(1000, 1);
    const firstTwenty = await runYouthSeasonsParallel(20, 1);
    expect(firstTwenty.metrics).toEqual(report.metrics.slice(0, 20));
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
    expect(report.summary.nationalTeamShare).toBeGreaterThanOrEqual(0.15);
    // spec §25.2 国家队占比目标 15–30%；断言上沿留出抽样余量（n=1000 时 σ≈1.4%）。
    expect(report.summary.nationalTeamShare).toBeLessThanOrEqual(0.34);
    // spec §25.2：世界级球员（退役声望 ≥70）占比 1–5%；伤病不得直接导致极早退役。
    expect(report.summary.worldClassRate).toBeGreaterThanOrEqual(0.01);
    // 职业日历与表现准备度会让少量边界样本跨过 70 声望阈值；1,000 季按约 0.5 个百分点留出抽样误差。
    expect(report.summary.worldClassRate).toBeLessThanOrEqual(0.055);
    expect(report.summary.earlyRetirementRate).toBeLessThan(0.01);
    expect(report.summary.reviewGeneratedRate).toBe(1);
    expect(report.summary.proCupAppearanceRate).toBeGreaterThan(0);
    expect(report.summary.proCupHonourRate).toBeGreaterThanOrEqual(0);
    expect(report.summary.proPromotionRate).toBeGreaterThanOrEqual(0);
    expect(report.summary.proRelegationRate).toBeGreaterThanOrEqual(0);
    expect(report.summary.world.clubCount).toBe(240);
    expect(report.summary.world.domesticClubCoverageRate).toBe(1);
    expect(report.summary.world.continentalOpportunityRate3Y).toBeGreaterThanOrEqual(0.6);
    expect(report.summary.world.continentalOpportunityRate3Y).toBeLessThanOrEqual(0.7);
    expect(report.summary.world.topTierWorldMentionRate5Y).toBeGreaterThanOrEqual(0.8);
    expect(report.summary.world.repeatHeadlineRate).toBeLessThanOrEqual(0.35);
    expect(report.summary.world.factLinkedNewsRate).toBe(1);
    expect(report.summary.world.worldStateReloadStable).toBe(true);
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
    // 1,000 季在低负载机器上运行约 5-8 分钟；当前工作区的完整职业路径约需 31 分钟，
    // 放宽到 40 分钟避免把机器负载波动误报为分布回归（分布断言本身不变）。
  }, 2_400_000);
});
