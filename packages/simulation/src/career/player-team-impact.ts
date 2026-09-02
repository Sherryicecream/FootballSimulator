import type { CareerSaveV4Like } from '@football/contracts';

export type PlayerTeamSelection = {
  appearance: 'starter' | 'bench' | 'reserve' | 'unavailable';
  minutes: number;
};

/** 将球员能力与当下状态换算成窄幅球队强度修正。 */
export const calculatePlayerTeamImpact = (
  save: CareerSaveV4Like,
  health: CareerSaveV4Like['health'],
  selection: PlayerTeamSelection,
  opponentStrength: number,
): number => {
  if (
    health.activeInjury ||
    selection.minutes <= 0 ||
    (selection.appearance !== 'starter' && selection.appearance !== 'bench')
  ) {
    return 0;
  }

  const ability = weightedPlayerAbility(save);
  const opponentAdjustment = Math.min(100, Math.max(0, opponentStrength));
  const rawImpact =
    (ability - 60) * 0.12 +
    (save.currentState.form - 50) * 0.04 +
    (save.currentState.confidence - 50) * 0.03 +
    (health.fitness - 70) * 0.02 -
    health.fatigue * 0.03 +
    (save.clubContext.coachEvaluation - 50) * 0.02 -
    (opponentAdjustment - 55) * 0.04;
  const minuteFactor = Math.min(1, selection.minutes / 90);
  return Math.max(-4, Math.min(4, Math.round(rawImpact * minuteFactor)));
};

const weightedPlayerAbility = (save: CareerSaveV4Like): number => {
  const { technical, physical, mental } = save.player.attributes;
  const values = [
    ...Object.values(technical),
    ...Object.values(physical),
    ...Object.values(mental),
  ];
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};
