import type {
  CareerSaveV3Like,
  EligibilityCriterion,
  OffseasonBriefing,
  YouthAcademyProfile,
} from '@football/contracts';
import { deriveAge } from './simulate-youth-week';
import { evaluateGraduationEligibility } from './graduation';
import type { SeededRandomSource } from '../randomness';

export interface OffseasonSettlement<S = CareerSaveV3Like> {
  save: S;
  briefing: OffseasonBriefing;
  graduationEligible: boolean;
  eligibilityReport: EligibilityCriterion[];
}

const clampScore = (value: number) => Math.min(100, Math.max(0, value));

/**
 * 休赛期一次性结算：健康清算、体能重置、身体属性沉淀、年龄更新、
 * 声望雏形调整与毕业资格评估。纯确定性；结算顺序固定。
 */
export const evaluateOffseason = <S extends CareerSaveV3Like>(
  save: S,
  academy: YouthAcademyProfile,
  nextSeasonStart: string,
  rng: SeededRandomSource,
): OffseasonSettlement<S> => {
  const health = settleHealth(save, rng);
  const age = deriveAge(save.player.identity.dateOfBirth, nextSeasonStart);
  const ageUpdate = { from: save.player.age, to: age };
  const drift = settlePhysicalDrift(save, age, rng);
  const reputationChange = reputationDelta(save);
  const evaluation = evaluateGraduationEligibility(save, academy);

  const briefing: OffseasonBriefing = {
    healthClearance: health.clearance,
    attributeDrift: drift.changes,
    reputationChange,
    ageUpdate,
  };

  const nextSave: S = {
    ...save,
    careerPhase: 'offseason',
    player: {
      ...save.player,
      age,
      reputation: clampScore(save.player.reputation + reputationChange),
      attributes: drift.attributes,
    },
    health: health.state,
    offseason: {
      briefing,
      graduationEligible: evaluation.eligible,
      eligibilityReport: evaluation.report,
      nextSeasonStart,
    },
  };
  return {
    save: nextSave,
    briefing,
    graduationEligible: evaluation.eligible,
    eligibilityReport: evaluation.report,
  };
};

const settleHealth = (
  save: CareerSaveV3Like,
  rng: SeededRandomSource,
): { state: CareerSaveV3Like['health']; clearance: string } => {
  const injury = save.health.activeInjury;
  let nextInjury = injury;
  let clearance = '伤病全部痊愈，可以完整参加季前训练';
  if (injury) {
    if (injury.kind === 'discomfort' || injury.kind === 'minor') {
      nextInjury = null;
      clearance = `${injury.bodyArea}${injury.kind === 'discomfort' ? '轻微不适' : '小伤'}已痊愈`;
    } else if (injury.kind === 'moderate') {
      const remaining = Math.max(0, injury.expectedRecoveryWeeks - injury.recoveredWeeks);
      const carried = Math.ceil(remaining / 2);
      if (carried > 0) {
        nextInjury = { ...injury, expectedRecoveryWeeks: carried, recoveredWeeks: 0 };
        clearance = `${injury.bodyArea}中等伤病恢复期跨季，剩余 ${carried} 周带入新赛季`;
      } else {
        nextInjury = null;
        clearance = `${injury.bodyArea}中等伤病已痊愈`;
      }
    } else {
      nextInjury = null;
      clearance = `${injury.bodyArea}严重伤病已痊愈，复发风险上升，需要循序渐进`;
    }
  }
  const previousInjuries = [...save.health.previousInjuries];
  if (injury && !nextInjury) {
    previousInjuries.push(
      injury.kind === 'severe'
        ? { ...injury, recurrenceRisk: Math.min(1, injury.recurrenceRisk + 0.05) }
        : injury,
    );
  }
  const fitness = 88 + Math.floor(rng.next() * 9);
  return {
    state: {
      fitness,
      fatigue: 0,
      recentLoad: 0,
      activeInjury: nextInjury,
      previousInjuries,
    },
    clearance,
  };
};

const settlePhysicalDrift = (
  save: CareerSaveV3Like,
  newAge: number,
  rng: SeededRandomSource,
): {
  attributes: CareerSaveV3Like['player']['attributes'];
  changes: OffseasonBriefing['attributeDrift'];
} => {
  const driftChance = 0.6 + (save.player.development.maturationPace === 'early' ? 0.1 : 0);
  const applies = newAge >= 17 && newAge <= 20;
  const physical = { ...save.player.attributes.physical };
  const changes: OffseasonBriefing['attributeDrift'] = [];
  for (const key of ['pace', 'stamina'] as const) {
    if (!applies || rng.next() >= driftChance) continue;
    const oldValue = physical[key];
    const newValue = clampScore(oldValue + 1);
    if (newValue !== oldValue) {
      physical[key] = newValue;
      changes.push({ attribute: key, oldValue, newValue });
    }
  }
  return { attributes: { ...save.player.attributes, physical }, changes };
};

const reputationDelta = (save: CareerSaveV3Like): number => {
  let delta = 0;
  const { ratingSum, ratingCount, goals, assists } = save.seasonStats;
  if (ratingCount > 0) {
    const avg = ratingSum / ratingCount;
    if (avg >= 7.2) delta += 3;
    else if (avg >= 6.8) delta += 1;
    else if (avg < 6.0) delta -= 2;
  }
  const stage = save.clubContext.firstTeamStage;
  if (stage === 'substitute-appearance' || stage === 'starting-appearance') delta += 2;
  if (goals + assists >= 8) delta += 2;
  return delta;
};
