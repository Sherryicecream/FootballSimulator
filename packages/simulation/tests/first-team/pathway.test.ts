import { describe, expect, it } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness';
import { advanceFirstTeamPathway } from '../../src/first-team/pathway';
import { createYouthSave } from '../fixtures/youth-save';

describe('advanceFirstTeamPathway', () => {
  it('can advance at most one stage at a time', () => {
    const save = createYouthSave({
      clubContext: {
        ...createYouthSave().clubContext,
        coachEvaluation: 90,
        firstTeamStage: 'none',
      },
      currentState: { morale: 80, form: 90, confidence: 85 },
      health: { ...createYouthSave().health, fitness: 95, fatigue: 5 },
    });
    const result = advanceFirstTeamPathway(save, createSeededRandomSource(1));
    expect(['none', 'watchlist']).toContain(result.nextStage);
    expect(result.nextStage).not.toBe('training-invite');
  });

  it('does not regress or release a player after one poor performance', () => {
    const save = createYouthSave({
      clubContext: {
        ...createYouthSave().clubContext,
        coachEvaluation: 65,
        firstTeamStage: 'training-invite',
      },
      currentState: { morale: 45, form: 35, confidence: 42 },
      ledger: [
        {
          id: 'one-bad-match',
          weekKey: '2024-W02',
          type: 'match',
          summary: '单场表现不佳',
          participantIds: [],
        },
      ],
    });
    const result = advanceFirstTeamPathway(save, createSeededRandomSource(9));
    expect(result.nextStage).toBe('training-invite');
  });
});
