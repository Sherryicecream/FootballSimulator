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
  it('requires complete three-way result branches for the first ten events', () => {
    const content = getYouthContent();
    const targetIds = [
      'misunderstanding-clarification',
      'misunderstanding-repair',
      'costly-match-mistake',
      'technical-plateau',
      'recovery-session-warning',
      'return-to-full-training',
      'position-race-opening',
      'position-race-review',
      'coach-trust-opening',
      'coach-trust-test',
    ];
    const targetEvents = content.events.filter(({ id }) => targetIds.includes(id));

    expect(targetEvents).toHaveLength(targetIds.length);
    for (const event of targetEvents) {
      const declaredRoles = new Set(event.participantRoles ?? []);
      for (const choice of event.choices) {
        const outcomes = choice.resolution?.outcomes;
        expect(outcomes, `${event.id}.${choice.id} 缺少三档结果`).toBeDefined();
        if (!outcomes) continue;
        const branches = [outcomes.success, outcomes.partial, outcomes.failure];
        expect(new Set(branches.map(({ label }) => label)).size).toBe(3);
        for (const branch of branches) {
          expect(branch.response).toBeTruthy();
          expect(branch.followUp).toBeTruthy();
        }
        const responses = [
          ...(choice.responses ?? []),
          ...(choice.narrativeVariants ?? []).flatMap((variant) => variant.responses ?? []),
          ...branches.flatMap((branch) => [
            ...(branch.responses ?? []),
            ...(branch.narrativeVariants ?? []).flatMap((variant) => variant.responses ?? []),
          ]),
        ];
        for (const response of responses) {
          expect(declaredRoles.has(response.speakerRole)).toBe(true);
        }
      }
    }
  });

  it('keeps the first ten events automatic/story-linked as designed', () => {
    const events = new Map(getYouthContent().events.map((event) => [event.id, event]));
    const expectedLinks = {
      'misunderstanding-clarification': {
        storyId: 'misunderstanding-opened',
        nextEvents: ['misunderstanding-repair'],
      },
      'misunderstanding-repair': { storyId: 'misunderstanding-repaired', nextEvents: [] },
      'costly-match-mistake': { storyId: null, nextEvents: [] },
      'technical-plateau': { storyId: null, nextEvents: [] },
      'recovery-session-warning': { storyId: null, nextEvents: [] },
      'return-to-full-training': { storyId: null, nextEvents: [] },
      'position-race-opening': {
        storyId: 'position-race-opened',
        nextEvents: ['position-race-review'],
      },
      'position-race-review': {
        storyId: 'position-race-reviewed',
        nextEvents: ['position-race-resolution'],
      },
      'coach-trust-opening': { storyId: 'coach-trust-opened', nextEvents: ['coach-trust-test'] },
      'coach-trust-test': { storyId: 'coach-trust-tested', nextEvents: ['coach-trust-resolution'] },
    } as const;

    for (const [id, expected] of Object.entries(expectedLinks)) {
      const event = events.get(id)!;
      expect({ storyId: event.storyId ?? null, nextEvents: event.nextEvents ?? [] }).toEqual(
        expected,
      );
    }
    const recovery = events.get('recovery-session-warning')!;
    expect(recovery.interaction).toBe('automatic');
    expect(recovery.choices).toHaveLength(1);
  });

  it('rejects a selected target event when one authored result loses its response', () => {
    const invalid = structuredClone(getYouthContent()) as YouthContentBundle;
    const choice = invalid.events
      .find(({ id }) => id === 'misunderstanding-clarification')!
      .choices.find(({ id }) => id === 'clarify')!;
    delete (choice.resolution!.outcomes.failure as { response?: string }).response;

    expect(() => validateYouthContent(invalid)).toThrow('结果分支');
  });
});
