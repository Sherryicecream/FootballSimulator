import { describe, expect, it } from 'vitest';
import { deriveDevelopmentSignals } from '../../src/career/development-signals';
import { createYouthSave } from '../fixtures/youth-save';

describe('deriveDevelopmentSignals', () => {
  it('derives temporary risk signals that disappear after the state improves', () => {
    const struggling = createYouthSave({
      health: { ...createYouthSave().health, fatigue: 82 },
      currentState: { morale: 28, form: 30, confidence: 25 },
      clubContext: { ...createYouthSave().clubContext, coachEvaluation: 24 },
      ledger: Array.from({ length: 4 }, (_, index) => ({
        id: `bad-${index}`,
        weekKey: `2024-W0${index + 1}`,
        type: 'training' as const,
        summary: '持续表现不佳，训练评价下降',
        participantIds: [],
      })),
    });
    expect(deriveDevelopmentSignals(struggling)).toEqual(
      expect.arrayContaining(['overtraining-risk', 'stalled-development', 'release-risk']),
    );

    const recovered = createYouthSave({
      health: { ...createYouthSave().health, fatigue: 20 },
      currentState: { morale: 60, form: 62, confidence: 60 },
      clubContext: { ...createYouthSave().clubContext, coachEvaluation: 60 },
    });
    expect(deriveDevelopmentSignals(recovered)).not.toContain('release-risk');
    expect(deriveDevelopmentSignals(recovered)).not.toContain('overtraining-risk');
  });
});
