import { describe, expect, it } from 'vitest';
import type { CareerLedgerEntryV2, HealthState, TrainingPlan } from '@football/contracts';
import { buildTrainingFeedback } from '../../src/career/training-feedback';

const plan: TrainingPlan = { focus: 'technical', intensity: 'normal', positionFocus: null };

const health = (overrides: Partial<HealthState> = {}): HealthState => ({
  fitness: 80,
  fatigue: 12,
  recentLoad: 20,
  activeInjury: null,
  previousInjuries: [],
  ...overrides,
});

const trainingFact = (weekKey: string, totalLoad = 48): CareerLedgerEntryV2 => ({
  id: `training-${weekKey}`,
  weekKey,
  type: 'training',
  summary: 'technical/normal，周负荷 48',
  participantIds: [],
  trainingContext: {
    focus: 'technical',
    intensity: 'normal',
    trainingLoad: 36,
    totalLoad,
  },
});

const matchFact = (
  id: string,
  played: boolean,
  minutesPlayed: number,
  rating: number | null,
): CareerLedgerEntryV2 => ({
  id,
  weekKey: id,
  type: 'match',
  summary: '比赛记录',
  participantIds: [],
  matchContext: {
    opponentStrength: 60,
    isHome: true,
    played,
    minutesPlayed,
    rating,
    goals: 0,
    assists: 0,
  },
});

describe('buildTrainingFeedback', () => {
  it('aggregates actual training, health, growth and match facts', () => {
    const feedback = buildTrainingFeedback({
      plan,
      facts: [
        trainingFact('2024-W02'),
        trainingFact('2024-W03'),
        trainingFact('2024-W04'),
        trainingFact('2024-W05'),
        matchFact('match-1', true, 68, 7.1),
        matchFact('match-2', true, 70, 7.3),
      ],
      startHealth: health(),
      endHealth: health({ fitness: 74, fatigue: 27, recentLoad: 48 }),
      attributeChanges: [{ attribute: 'passing', oldValue: 62, newValue: 63 }],
    });

    expect(feedback).toEqual(
      expect.objectContaining({
        trainingWeeks: 4,
        totalTrainingLoad: 144,
        averageTrainingLoad: 36,
        totalLoad: 192,
        fitness: { before: 80, after: 74, delta: -6 },
        fatigue: { before: 12, after: 27, delta: 15 },
        attributeChanges: [{ attribute: 'passing', oldValue: 62, newValue: 63 }],
        matches: {
          appearances: 2,
          minutes: 138,
          averageRating: 7.2,
          status: 'positive',
        },
      }),
    );
    expect(feedback?.health.status).toBe('none');
    expect(feedback?.conclusion).toContain('技术');
  });

  it('marks fatigue, injury and no-appearance outcomes without inventing match data', () => {
    const fatigue = buildTrainingFeedback({
      plan,
      facts: [trainingFact('2024-W02', 72), matchFact('match-1', true, 45, 6)],
      startHealth: health(),
      endHealth: health({ fitness: 61, fatigue: 68, recentLoad: 72 }),
      attributeChanges: [],
    });
    const injury = buildTrainingFeedback({
      plan,
      facts: [trainingFact('2024-W02'), matchFact('match-1', false, 0, null)],
      startHealth: health(),
      endHealth: health({
        activeInjury: {
          id: 'injury-1',
          kind: 'minor',
          bodyArea: '右脚踝',
          occurredWeek: '2024-W02',
          expectedRecoveryWeeks: 2,
          recoveredWeeks: 1,
          recurrenceRisk: 0.1,
        },
      }),
      attributeChanges: [],
    });
    const noAppearance = buildTrainingFeedback({
      plan,
      facts: [trainingFact('2024-W02'), matchFact('match-1', false, 0, null)],
      startHealth: health(),
      endHealth: health(),
      attributeChanges: [],
    });

    expect(fatigue?.matches.status).toBe('fatigue-limited');
    expect(injury?.health).toEqual({
      status: 'active',
      bodyArea: '右脚踝',
      expectedRecoveryWeeks: 2,
    });
    expect(injury?.matches).toEqual({
      appearances: 0,
      minutes: 0,
      averageRating: null,
      status: 'injury-limited',
    });
    expect(noAppearance?.matches.status).toBe('no-appearance');
  });

  it('returns null for legacy facts and remains deterministic', () => {
    const input = {
      plan,
      facts: [{ ...trainingFact('2024-W02'), trainingContext: undefined }],
      startHealth: health(),
      endHealth: health(),
      attributeChanges: [],
    };

    expect(buildTrainingFeedback(input)).toBeNull();
    expect(buildTrainingFeedback({ ...input, facts: [trainingFact('2024-W02')] })).toEqual(
      buildTrainingFeedback({ ...input, facts: [trainingFact('2024-W02')] }),
    );
  });
});
