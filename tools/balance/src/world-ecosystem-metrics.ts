export interface WorldEcosystemMetric {
  clubId: string;
  seasonId: string;
  tier: number;
  topTier: boolean;
  domesticActive: boolean;
  continentalOpportunity: boolean;
  worldMentioned: boolean;
  transferActive: boolean;
  headlineKey: string;
  factLinked: boolean;
  reloadStable: boolean;
}

export interface WorldEcosystemSummary {
  clubCount: number;
  domesticClubCoverageRate: number;
  continentalOpportunityRate3Y: number;
  topTierWorldMentionRate5Y: number;
  transferActivityClubRate5Y: number;
  repeatHeadlineRate: number;
  factLinkedNewsRate: number;
  worldStateReloadStable: boolean;
  firstFailure: { clubId: string; seasonId: string } | null;
}

const bySeason = (left: WorldEcosystemMetric, right: WorldEcosystemMetric): number =>
  left.seasonId.localeCompare(right.seasonId) || left.clubId.localeCompare(right.clubId);

const recent = (metrics: readonly WorldEcosystemMetric[], years: number): WorldEcosystemMetric[] =>
  [...metrics].sort(bySeason).slice(-years);

/** Summarizes only facts/results collected by the balance runner. */
export const summarizeWorldEcosystem = (
  metrics: readonly WorldEcosystemMetric[],
): WorldEcosystemSummary => {
  const byClub = new Map<string, WorldEcosystemMetric[]>();
  for (const metric of metrics) {
    const current = byClub.get(metric.clubId) ?? [];
    current.push(metric);
    byClub.set(metric.clubId, current);
  }
  const clubs = [...byClub.values()];
  const count = clubs.length;
  const ratio = (numerator: number, denominator: number): number =>
    denominator === 0 ? 0 : numerator / denominator;

  const domesticCovered = clubs.filter((clubMetrics) =>
    recent(clubMetrics, 1).some(({ domesticActive }) => domesticActive),
  ).length;
  const topTierClubs = clubs.filter((clubMetrics) => clubMetrics.some(({ topTier }) => topTier));
  const continentalCovered = topTierClubs.filter((clubMetrics) =>
    recent(clubMetrics, 3).some(({ continentalOpportunity }) => continentalOpportunity),
  ).length;
  const topTierMentioned = topTierClubs.filter((clubMetrics) =>
    recent(clubMetrics, 5).some(({ worldMentioned }) => worldMentioned),
  ).length;
  const transferClubs = clubs.filter((clubMetrics) =>
    recent(clubMetrics, 5).some(({ transferActive }) => transferActive),
  ).length;
  const uniqueHeadlines = new Set(metrics.map(({ headlineKey }) => headlineKey)).size;
  const firstFailure = metrics.find(({ factLinked, reloadStable }) => !factLinked || !reloadStable);

  return {
    clubCount: count,
    domesticClubCoverageRate: ratio(domesticCovered, count),
    continentalOpportunityRate3Y: ratio(continentalCovered, topTierClubs.length),
    topTierWorldMentionRate5Y: ratio(topTierMentioned, topTierClubs.length),
    transferActivityClubRate5Y: ratio(transferClubs, count),
    repeatHeadlineRate: ratio(metrics.length - uniqueHeadlines, metrics.length),
    factLinkedNewsRate: ratio(
      metrics.filter(({ factLinked }) => factLinked).length,
      metrics.length,
    ),
    worldStateReloadStable: firstFailure === undefined,
    firstFailure: firstFailure
      ? { clubId: firstFailure.clubId, seasonId: firstFailure.seasonId }
      : null,
  };
};
