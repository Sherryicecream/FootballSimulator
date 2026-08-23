import { describe, expect, it } from 'vitest';
import { getYouthContent, validateYouthContent } from '../src';
import { balancedOneOffEvents } from '../src';

describe('validateYouthContent', () => {
  it('accepts the bundled fictional youth content', () => {
    const content = getYouthContent();

    const validated = validateYouthContent(content);
    expect(validated.events).toHaveLength(content.events.length);
    expect(content.academies.length).toBeGreaterThanOrEqual(8);
    expect(content.competitions.length).toBeGreaterThan(0);
  });

  it('rejects duplicate ids and unknown academy references', () => {
    const content = getYouthContent();
    const duplicate = { ...content, academies: [...content.academies, content.academies[0]!] };
    expect(() => validateYouthContent(duplicate)).toThrow('重复');

    const unknownReference = {
      ...content,
      competitions: [
        {
          ...content.competitions[0]!,
          participatingAcademyIds: ['missing-academy', content.academies[0]!.id],
        },
      ],
    };
    expect(() => validateYouthContent(unknownReference)).toThrow('未知青训机构');
  });

  it('rejects unknown effects, unconditional major events and real club brands', () => {
    const content = getYouthContent();
    const baseEvent = content.events[0]!;

    expect(() =>
      validateYouthContent({
        ...content,
        events: [
          {
            ...baseEvent,
            id: 'invalid-effect',
            choices: [{ ...baseEvent.choices[0]!, effects: { unlimitedMoney: 10 } }],
          },
        ],
      }),
    ).toThrow('未知事件效果');

    expect(() =>
      validateYouthContent({
        ...content,
        events: [{ ...baseEvent, id: 'major-event', rarity: 'rare', condition: {} }],
      }),
    ).toThrow('重大事件必须有条件');

    expect(() =>
      validateYouthContent({
        ...content,
        academies: [{ ...content.academies[0]!, name: '皇家马德里青训营' }],
        competitions: [],
      }),
    ).toThrow('真实俱乐部品牌');
  });

  it('rejects unknown regions, schedule conflicts and broken story chains', () => {
    const content = getYouthContent();
    expect(() =>
      validateYouthContent({
        ...content,
        academies: [{ ...content.academies[0]!, regionId: 'missing-region' }],
        competitions: [],
      }),
    ).toThrow('未知地区');

    expect(() =>
      validateYouthContent({
        ...content,
        competitions: [
          content.competitions[0]!,
          { ...content.competitions[0]!, id: 'second-overlapping-competition' },
        ],
      }),
    ).toThrow('赛程冲突');

    expect(() =>
      validateYouthContent({
        ...content,
        events: [{ ...content.events[0]!, nextEvents: ['missing-follow-up'] }],
      }),
    ).toThrow('断裂故事链');
  });
});

describe('balanced youth one-off events', () => {
  it('contains sixteen explicit events with broad themes and both interaction modes', () => {
    expect(balancedOneOffEvents).toHaveLength(16);
    expect(new Set(balancedOneOffEvents.map(({ id }) => id)).size).toBe(16);
    for (const theme of ['match', 'training', 'relationships', 'off-pitch', 'health'] as const) {
      expect(
        balancedOneOffEvents.filter((event) => event.theme === theme).length,
      ).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(balancedOneOffEvents.map(({ interaction }) => interaction))).toEqual(
      new Set(['decision', 'automatic']),
    );
    for (const event of balancedOneOffEvents) {
      expect(event.theme).toBeDefined();
      expect(event.interaction).toBeDefined();
      expect(event.baseWeight).toBeDefined();
      if (event.interaction === 'automatic') expect(event.choices).toHaveLength(1);
      if (event.rarity === 'rare' || event.rarity === 'legendary') {
        expect(Object.keys(event.condition)).not.toHaveLength(0);
      }
    }
  });

  it('rejects automatic definitions with more than one choice', () => {
    const content = getYouthContent();
    const base = content.events[0]!;
    expect(() =>
      validateYouthContent({
        ...content,
        events: [
          {
            ...base,
            id: 'invalid-automatic',
            interaction: 'automatic',
            choices: [base.choices[0]!, base.choices[1]!],
          },
        ],
      }),
    ).toThrow('自动事件只能有一个选项');
  });
});
