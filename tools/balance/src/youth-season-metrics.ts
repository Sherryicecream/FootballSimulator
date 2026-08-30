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
  };
}

export const percentile = (values: number[], fraction: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))]!;
};
