import type { CareerSaveV4Like, PromiseReview } from '@football/contracts';

export interface PromiseReviewOutcome {
  review: PromiseReview;
  trustDelta: number;
  reputationDelta: number;
  summary: string;
}

/**
 * 赛季末合同承诺对照（设计 §6）：
 * 份额 = 一线队出场分钟 / (联赛已赛场次 × 90)；预备队出场不计入。
 * 归因：伤病缺席多 → 球员原因；健康且训练尚可但没机会 → 俱乐部原因；
 * 训练不达标 → 球员原因；份额达标 → kept。
 */
export const reviewPromise = (save: CareerSaveV4Like): PromiseReviewOutcome | null => {
  const pro = save.proSeason;
  const contract = save.contract;
  if (!pro || !contract) throw new Error('缺少职业赛季或合同，无法对照承诺');
  if (contract.promise.kind === 'none') return null;

  const playedLeague = pro.fixtures.filter(
    ({ status, homeClubId, awayClubId }) =>
      status === 'played' && (homeClubId === pro.clubId || awayClubId === pro.clubId),
  ).length;
  const denominator = Math.max(1, playedLeague * 90);
  const share = Math.min(1, save.proSeasonStats.minutes / denominator);
  const promisedShare =
    contract.promise.kind === 'playing-time' ? contract.promise.minimumShare : 0.3;
  const kept = share >= promisedShare;

  const injuredWeeks = save.health.previousInjuries.length;
  const seasonInjured = injuredWeeks > 0 && !kept;
  const avgRating =
    save.proSeasonStats.ratingCount > 0
      ? save.proSeasonStats.ratingSum / save.proSeasonStats.ratingCount
      : null;
  const trainingOk = avgRating == null || avgRating >= 5.5;

  let cause: PromiseReview['cause'] = 'none';
  if (!kept) {
    if (seasonInjured) cause = 'injury';
    else if (trainingOk) cause = 'club';
    else cause = 'player';
  }

  const review: PromiseReview = {
    seasonId: pro.id,
    share: Math.round(share * 100) / 100,
    promisedShare,
    status: kept ? 'kept' : 'broken',
    cause,
    evaluatedOn: pro.endDate,
  };

  let trustDelta = 0;
  let reputationDelta = 0;
  let summary: string;
  if (kept) {
    trustDelta = 5;
    reputationDelta = 3;
    summary = `承诺兑现：出场份额 ${Math.round(share * 100)}%（承诺 ${Math.round(promisedShare * 100)}%），俱乐部与你的互信加深。`;
  } else if (cause === 'club') {
    trustDelta = -5;
    reputationDelta = 0;
    summary = `承诺未兑现（俱乐部原因）：出场份额 ${Math.round(share * 100)}% 低于承诺 ${Math.round(promisedShare * 100)}%，而你保持了健康与状态。`;
  } else if (cause === 'injury') {
    trustDelta = -3;
    reputationDelta = -2;
    summary = `承诺未兑现（伤病原因）：伤病缺席影响了出场份额（${Math.round(share * 100)}%）。`;
  } else {
    trustDelta = -4;
    reputationDelta = -1;
    summary = `承诺未兑现（状态原因）：出场份额 ${Math.round(share * 100)}% 低于承诺，训练表现也需要提升。`;
  }

  return { review, trustDelta, reputationDelta, summary };
};

/** 角色评估（设计 §6.3）：份额映射到队内角色。 */
export const evaluateProRole = (share: number): 'reserve' | 'bench' | 'rotation' | 'starter' => {
  if (share >= 0.5) return 'starter';
  if (share >= 0.3) return 'rotation';
  if (share >= 0.1) return 'bench';
  return 'reserve';
};

/** 续约要约：期限 2–3 年，薪资按上季表现与层级重算（±15%），承诺按新角色生成。 */
export const buildRenewalOffer = (
  save: CareerSaveV4Like,
  rng: () => number,
): {
  clubTier: number;
  salaryPerYear: number;
  contractYears: number;
  squadRole: 'youth-team' | 'rotation' | 'first-team-rotation' | 'highlighted-prospect';
  promise: { kind: 'playing-time'; minimumShare: number } | { kind: 'none' };
} => {
  const contract = save.contract!;
  const { ratingSum, ratingCount, minutes } = save.proSeasonStats;
  const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 6;
  const coefficient = 0.85 + Math.min(0.3, avgRating / 20 + minutes / 2700) + (rng() - 0.5) * 0.06;
  const salaryPerYear = Math.round(contract.salaryPerYear * coefficient);
  const share = save.promiseReviews.at(-1)?.share ?? 0;
  const squadRole =
    share >= 0.5
      ? ('first-team-rotation' as const)
      : share >= 0.3
        ? ('rotation' as const)
        : ('youth-team' as const);
  const contractYears = share >= 0.5 ? 3 : 2;
  const promise =
    share >= 0.3
      ? ({ kind: 'playing-time', minimumShare: share >= 0.5 ? 0.5 : 0.3 } as const)
      : ({ kind: 'none' } as const);
  return { clubTier: contract.clubTier, salaryPerYear, contractYears, squadRole, promise };
};
