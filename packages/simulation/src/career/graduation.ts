import type {
  CareerSaveV3,
  EligibilityCriterion,
  FirstTeamStage,
  PlayerAttributes,
  YouthAcademyProfile,
} from '@football/contracts';
import { deriveDevelopmentSignals } from './development-signals';

/** 各位置的关键属性权重；未列出的属性权重为 0。 */
const POSITION_WEIGHTS: Record<string, Partial<Record<AttributePath, number>>> = {
  CENTER_BACK: {
    'technical.defending': 3,
    'technical.aerialAbility': 3,
    'physical.strength': 2,
    'mental.decision': 2,
    'mental.composure': 1,
    'physical.pace': 1,
  },
  FULL_BACK: {
    'technical.defending': 2,
    'physical.pace': 3,
    'physical.stamina': 2,
    'technical.passing': 2,
    'mental.discipline': 1,
  },
  DEFENSIVE_MIDFIELDER: {
    'technical.defending': 2,
    'technical.passing': 2,
    'mental.decision': 3,
    'physical.stamina': 2,
    'mental.composure': 1,
  },
  MIDFIELDER: {
    'technical.passing': 3,
    'technical.firstTouch': 2,
    'mental.vision': 3,
    'physical.stamina': 2,
    'mental.decision': 2,
  },
  WINGER: {
    'technical.dribbling': 3,
    'physical.pace': 3,
    'technical.shooting': 2,
    'technical.firstTouch': 1,
    'mental.offTheBall': 2,
  },
  FORWARD: {
    'technical.shooting': 3,
    'technical.firstTouch': 2,
    'physical.pace': 2,
    'mental.offTheBall': 2,
    'technical.dribbling': 2,
    'mental.composure': 1,
  },
};

type AttributePath =
  | `technical.${keyof PlayerAttributes['technical']}`
  | `physical.${keyof PlayerAttributes['physical']}`
  | `mental.${keyof PlayerAttributes['mental']}`;

const STAGE_ORDER: FirstTeamStage[] = [
  'none',
  'watchlist',
  'training-invite',
  'bench-list',
  'substitute-appearance',
  'starting-appearance',
];

export const weightedAbility = (position: string, attributes: PlayerAttributes): number => {
  const weights = POSITION_WEIGHTS[position] ?? POSITION_WEIGHTS.MIDFIELDER!;
  let total = 0;
  let weightSum = 0;
  for (const [path, weight] of Object.entries(weights) as [AttributePath, number][]) {
    if (weight <= 0) continue;
    const [group, key] = path.split('.') as ['technical' | 'physical' | 'mental', string];
    total += attributes[group][key as never] * weight;
    weightSum += weight;
  }
  return weightSum === 0 ? 0 : Math.round(total / weightSum);
};

export const graduationAbilityThreshold = (
  academy: YouthAcademyProfile,
  age: number,
  graduationPressure: number,
): number => {
  let threshold = academy.competitionLevel + 8;
  if (age > 19) threshold -= 2;
  if (graduationPressure >= 2) threshold -= 4;
  return threshold;
};

export interface GraduationEvaluation {
  eligible: boolean;
  report: EligibilityCriterion[];
}

export const evaluateGraduationEligibility = (
  save: CareerSaveV3,
  academy: YouthAcademyProfile,
): GraduationEvaluation => {
  const age = save.player.age;
  const ability = weightedAbility(save.player.identity.primaryPosition, save.player.attributes);
  const threshold = graduationAbilityThreshold(academy, age, save.graduationPressure);
  const signals = deriveDevelopmentSignals(save);
  const positiveSignals = ['rapid-development', 'steady-progress', 'first-team-radar'];
  const hasPositive = signals.some((signal) => positiveSignals.includes(signal));
  const blocked = signals.includes('stalled-development') && signals.includes('injury-setback');
  const stageRank = STAGE_ORDER.indexOf(save.clubContext.firstTeamStage);

  const report: EligibilityCriterion[] = [
    { criterion: '年龄达标', met: age >= 17 },
    { criterion: '能力达标', met: ability >= threshold },
    { criterion: '发展信号达标', met: hasPositive && !blocked },
    {
      criterion: '一线队或教练认可',
      met: stageRank >= STAGE_ORDER.indexOf('watchlist') || save.clubContext.coachEvaluation >= 65,
    },
  ];
  return { eligible: report.every(({ met }) => met), report };
};
