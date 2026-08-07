import { type CareerSave, type EventDefinition } from '@football/contracts';
import { advanceCareerWeek, createSeededRandomSource } from '@football/simulation';
import { projectWeekResult } from './project-week-result';

/**
 * Creates an advance career week use case factory.
 * Validates the save has no pending events, then advances one week.
 * Accepts optional event definitions for narrative event selection.
 */
export function createAdvanceCareerWeek(events?: EventDefinition[]) {
  return (save: CareerSave): CareerSave => {
    if (save.context.pendingEvent) {
      throw new Error('存档有未处理的事件，无法推进周');
    }

    const rng = createSeededRandomSource(save.randomState.seed + save.world.weekNumber);
    const result = advanceCareerWeek(save, rng, events);

    return projectWeekResult(save, result, rng.getPosition());
  };
}
