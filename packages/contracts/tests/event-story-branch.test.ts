import { describe, expect, it } from 'vitest';
import { EventChoiceSchema } from '../src/event';

describe('choice-level story branches', () => {
  it('accepts a bounded list of next event ids', () => {
    const choice = EventChoiceSchema.parse({
      id: 'ask-plan',
      text: '询问训练计划',
      riskLabel: 'low',
      effects: {},
      nextEventIds: ['selection-bubble-plan'],
    });

    expect(choice.nextEventIds).toEqual(['selection-bubble-plan']);
    expect(() =>
      EventChoiceSchema.parse({ ...choice, nextEventIds: Array(9).fill('next') }),
    ).toThrow();
  });
});
