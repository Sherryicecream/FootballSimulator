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

  it('rejects response roles that are not declared by the event', () => {
    const invalid = structuredClone(getYouthContent()) as YouthContentBundle;
    const event = invalid.events.find(({ id }) => id === 'misunderstanding-clarification')!;
    const choice = event.choices.find(({ id }) => id === 'clarify')!;
    choice.responses = [{ speakerRole: 'rival', text: '这条回应不属于当前事件的人物。' }];

    expect(() => validateYouthContent(invalid)).toThrow('参与角色');
  });

  it('accepts response roles declared by the event', () => {
    expect(() => validateYouthContent(getYouthContent())).not.toThrow();
  });
});
