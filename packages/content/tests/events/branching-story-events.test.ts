import { describe, expect, it } from 'vitest';
import { getYouthContent, validateYouthContent } from '../../src';

describe('branching story content', () => {
  it('contains reachable choice branches for selection pressure and recovery', () => {
    const content = getYouthContent();
    const events = content.events.filter(
      ({ id }) => id.startsWith('selection-bubble-') || id.startsWith('recovery-return-'),
    );
    const opening = content.events.find(({ id }) => id === 'selection-bubble-opening');
    const recovery = content.events.find(({ id }) => id === 'recovery-return-opening');

    expect(events).toHaveLength(6);
    expect(opening?.choices.map(({ nextEventIds }) => nextEventIds)).toEqual([
      ['selection-bubble-plan'],
      ['selection-bubble-test'],
    ]);
    expect(recovery?.choices.map(({ nextEventIds }) => nextEventIds)).toEqual([
      ['recovery-return-check'],
      ['recovery-return-setback'],
    ]);
    expect(validateYouthContent(content)).toEqual(content);
  });
});
