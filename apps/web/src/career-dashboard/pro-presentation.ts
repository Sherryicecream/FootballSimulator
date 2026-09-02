import type { LeagueStanding } from '@football/contracts';

/**
 * 职业积分榜展示排序；只负责把已持久化的战绩转成界面顺序，不参与模拟结算。
 */
export const sortProfessionalStandings = (standings: readonly LeagueStanding[]): LeagueStanding[] =>
  [...standings].sort((left, right) => {
    const leftGoalDifference = left.goalsFor - left.goalsAgainst;
    const rightGoalDifference = right.goalsFor - right.goalsAgainst;
    return (
      right.points - left.points ||
      rightGoalDifference - leftGoalDifference ||
      right.goalsFor - left.goalsFor ||
      left.clubId.localeCompare(right.clubId)
    );
  });

export const professionalLeagueRank = (
  standings: readonly LeagueStanding[],
  clubId: string,
): number | null => {
  const index = sortProfessionalStandings(standings).findIndex(
    (standing) => standing.clubId === clubId,
  );
  return index >= 0 ? index + 1 : null;
};
