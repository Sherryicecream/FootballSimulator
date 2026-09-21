import type {
  ContinentalClubResult,
  ContinentalParticipant,
  ContinentalSeasonSummary,
} from '@football/contracts';
import { createLeagueFixtures } from '../career/league-fixtures';

const stableHash = (value: string): number => {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
};

const factIdFor = (competitionId: string, seasonId: string, clubId: string): string =>
  `continental-${competitionId.slice(-12)}-${seasonId.slice(-16)}-${clubId.slice(-20)}`.slice(
    0,
    60,
  );

const resultFor = (
  participant: ContinentalParticipant,
  competitionId: string,
  seasonId: string,
  seed: number,
): ContinentalClubResult => {
  const value = stableHash(`${seed}:${competitionId}:${seasonId}:${participant.clubId}`);
  const wins = value % 4;
  const draws = (value >>> 4) % 3;
  const losses = Math.max(0, 4 - wins - draws);
  return {
    clubId: participant.clubId,
    stage: participant.stage === 'qualifying' ? 'qualifying' : 'main-stage',
    wins,
    draws,
    losses,
    points: wins * 3 + draws,
    honour: null,
    relatedFactId: factIdFor(competitionId, seasonId, participant.clubId),
  };
};

/** Simulates compact background results and expands only the player's fixtures. */
export const simulateContinentalSeason = ({
  competitionId,
  seasonId,
  participants,
  playerClubId,
  seed,
}: {
  competitionId: string;
  seasonId: string;
  participants: readonly ContinentalParticipant[];
  playerClubId: string | null;
  seed: number;
}): ContinentalSeasonSummary => {
  const sortedParticipants = [...participants].sort((left, right) =>
    left.clubId.localeCompare(right.clubId),
  );
  const results = sortedParticipants.map((entry) =>
    resultFor(entry, competitionId, seasonId, seed),
  );
  const best = [...results].sort(
    (left, right) => right.points - left.points || left.clubId.localeCompare(right.clubId),
  )[0];
  if (best) {
    const index = results.findIndex(({ clubId }) => clubId === best.clubId);
    results[index] = { ...best, stage: 'champion', honour: '洲际赛事冠军' };
  }

  const playerFixtures =
    playerClubId && sortedParticipants.some(({ clubId }) => clubId === playerClubId)
      ? createLeagueFixtures(
          sortedParticipants.map(({ clubId }) => clubId),
          competitionId,
          seed,
          seasonId.slice(0, 4),
        ).filter(
          ({ homeClubId, awayClubId }) =>
            homeClubId === playerClubId || awayClubId === playerClubId,
        )
      : null;

  return { competitionId, seasonId, participants: sortedParticipants, results, playerFixtures };
};
