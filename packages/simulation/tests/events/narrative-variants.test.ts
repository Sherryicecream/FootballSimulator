import { describe, expect, it } from 'vitest';
import type {
  EventChoice,
  EventChoiceNarrativeVariant,
  YouthEventInstance,
} from '@football/contracts';
import { buildEventFeedback } from '../../src/events/event-feedback';
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
    expect(feedback.followUp).toBe(selected.variant.followUp);
    expect(after.randomState).toEqual(before.randomState);
  });
});
