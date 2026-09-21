import type { ClubProfile, WorldClubPulse, WorldTransferActivity } from '@football/contracts';
import { WorldTransferActivitySchema } from '@football/contracts';
import { selectOverseasMarketRepresentatives } from '../career/transfer-offers';

const MAX_WINDOW_ACTIVITIES = 24;
const WORLD_COUNTRIES = new Set([
  'china',
  'england',
  'spain',
  'germany',
  'italy',
  'france',
  'japan',
  'korea',
]);

const stableHash = (value: string): number => {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
};

const activityId = (seasonId: string, window: string, index: number): string =>
  `world-transfer-${seasonId.slice(-24)}-${window}-${index}`.slice(0, 60);

const factId = (seasonId: string, fromClubId: string, toClubId: string): string =>
  `transfer-${seasonId.slice(-18)}-${fromClubId.slice(-14)}-${toClubId.slice(-14)}`.slice(0, 60);

const reasonFor = (from: ClubProfile, to: ClubProfile): WorldTransferActivity['reason'] => {
  if (to.tier > from.tier) return 'promotion';
  if (to.tier < from.tier) return 'relegation';
  if (to.positionalNeeds.length > 0) return 'need';
  return 'contract';
};

export const simulateWorldTransferWindow = ({
  clubs,
  pulses,
  previous,
  seasonId,
  window,
  seed,
}: {
  clubs: readonly ClubProfile[];
  pulses: readonly WorldClubPulse[];
  previous: readonly WorldTransferActivity[];
  seasonId: string;
  window: 'summer' | 'winter';
  seed: number;
}): WorldTransferActivity[] => {
  const playableClubs = [...clubs]
    .filter((club) => club.country == null || WORLD_COUNTRIES.has(club.country))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (playableClubs.length < 2) return [];

  const pulseByClub = new Map(pulses.map((pulse) => [pulse.clubId, pulse]));
  // Consecutive seeded windows walk disjoint slices before wrapping, so all
  // clubs get a background opportunity over a finite horizon.
  const offset = (Math.abs(seed) * MAX_WINDOW_ACTIVITIES) % playableClubs.length;
  const previousPairs = new Set(
    previous.map(({ fromClubId, toClubId, reason }) => `${fromClubId}:${toClubId}:${reason}`),
  );
  const activities: WorldTransferActivity[] = [];
  for (
    let index = 0;
    index < playableClubs.length && activities.length < MAX_WINDOW_ACTIVITIES;
    index += 1
  ) {
    const from = playableClubs[(offset + index) % playableClubs.length]!;
    const to = playableClubs[(offset + index + 1) % playableClubs.length]!;
    const reason = reasonFor(from, to);
    const pairKey = `${from.id}:${to.id}:${reason}`;
    if (previousPairs.has(pairKey)) continue;
    const targetPulse = pulseByClub.get(to.id);
    const confidence = Math.min(
      0.95,
      0.45 +
        (targetPulse?.continentalStatus === 'main-stage' ? 0.15 : 0) +
        ((seed + index) % 4) * 0.05,
    );
    activities.push(
      WorldTransferActivitySchema.parse({
        id: activityId(seasonId, window, activities.length),
        seasonId,
        window,
        fromClubId: from.id,
        toClubId: to.id,
        playerId: null,
        position: to.positionalNeeds[0] ?? 'MIDFIELDER',
        status: 'rumour',
        reason,
        confidence,
        relatedFactId: factId(seasonId, from.id, to.id),
      }),
    );
  }
  return activities;
};

export const selectPlayerMarketClubs = ({
  clubs,
  pulses,
  playerAbility,
  playerAdaptability,
  seed,
}: {
  clubs: readonly ClubProfile[];
  pulses: readonly WorldClubPulse[];
  playerAbility: number;
  playerAdaptability: number;
  seed: number;
}): ClubProfile[] => {
  if (playerAdaptability < 55 || playerAbility < 1) return [];
  const activeIds = new Set(
    [...pulses]
      .filter(({ finalRank }) => finalRank !== null)
      .sort((left, right) => (left.finalRank ?? 99) - (right.finalRank ?? 99))
      .map(({ clubId }) => clubId),
  );
  const preferred = clubs.filter(({ id }) => activeIds.has(id));
  const pool = preferred.length > 0 ? preferred : clubs;
  const rotated = [...pool].sort(
    (left, right) =>
      stableHash(`${seed}:${left.id}`) - stableHash(`${seed}:${right.id}`) ||
      left.id.localeCompare(right.id),
  );
  return selectOverseasMarketRepresentatives(rotated, 3).slice(0, 24);
};
