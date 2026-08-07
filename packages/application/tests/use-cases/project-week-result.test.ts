import { describe, expect, it } from 'vitest';
import type { WeeklyAdvanceResult } from '@football/contracts';
import { createCareerSave } from '../../src/use-cases/start-career';
import { projectWeekResult } from '../../src/use-cases/project-week-result';

const createSave = () =>
  createCareerSave({
    playerName: '林岳',
    hometown: '上海',
    primaryPosition: 'CENTER_BACK',
    preferredFoot: 'RIGHT',
    weakFootLevel: 30,
    growthBackground: 'academy',
    personalityTendency: 'composed',
    regionId: 'shanghai',
    seed: 42,
  });

describe('projectWeekResult', () => {
  it('projects the last state change and the complete week metadata', () => {
    const save = createSave();
    const result: WeeklyAdvanceResult = {
      date: '2024-09-08',
      week: 2,
      season: 2024,
      activity: 'quiet',
      trainingSummary: null,
      matchResult: null,
      event: null,
      stateChanges: [
        { key: 'fitness', oldValue: 70, newValue: 62 },
        { key: 'fitness', oldValue: 62, newValue: 68 },
        { key: 'fatigue', oldValue: 5, newValue: 9 },
        { key: 'fatigue', oldValue: 9, newValue: 7 },
      ],
      hasPendingChoice: false,
      eventCooldowns: { 'coach-praise': 2 },
    };

    const projected = projectWeekResult(save, result, 17);

    expect(projected.context.playerState.fitness).toBe(68);
    expect(projected.context.playerState.fatigue).toBe(7);
    expect(projected.story.cooldowns).toEqual({ 'coach-praise': 2 });
    expect(projected.randomState.sequencePosition).toBe(17);
    expect(projected.ledger.at(-1)).toEqual({
      type: 'week-advanced',
      date: '2024-09-08',
      week: 2,
    });
  });
});
