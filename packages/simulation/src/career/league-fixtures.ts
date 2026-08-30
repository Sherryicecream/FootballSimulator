import type { ProFixture } from '@football/contracts';

/**
 * 同层联赛双循环赛程：n 家俱乐部产生 n×(n−1) 场，主客各一次；
 * 圆桌轮转法排轮次，种子决定队伍顺序；生成后立即固定写入存档。
 */
export const createLeagueFixtures = (
  clubIds: readonly string[],
  competitionId: string,
  seed: number,
  seasonYear: string,
): ProFixture[] => {
  if (clubIds.length < 4) throw new Error('联赛俱乐部数量不足');
  const teams = [...clubIds];
  // 确定性洗牌：种子决定主客与轮次顺序
  for (let i = teams.length - 1; i > 0; i -= 1) {
    const j = (seed * (i + 7) * 31 + i * 17) % (i + 1);
    [teams[i], teams[j]] = [teams[j]!, teams[i]!];
  }

  // 奇数队补一个轮空位，保证圆桌轮转覆盖全部配对
  const padded = teams.length % 2 === 0 ? teams : [...teams, '__bye__'];
  const n = padded.length;
  const rounds: Array<Array<[string, string]>> = [];
  const rotation = [...padded];
  for (let round = 0; round < n - 1; round += 1) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i += 1) {
      const home = rotation[i]!;
      const away = rotation[n - 1 - i]!;
      if (home === '__bye__' || away === '__bye__') continue;
      // 偶数轮交换主客，保证双循环主客平衡
      pairs.push(round % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(pairs);
    // 圆桌轮转：首队固定，其余顺时针旋转
    const fixed = rotation[0]!;
    const rest = rotation.slice(1);
    rest.unshift(rest.pop()!);
    rotation.splice(0, rotation.length, fixed, ...rest);
  }

  const fixtures: ProFixture[] = [];
  let index = 0;
  const totalWeeks = (n - 1) * 2;
  for (const [roundIdx, pairs] of rounds.entries()) {
    for (const [home, away] of pairs) {
      fixtures.push(makeFixture(index, competitionId, home, away, roundIdx + 2, seasonYear));
      index += 1;
    }
  }
  for (const [roundIdx, pairs] of rounds.entries()) {
    for (const [home, away] of pairs) {
      fixtures.push(
        makeFixture(index, competitionId, away, home, roundIdx + 2 + (n - 1), seasonYear),
      );
      index += 1;
    }
  }
  void totalWeeks;
  return fixtures;
};

const makeFixture = (
  index: number,
  competitionId: string,
  homeClubId: string,
  awayClubId: string,
  week: number,
  seasonYear: string,
): ProFixture => ({
  id: `${competitionId}-${index + 1}`,
  weekKey: `${seasonYear}-W${String(week).padStart(2, '0')}`,
  competitionId,
  homeClubId,
  awayClubId,
  status: 'scheduled' as const,
  resultId: null,
});
