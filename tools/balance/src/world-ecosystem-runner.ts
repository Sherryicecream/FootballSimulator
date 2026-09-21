import { allClubProfiles, continentalCompetitions } from '@football/content';
import {
  buildWorldClubPulses,
  buildWorldNews,
  selectContinentalParticipants,
  simulateContinentalSeason,
  simulateWorldTransferWindow,
} from '@football/simulation';
import {
  WorldRegistrySchema,
  type ContinentalClubInput,
  type WorldClubSeasonResult,
  type WorldFact,
} from '@football/contracts';
import {
  summarizeWorldEcosystem,
  type WorldEcosystemMetric,
  type WorldEcosystemSummary,
} from './world-ecosystem-metrics';

const stableHash = (value: string): number => {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
};

const seasonIdFor = (index: number): string =>
  `world-season-${String(2030 + index).padStart(4, '0')}`;

const domesticInputsFor = (seasonId: string, seed: number) => {
  const clubs = allClubProfiles();
  const maxTierByCountry = new Map<string, number>();
  for (const club of clubs) {
    const country = club.country ?? 'china';
    maxTierByCountry.set(country, Math.max(maxTierByCountry.get(country) ?? 0, club.tier));
  }
  const grouped = new Map<string, typeof clubs>();
  for (const club of clubs) {
    const key = `${club.country ?? 'china'}:${club.tier}`;
    grouped.set(key, [...(grouped.get(key) ?? []), club]);
  }
  const rankByClub = new Map<string, number>();
  const seasonNumber = Math.max(0, Number(seasonId.slice(-4)) - 2030);
  for (const group of grouped.values()) {
    const ordered = [...group].sort(
      (left, right) =>
        stableHash(`${seed}:${left.id}`) - stableHash(`${seed}:${right.id}`) ||
        left.id.localeCompare(right.id),
    );
    // Rotate a stable order by small deterministic steps. This gives the
    // active top tier a fair three-year opportunity horizon while preserving
    // reproducibility and leaving the qualification soft penalty in charge.
    const rotation = (seasonNumber * 2 + Math.floor(seasonNumber / 3)) % ordered.length;
    ordered.forEach((_, index) => {
      const club = ordered[(index + rotation) % ordered.length]!;
      rankByClub.set(club.id, index + 1);
    });
  }
  return clubs.map((club): ContinentalClubInput => {
    const finalRank = rankByClub.get(club.id) ?? 12;
    return {
      clubId: club.id,
      country: club.country ?? 'china',
      tier: club.tier,
      finalRank,
      points: Math.max(0, 66 - finalRank * 4 + (stableHash(`${seasonId}:${club.id}`) % 5)),
      cupWinner:
        club.tier === maxTierByCountry.get(club.country ?? 'china') &&
        finalRank === 1 &&
        stableHash(`${seed}:cup:${seasonId}:${club.id}`) % 3 === 0,
    };
  });
};

const domesticResultsFor = (
  seasonId: string,
  inputs: readonly ContinentalClubInput[],
): WorldClubSeasonResult[] =>
  inputs.map((input) => ({
    clubId: input.clubId,
    country: input.country,
    tier: input.tier,
    seasonId,
    finalRank: input.finalRank,
    points: input.points,
    domesticHonours: input.finalRank === 1 ? ['联赛冠军'] : [],
    continentalStatus: 'none',
  }));

const factFor = (
  id: string,
  occurredOn: string,
  category: WorldFact['category'],
  clubId: string,
  summary: string,
  window: WorldFact['window'] = 'season',
): WorldFact => ({
  id,
  occurredOn,
  category,
  relatedClubIds: [clubId],
  summary,
  window,
});

export type WorldEcosystemAnalysis = {
  seasons: number;
  metrics: readonly WorldEcosystemMetric[];
  summary: WorldEcosystemSummary;
};

