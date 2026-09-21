import type {
  ContinentalClubInput,
  ContinentalFederation,
  ContinentalParticipant,
  ContinentalQuota,
  WorldClubPulse,
} from '@football/contracts';

const FEDERATION_COUNTRIES: Record<ContinentalFederation, readonly string[]> = {
  uefa: ['england', 'france', 'germany', 'italy', 'spain'],
  afc: ['china', 'japan', 'korea'],
};

const byLeagueRank = (left: ContinentalClubInput, right: ContinentalClubInput): number =>
  right.tier - left.tier ||
  left.finalRank - right.finalRank ||
  left.clubId.localeCompare(right.clubId);

const recentAppearanceCount = (
  clubId: string,
  seasonPulses: readonly WorldClubPulse[],
  recentHistory: readonly WorldClubPulse[],
): number =>
  Math.max(
    0,
    ...[...seasonPulses, ...recentHistory]
      .filter((pulse) => pulse.clubId === clubId)
      .map(({ continentalAppearancesLast3 }) => continentalAppearancesLast3),
  );

const qualificationScore = (club: ContinentalClubInput, appearances: number): number => {
  const rankScore = Math.max(0, 13 - club.finalRank) * 10;
  const tierScore = Math.max(0, 11 - club.tier) * 2;
  const cupBonus = club.cupWinner ? 18 : 0;
  const recentPenalty = appearances >= 2 ? Math.min(15, appearances * 4) : 0;
  return rankScore + club.points + tierScore + cupBonus - recentPenalty;
};

const byQualificationScore = (
  left: ContinentalClubInput,
  right: ContinentalClubInput,
  seasonPulses: readonly WorldClubPulse[],
  recentHistory: readonly WorldClubPulse[],
): number => {
  const scoreDifference =
    qualificationScore(right, recentAppearanceCount(right.clubId, seasonPulses, recentHistory)) -
    qualificationScore(left, recentAppearanceCount(left.clubId, seasonPulses, recentHistory));
  return scoreDifference || left.clubId.localeCompare(right.clubId);
};

const participant = (
  club: ContinentalClubInput,
  federation: ContinentalFederation,
  stage: ContinentalParticipant['stage'],
  reason: ContinentalParticipant['reason'],
): ContinentalParticipant => ({
  clubId: club.clubId,
  country: club.country,
  federation,
  stage,
  reason,
});

/**
 * Selects one country's direct and qualifying places. Repetition is a soft
 * score adjustment; domestic champions and cup winners remain eligible.
 */
export const selectContinentalParticipants = ({
  federation,
  clubs,
  seasonPulses,
  recentHistory,
  quota,
}: {
  federation: ContinentalFederation;
  clubs: readonly ContinentalClubInput[];
  seasonPulses: readonly WorldClubPulse[];
  recentHistory: readonly WorldClubPulse[];
  quota: ContinentalQuota;
}): ContinentalParticipant[] => {
  const legalCountries = new Set(FEDERATION_COUNTRIES[federation]);
  const byCountry = new Map<string, ContinentalClubInput[]>();
  for (const club of clubs) {
    if (!legalCountries.has(club.country)) continue;
    const current = byCountry.get(club.country) ?? [];
    current.push(club);
    byCountry.set(club.country, current);
  }

  const result: ContinentalParticipant[] = [];
  for (const country of [...byCountry.keys()].sort()) {
    const countryClubs = [...byCountry.get(country)!].sort(byLeagueRank);
    const directClubs = countryClubs.slice(0, quota.directPerCountry);
    const directIds = new Set(directClubs.map(({ clubId }) => clubId));
    for (const club of directClubs) {
      result.push(
        participant(
          club,
          federation,
          'direct',
          club.finalRank === 1 ? 'league-champion' : 'league-rank',
        ),
      );
    }

    const qualifyingClubs = countryClubs
      .filter(({ clubId }) => !directIds.has(clubId))
      .sort((left, right) => {
        if (left.cupWinner !== right.cupWinner) return left.cupWinner ? -1 : 1;
        // A qualifying place belongs to the active league tier first; rank,
        // points and soft anti-repeat rules decide only within that tier.
        if (left.tier !== right.tier) return right.tier - left.tier;
        return byQualificationScore(left, right, seasonPulses, recentHistory);
      })
      .slice(0, quota.qualifyingPerCountry);
    for (const club of qualifyingClubs) {
      result.push(
        participant(club, federation, 'qualifying', club.cupWinner ? 'cup-winner' : 'coefficient'),
      );
    }
  }
  return result;
};
