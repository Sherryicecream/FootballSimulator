import type { CareerLedgerEntryV2, CareerSaveV2, FirstTeamStage } from '@football/contracts';
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
  save: CareerSaveV2,
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

const qualifies = (save: CareerSaveV2, stageIndex: number): boolean => {
  const evaluationThreshold = [72, 76, 80, 84, 90][stageIndex] ?? 100;
  const formThreshold = [62, 65, 68, 72, 78][stageIndex] ?? 100;
  return (
    save.clubContext.coachEvaluation >= evaluationThreshold &&
    save.currentState.form >= formThreshold &&
    save.health.fitness >= 70 &&
    save.health.fatigue <= 50 &&
    save.health.activeInjury === null
  );
};

const chance = (stageIndex: number): number => [0.55, 0.4, 0.28, 0.13, 0.04][stageIndex] ?? 0;
const coachIds = (save: CareerSaveV2) =>
  save.relationships.persons.filter(({ role }) => role.includes('coach')).map(({ id }) => id);
