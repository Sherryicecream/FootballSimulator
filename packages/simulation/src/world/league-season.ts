import { type LeagueStanding } from '@football/contracts';

export function createLeagueStandings(clubIds: string[]): LeagueStanding[] {
  return clubIds.map((clubId) => ({
    clubId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
}

export function updateStandings(
  standings: LeagueStanding[],
  homeClubId: string,
  awayClubId: string,
  homeScore: number,
  awayScore: number,
): LeagueStanding[] {
  return standings.map((s) => {
    if (s.clubId === homeClubId) {
      return updateStanding(s, homeScore, awayScore, homeScore > awayScore);
    }
    if (s.clubId === awayClubId) {
      return updateStanding(s, awayScore, homeScore, awayScore > homeScore);
    }
    return { ...s };
  });
}

function updateStanding(
  standing: LeagueStanding,
  goalsFor: number,
  goalsAgainst: number,
  isWin: boolean,
): LeagueStanding {
  const isDraw = goalsFor === goalsAgainst;
  return {
    ...standing,
    played: standing.played + 1,
    won: isWin ? standing.won + 1 : standing.won,
    drawn: isDraw ? standing.drawn + 1 : standing.drawn,
    lost: !isWin && !isDraw ? standing.lost + 1 : standing.lost,
    goalsFor: standing.goalsFor + goalsFor,
    goalsAgainst: standing.goalsAgainst + goalsAgainst,
    points: standing.points + (isWin ? 3 : isDraw ? 1 : 0),
  };
}

export function getStandings(standings: LeagueStanding[]): LeagueStanding[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}
