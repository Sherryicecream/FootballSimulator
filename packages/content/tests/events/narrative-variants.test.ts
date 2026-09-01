import { describe, expect, it } from 'vitest';
import { getYouthContent, validateYouthContent } from '../../src';

describe('authored narrative variants', () => {
  it('provides multiple coherent responses for the misunderstanding choice', () => {
    const content = getYouthContent();
    const event = content.events.find(({ id }) => id === 'misunderstanding-clarification');
    const choice = event?.choices.find(({ id }) => id === 'clarify');

    expect(choice?.narrativeVariants).toHaveLength(2);
    expect(
      choice?.narrativeVariants?.every(
        ({ response, followUp }) => response.length > 0 && followUp.length > 0,
      ),
    ).toBe(true);
    expect(validateYouthContent(content).events).toContainEqual(event);
  });
});
