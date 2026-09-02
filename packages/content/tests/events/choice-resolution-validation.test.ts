import { describe, expect, it } from 'vitest';
import type { YouthContentBundle } from '@football/contracts';
import { getYouthContent } from '../../src';
import { validateYouthContent } from '../../src/validation/validate-content';

describe('choice resolution content validation', () => {
  it('validates effects inside authored outcomes', () => {
    const invalid = structuredClone(getYouthContent()) as YouthContentBundle;
    const choice = invalid.events
      .find(({ id }) => id === 'misunderstanding-clarification')!
      .choices.find(({ id }) => id === 'clarify')!;
    choice.resolution!.outcomes.failure.effects.notARealEffect = 1;

    expect(() => validateYouthContent(invalid)).toThrow('未知事件效果');
  });
});
