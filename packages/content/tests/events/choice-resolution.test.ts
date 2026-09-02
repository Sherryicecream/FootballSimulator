import { describe, expect, it } from 'vitest';
import { getYouthEvents } from '../../src/events/youth-events';

describe('authored choice resolutions', () => {
  it('gives the misunderstanding clarification choice three authored outcomes', () => {
    const event = getYouthEvents().find(({ id }) => id === 'misunderstanding-clarification');
    const resolution = event?.choices.find(({ id }) => id === 'clarify')?.resolution;

    expect(resolution?.outcomes.success.label).toBe('沟通奏效');
    expect(resolution?.outcomes.partial.label).toBe('误会缓和');
    expect(resolution?.outcomes.failure.label).toBe('解释被误解');
  });
});
