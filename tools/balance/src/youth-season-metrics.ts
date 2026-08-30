export interface YouthSeasonMetrics {
  seed: number;
  fixtures: number;
  decisions: number;
  totalAttributeGrowth: number;
  maxAttributeGrowth: number;
  injuries: number;
  severeInjuries: number;
  firstTeamStage: string;
  released: boolean;
  goalsPerMatch: number;
  uniqueDecisionEvents: number;
  decisionEventIds: string[];
  eventThemes: string[];
  maxDecisionsInMonth: number;
  coachEvaluation: number;
  form: number;
  confidence: number;
  playerRole: string;
  /** 三连季生命周期指标 */
  seasonsPlayed: number;
  graduated: boolean;
  graduationAge: number | null;
  contractTier: number | null;
  contractPromiseKind: string | null;
  rejectedOfferSeasons: number;
  weightedAbility: number;
  proSeasonsPlayed: number;
  promiseKept: boolean;
  promiseCause: string;
  starterReached: boolean;
  proMinutes: number;
  proLeagueAppearances: number;
  proSevereInjuries: number;
  freeAgent: boolean;
}

export interface YouthBalanceReport {
  runs: number;
  seedStart: number;
  metrics: YouthSeasonMetrics[];
  summary: {
    completionRate: number;
    fixtureMedian: number;
    decisionMedian: number;
    decisionP90: number;
    maxDecisionsInMonth: number;
    attributeGrowthMedian: number;
    maxAttributeGrowthP90: number;
    severeInjuryRate: number;
    firstTeamWatchlistRate: number;
    firstTeamAppearanceRate: number;
    releaseRate: number;
    goalsPerMatch: number;
    uniqueStoryCombinations: number;
    themeCoverageRate: number;
    uniqueEventCombinations: number;
    graduationRate: number;
    underageGraduationRate: number;
    proPromiseKeptRate: number;
    proClubCauseBrokenRate: number;
    proStarterRate: number;
    proMinutesMedian: number;
    proSevereInjuryRate: number;
    proFreeAgentRate: number;
    contractTierCorrelation: number;
    rejectRate: number;
    promiseShares: Record<string, number>;
    seasonsPlayedMedian: number;
  };
}

/** 皮尔逊相关系数；样本不足或方差为零时返回 0。 */
export const correlation = (pairs: Array<[number, number]>): number => {
  if (pairs.length < 2) return 0;
  const n = pairs.length;
  const meanX = pairs.reduce((sum, [x]) => sum + x, 0) / n;
  const meanY = pairs.reduce((sum, [, y]) => sum + y, 0) / n;
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (const [x, y] of pairs) {
    covariance += (x - meanX) * (y - meanY);
    varianceX += (x - meanX) ** 2;
    varianceY += (y - meanY) ** 2;
  }
  if (varianceX === 0 || varianceY === 0) return 0;
  return covariance / Math.sqrt(varianceX * varianceY);
};

export const percentile = (values: number[], fraction: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))]!;
};
