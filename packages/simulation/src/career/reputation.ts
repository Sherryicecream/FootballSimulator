export interface ReputationGainInput {
  current: number;
  delta: number;
}

const REPUTATION_CEILING = 100;

/**
 * 声望衰减带（设计 §6 声望经济 v2）：
 * <45 全额；45–59 ×0.6；60–74 ×0.45；≥75 ×0.15——顶部增益带摩擦，世界级保持稀缺。
 */
export const applyReputationGain = (current: number, delta: number): number => {
  if (delta <= 0 || current >= REPUTATION_CEILING) {
    return Math.round(Math.max(0, Math.min(REPUTATION_CEILING, current + delta)));
  }
  const factor = current >= 75 ? 0.15 : current >= 60 ? 0.45 : current >= 45 ? 0.6 : 1;
  return Math.round(Math.max(0, Math.min(REPUTATION_CEILING, current + delta * factor)));
};

/** 联赛层级声望系数：tier 8 为 1.0，每低一档 −0.06，上封顶 1.0、下限 0.4。 */
export const leagueTierFactor = (tier: number): number =>
  Math.max(0.4, Math.min(1, 1 - (8 - tier) * 0.06));
