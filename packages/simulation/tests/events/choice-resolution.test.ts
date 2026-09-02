import { describe, expect, it } from 'vitest';
import type { EventChoice } from '@football/contracts';
import { resolveChoiceOutcome } from '../../src/events/choice-resolution';
import { createYouthSave } from '../fixtures/youth-save';

const choice: EventChoice = {
  id: 'clarify',
  text: '当面澄清误会',
  riskLabel: 'medium',
  effects: {},
  resolution: {
    attribute: 'decision',
    difficulty: 58,
    volatility: 7,
    stateModifiers: { confidence: 0.2, fatigue: -0.1, coachTrust: 0.15 },
    outcomes: {
      success: { label: '沟通奏效', effects: { coachTrust: 2 } },
      partial: { label: '误会缓和', effects: { coachTrust: 1 } },
      failure: { label: '解释被误解', effects: { coachTrust: -2 } },
    },
  },
};

const legacyChoice: EventChoice = {
  id: 'stay-quiet',
  text: '保持沉默',
  riskLabel: 'low',
  effects: { confidence: 1 },
};

describe('resolveChoiceOutcome', () => {
  it('is stable and does not advance the career random cursor', () => {
    const save = createYouthSave();
    const input = { save, choice, eventId: 'misunderstanding-clarification', seed: 42 };

    const first = resolveChoiceOutcome(input);
    const second = resolveChoiceOutcome(input);

    expect(second).toEqual(first);
    expect(save.randomState).toEqual({ seed: 42, sequencePosition: 0 });
  });

  it('makes stronger current decision ability improve the result', () => {
    const base = createYouthSave();
    const strong = resolveChoiceOutcome({
      save: withDecision(base, 80),
      choice,
      eventId: 'misunderstanding-clarification',
      seed: 42,
    });
    const weak = resolveChoiceOutcome({
      save: withDecision(base, 35),
      choice,
      eventId: 'misunderstanding-clarification',
      seed: 42,
    });

    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.outcome).toBe('success');
    expect(weak.outcome).toBe('failure');
  });

  it('uses the static effect path for legacy choices', () => {
    const result = resolveChoiceOutcome({
      save: createYouthSave(),
      choice: legacyChoice,
      eventId: 'legacy-event',
      seed: 42,
    });

    expect(result.outcome).toBe('legacy');
    expect(result.effects).toEqual({ confidence: 1 });
    expect(result.summary).toBeNull();
  });
});

const withDecision = (save: ReturnType<typeof createYouthSave>, decision: number) => ({
  ...save,
  player: {
    ...save.player,
    attributes: {
      ...save.player.attributes,
      mental: { ...save.player.attributes.mental, decision },
    },
  },
});
