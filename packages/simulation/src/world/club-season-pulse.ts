import {
  inferLegacyClubCountry,
  type BuildWorldClubPulsesInput,
  type WorldClubPulse,
  type WorldClubSeasonResult,
} from '@football/contracts';

const UNKNOWN_SEASON_ID = 'world-unknown';

const descendingSeasonId = (left: WorldClubPulse, right: WorldClubPulse): number =>
  right.seasonId.localeCompare(left.seasonId);

const latestSeasonId = (
  seasonResults: readonly WorldClubSeasonResult[],
  previous: readonly WorldClubPulse[],
): string => {
  const seasonIds = [
    ...seasonResults.map(({ seasonId }) => seasonId),
    ...previous.map(({ seasonId }) => seasonId),
  ].sort();
  return seasonIds.at(-1) ?? UNKNOWN_SEASON_ID;
};

const seasonResultByClub = (
  seasonResults: readonly WorldClubSeasonResult[],
): ReadonlyMap<string, WorldClubSeasonResult> => {
  const resultByClub = new Map<string, WorldClubSeasonResult>();
  for (const result of [...seasonResults].sort((left, right) =>
    left.clubId.localeCompare(right.clubId),
  )) {
    if (!resultByClub.has(result.clubId)) resultByClub.set(result.clubId, result);
  }
  return resultByClub;
};

const previousSeasonsForClub = (
  previous: readonly WorldClubPulse[],
  clubId: string,
  seasonId: string,
): WorldClubPulse[] => {
  const seenSeasons = new Set<string>();
  return [...previous]
    .filter((pulse) => pulse.clubId === clubId && pulse.seasonId !== seasonId)
    .sort(descendingSeasonId)
    .filter((pulse) => {
      if (seenSeasons.has(pulse.seasonId)) return false;
      seenSeasons.add(pulse.seasonId);
      return true;
    })
    .slice(0, 2);
};

const buildPulse = (
  club: BuildWorldClubPulsesInput['clubs'][number],
  result: WorldClubSeasonResult | undefined,
  currentSeasonId: string,
  previous: readonly WorldClubPulse[],
): WorldClubPulse => {
  const seasonId = result?.seasonId ?? currentSeasonId;
  const previousSeasons = previousSeasonsForClub(previous, club.id, seasonId);
  const currentAppearance =
    result?.continentalStatus !== undefined && result.continentalStatus !== 'none';
  const previousAppearances = previousSeasons.filter(
    ({ continentalStatus }) => continentalStatus !== 'none',
  ).length;
  const latestPrevious = previousSeasons[0];

  return {
    clubId: club.id,
    country: result?.country ?? inferLegacyClubCountry(club),
    tier: result?.tier ?? club.tier,
    seasonId,
    finalRank: result?.finalRank ?? null,
    points: result?.points ?? 0,
    domesticHonours: result ? [...result.domesticHonours] : [],
    continentalStatus: result?.continentalStatus ?? 'none',
    continentalAppearancesLast3: previousAppearances + (currentAppearance ? 1 : 0),
    transferActivityLast2: latestPrevious?.transferActivityLast2 ?? 0,
    lastNewsWindow:
      previousSeasons.find(({ lastNewsWindow }) => lastNewsWindow !== null)?.lastNewsWindow ?? null,
  };
};

export const buildWorldClubPulses = ({
  clubs,
  seasonResults,
  previous,
}: BuildWorldClubPulsesInput): WorldClubPulse[] => {
  const resultByClub = seasonResultByClub(seasonResults);
  const currentSeasonId = latestSeasonId(seasonResults, previous);

  return [...clubs]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((club) => buildPulse(club, resultByClub.get(club.id), currentSeasonId, previous));
};
