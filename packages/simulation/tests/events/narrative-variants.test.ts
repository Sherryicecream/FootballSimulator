import { describe, expect, it } from 'vitest';
import { EventChoiceSchema } from '@football/contracts';
import type {
  EventChoice,
  EventChoiceNarrativeVariant,
  YouthEventInstance,
} from '@football/contracts';
import { buildEventFeedback } from '../../src/events/event-feedback';
import { resolveChoiceOutcome } from '../../src/events/choice-resolution';
import { selectEventNarrativeVariant } from '../../src/events/narrative-variants';
import { createYouthSave } from '../fixtures/youth-save';

const variants: EventChoiceNarrativeVariant[] = [
  { response: '你先把事实讲清楚。', followUp: '训练会继续观察你们的沟通。' },
  { response: '你承认自己的表达不够清楚。', followUp: '下一次训练会重新检验默契。' },
];

const choice: EventChoice = {
  id: 'clarify',
  text: '当面澄清误会',
  riskLabel: 'medium',
  effects: {},
  narrativeVariants: variants,
};

const event: YouthEventInstance = {
  eventId: 'misunderstanding-clarification',
  title: '训练场上的误会',
  description: '一次沟通失误需要被说清楚。',
  choices: [choice],
  resolvedChoiceId: null,
  participantIds: [],
  factRefs: [],
  storyId: null,
  nextEventIds: [],
  interaction: 'decision',
};

describe('selectEventNarrativeVariant', () => {
  it('selects the same authored group for the same career key', () => {
    const key = { seed: 42, eventId: event.eventId, choiceId: choice.id };

    expect(selectEventNarrativeVariant(variants, key)).toEqual(
      selectEventNarrativeVariant(variants, key),
    );
  });

  it('uses the selected group in feedback without advancing simulation randomness', () => {
    const before = createYouthSave();
    const after = createYouthSave();
    const selected = selectEventNarrativeVariant(variants, {
      seed: before.randomState.seed,
      eventId: event.eventId,
      choiceId: choice.id,
    });

    const feedback = buildEventFeedback(before, after, event, choice);

    expect(feedback.narrativeVariantIndex).toBe(selected.index);
    expect(feedback.response).toBe(selected.variant.response);
    expect(feedback.resultTitle).toBe('事件暂告一段落');
    expect(feedback.resultTone).toBe('neutral');
    expect(feedback.followUp).toBe(selected.variant.followUp);
    expect(after.randomState).toEqual(before.randomState);
  });
  it('uses the selected authored outcome variant before the outcome label', () => {
    const base = createYouthSave();
    const before = {
      ...base,
      player: {
        ...base.player,
        attributes: {
          ...base.player.attributes,
          mental: { ...base.player.attributes.mental, decision: 80 },
        },
      },
    };
    const authoredChoice = EventChoiceSchema.parse({
      id: 'clarify-outcome',
      text: '当面澄清误会',
      riskLabel: 'medium',
      effects: {},
      resolution: {
        attribute: 'decision',
        difficulty: 40,
        volatility: 0,
        outcomes: {
          success: {
            label: '沟通判定成功',
            effects: {},
            narrativeVariants: [
              { response: '你把事实说清楚。', followUp: '教练认可了这次沟通。', resultTitle: '沟通奏效' },
              { response: '你用训练录像还原了误会。', followUp: '下一次训练会检验默契。', resultTitle: '误会已拆解' },
            ],
          },
          partial: {
            label: '沟通判定部分成功',
            effects: {},
            response: '误会暂时缓和。',
            followUp: '下一次配合仍需观察。',
          },
          failure: {
            label: '沟通判定失败',
            effects: {},
            response: '你的解释没有被完全理解。',
            followUp: '下一次训练需要用行动回应。',
          },
        },
      },
    });
    const outcome = resolveChoiceOutcome({
      save: before,
      choice: authoredChoice,
      eventId: event.eventId,
      seed: before.randomState.seed,
    });
    const selected = selectEventNarrativeVariant(outcome.narrativeVariants!, {
      seed: before.randomState.seed,
      eventId: event.eventId,
      choiceId: authoredChoice.id,
    });
    const feedback = buildEventFeedback(before, before, event, authoredChoice, outcome);

    expect(outcome.outcome).toBe('success');
    expect(feedback.resultTitle).toBe(selected.variant.resultTitle);
    expect(feedback.resultTone).toBe('success');
    expect(feedback.response).toBe(selected.variant.response);
  });
});
