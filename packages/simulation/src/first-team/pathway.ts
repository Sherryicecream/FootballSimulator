import type { CareerLedgerEntryV2, CareerSaveV2Like, FirstTeamStage } from '@football/contracts';
import type { SeededRandomSource } from '../randomness';

export interface FirstTeamPathwayResult {
  previousStage: FirstTeamStage;
  nextStage: FirstTeamStage;
  facts: CareerLedgerEntryV2[];
}

const stages: FirstTeamStage[] = [
  'none',
  'watchlist',
  'training-invite',
  'bench-list',
  'substitute-appearance',
  'starting-appearance',
];

export const advanceFirstTeamPathway = (
  save: CareerSaveV2Like,
  rng: SeededRandomSource,
): FirstTeamPathwayResult => {
  const previousStage = save.clubContext.firstTeamStage;
  const index = stages.indexOf(previousStage);
  if (
    index < 0 ||
    index === stages.length - 1 ||
    !qualifies(save, index) ||
    rng.next() > chance(index)
  ) {
    return { previousStage, nextStage: previousStage, facts: [] };
  }
  const nextStage = stages[index + 1]!;
  return {
    previousStage,
    nextStage,
    facts: [
      {
        id: `first-team-${nextStage}-${save.season.currentWeek}`,
        weekKey: `${save.season.startDate.slice(0, 4)}-W${String(save.season.currentWeek).padStart(2, '0')}`,
        type: 'first-team',
        summary: `一线队路径从 ${previousStage} 推进至 ${nextStage}`,
        participantIds: coachIds(save),
      },
    ],
  };
};

const qualifies = (save: CareerSaveV2Like, stageIndex: number): boolean => {
  const evaluationThreshold = [50, 57, 64, 72, 82][stageIndex] ?? 100;
  const formThreshold = [55, 58, 62, 68, 75][stageIndex] ?? 100;
  return (
    save.clubContext.coachEvaluation >= evaluationThreshold &&
    save.currentState.form >= formThreshold &&
    save.health.fitness >= 70 &&
    save.health.fatigue <= 50 &&
    save.health.activeInjury === null
  );
};

const chance = (stageIndex: number): number => [0.03, 0.55, 0.45, 0.28, 0.05][stageIndex] ?? 0;
const coachIds = (save: CareerSaveV2Like) =>
  save.relationships.persons.filter(({ role }) => role.includes('coach')).map(({ id }) => id);
