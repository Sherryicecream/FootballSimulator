import type { CareerSaveV5Like, NationalTeam } from '@football/contracts';
import type { SeededRandomSource } from '../randomness';

/** 国家队资格（设计 §7）：年龄 ≤35、声望 ≥60、上季联赛出场 ≥15。 */
export const isEligibleForNationalTeam = (save: CareerSaveV5Like): boolean => {
  if (save.player.age > 35) return false;
  // 声望经济 v2 后国家队门槛同步下调（M7 设计 §7 修订：60 → 56）。
  if (save.player.reputation < 56) return false;
  if (save.proSeasonStats.leagueAppearances < 15) return false;
  return true;
};

export interface NationalTeamAccrual {
  nationalTeam: NationalTeam;
  reputationDelta: number;
  factSummary: string;
}

/** 逐季国家队累计：caps 按声望档位 3/5/8 ± 波动，进球按出场二项抽样（单场 0.25）。 */
export const accrueNationalTeam = (
  save: CareerSaveV5Like,
  rng: SeededRandomSource,
): NationalTeamAccrual | null => {
  if (!isEligibleForNationalTeam(save)) return null;
  const reputation = save.player.reputation;
  const base = reputation >= 80 ? 8 : reputation >= 70 ? 5 : 3;
  const caps = Math.max(1, base + Math.floor(rng.next() * 3) - 1);
  let goals = 0;
  for (let i = 0; i < caps; i += 1) {
    if (rng.next() < 0.25) goals += 1;
  }
  const reputationDelta = reputation >= 80 ? 3 : reputation >= 70 ? 2 : 1;
  const previous = save.nationalTeam;
  const nationalTeam: NationalTeam = {
    capped: true,
    caps: (previous?.caps ?? 0) + caps,
    goals: (previous?.goals ?? 0) + goals,
    debutOn: previous?.debutOn ?? save.proSeason?.endDate ?? null,
  };
  const summary = previous?.caps
    ? `国家队窗口：出场 ${caps} 次，进球 ${goals} 个（累计 ${nationalTeam.caps} 场 ${nationalTeam.goals} 球）。`
    : `国家队首秀：本窗口出场 ${caps} 次，打进 ${goals} 球。`;
  return { nationalTeam, reputationDelta, factSummary: summary };
};