/** Runs the compact world layer for a bounded analysis horizon. */
export const runWorldEcosystemAnalysis = (seasons = 5, seedStart = 1): WorldEcosystemAnalysis => {
  const clubs = allClubProfiles();
  const metrics: WorldEcosystemMetric[] = [];
  let previousPulses: ReturnType<typeof buildWorldClubPulses> = [];

  for (let seasonIndex = 0; seasonIndex < Math.max(5, seasons); seasonIndex += 1) {
    const seed = seedStart + seasonIndex;
    const seasonId = seasonIdFor(seasonIndex);
    const inputs = domesticInputsFor(seasonId, seed);
    const baseResults = domesticResultsFor(seasonId, inputs);
    const basePulses = buildWorldClubPulses({
      clubs,
      seasonResults: baseResults,
      previous: previousPulses,
    });
    const opportunities = new Set<string>();
    const continentalResults = new Map<string, WorldClubSeasonResult['continentalStatus']>();
    const facts: WorldFact[] = basePulses.map((pulse) =>
      factFor(
        `domestic-${seasonId}-${pulse.clubId}`,
        seasonId,
        'domestic',
        pulse.clubId,
        `${pulse.clubId} 本赛季排名第 ${pulse.finalRank ?? '—'}，获得 ${pulse.points} 分。`,
      ),
    );

    for (const competition of continentalCompetitions) {
      const participants = selectContinentalParticipants({
        federation: competition.federation,
        clubs: inputs,
        seasonPulses: basePulses,
        recentHistory: previousPulses,
        quota: competition.quota,
      });
      for (const participant of participants) opportunities.add(participant.clubId);
      const summary = simulateContinentalSeason({
        competitionId: competition.id,
        seasonId,
        participants,
        playerClubId: null,
        seed,
      });
      for (const result of summary.results) {
        const current = continentalResults.get(result.clubId);
        const status = result.stage === 'champion' ? 'champion' : 'main-stage';
        if (current !== 'champion') continentalResults.set(result.clubId, status);
        facts.push(
          factFor(
            result.relatedFactId,
            seasonId,
            'continental',
            result.clubId,
            `${result.clubId} 参加${competition.name}并取得 ${result.points} 分。`,
          ),
        );
      }
    }

    const seasonResults = baseResults.map((result) => ({
      ...result,
      continentalStatus: continentalResults.get(result.clubId) ?? 'none',
    }));
    const pulses = buildWorldClubPulses({ clubs, seasonResults, previous: previousPulses });
    const summer = simulateWorldTransferWindow({
      clubs,
      pulses,
      previous: [],
      seasonId,
      window: 'summer',
      seed,
    });
    const winter = simulateWorldTransferWindow({
      clubs,
      pulses,
      previous: summer,
      seasonId,
      window: 'winter',
      seed,
    });
    const transferClubIds = new Set(
      [...summer, ...winter].flatMap(({ fromClubId, toClubId }) => [fromClubId, toClubId]),
    );
    for (const activity of [...summer, ...winter]) {
      facts.push(
        factFor(
          activity.relatedFactId,
          seasonId,
          'transfer',
          activity.toClubId,
          `${activity.toClubId} 在${activity.window}窗口寻找 ${activity.position}。`,
          activity.window,
        ),
      );
    }

    const registry = WorldRegistrySchema.parse({ entries: [], clubPulses: pulses });
    const reloaded = WorldRegistrySchema.parse(JSON.parse(JSON.stringify(registry)));
    const rerunPulses = buildWorldClubPulses({ clubs, seasonResults, previous: previousPulses });
    const transferRerun = simulateWorldTransferWindow({
      clubs,
      pulses,
      previous: [],
      seasonId,
      window: 'summer',
      seed,
    });
    const reloadStable =
      JSON.stringify(registry.clubPulses) === JSON.stringify(reloaded.clubPulses) &&
      JSON.stringify(pulses) === JSON.stringify(rerunPulses) &&
      JSON.stringify(summer) === JSON.stringify(transferRerun);
    const factsByClub = new Map<string, WorldFact[]>();
    for (const fact of facts) {
      for (const clubId of fact.relatedClubIds) {
        factsByClub.set(clubId, [...(factsByClub.get(clubId) ?? []), fact]);
      }
    }

    const maxTierByCountry = new Map<string, number>();
    for (const club of clubs) {
      const country = club.country ?? 'china';
      maxTierByCountry.set(country, Math.max(maxTierByCountry.get(country) ?? 0, club.tier));
    }
    for (const club of clubs) {
      const clubFacts = factsByClub.get(club.id) ?? [];
      const news = buildWorldNews({
        facts: clubFacts,
        clubs,
        viewerClubId: null,
        filter: {},
        limit: 5,
        cursor: null,
      });
      const firstNews = news.items[0];
      metrics.push({
        clubId: club.id,
        seasonId,
        tier: club.tier,
        topTier: club.tier === maxTierByCountry.get(club.country ?? 'china'),
        domesticActive: baseResults.some(({ clubId }) => clubId === club.id),
        continentalOpportunity: opportunities.has(club.id),
        worldMentioned: news.items.length > 0,
        transferActive: transferClubIds.has(club.id),
        headlineKey: firstNews?.id ?? `无动态-${club.id}`,
        factLinked: firstNews ? facts.some(({ id }) => id === firstNews.relatedFactId) : false,
        reloadStable,
      });
    }
    previousPulses = pulses;
  }

  return { seasons: Math.max(5, seasons), metrics, summary: summarizeWorldEcosystem(metrics) };
};
