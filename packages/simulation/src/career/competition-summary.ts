import type { ProFixture } from '@football/contracts';

/** 只统计指定俱乐部已经踢完、且确实涉及本队的赛事。 */
export const countClubFixtures = (fixtures: readonly ProFixture[], clubId: string): number =>
  fixtures.filter(
    ({ status, homeClubId, awayClubId }) =>
      status === 'played' && (homeClubId === clubId || awayClubId === clubId),
  ).length;
