import { describe, expect, it } from 'vitest';
import { getYouthContent, validateYouthContent } from '../src';
import { balancedOneOffEvents } from '../src';
import { shortStoryEvents, trajectoryEvents } from '../src';
import { overseasClubs } from '../src/clubs';

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

describe('youth stories and trajectory signals', () => {
  it('turns the misunderstanding into a match-tested follow-up instead of a one-off entry', () => {
    const events = getYouthContent().events;
    const opening = events.find(({ id }) => id === 'misunderstanding-clarification');
    const followUp = events.find(({ id }) => id === 'misunderstanding-repair');

    expect(opening?.nextEvents).toEqual(['misunderstanding-repair']);
    expect(followUp?.condition).toEqual(
      expect.objectContaining({
        requireStoryId: 'misunderstanding-opened',
        requireFactType: 'match',
        requirePersonRole: 'teammate',
      }),
    );
    expect(followUp?.participantRoles).toEqual(['youth-coach', 'teammate']);
    expect(followUp?.choices.every(({ response, followUp: next }) => response && next)).toBe(true);
  });

  it('contains two exact three-stage chains with valid prerequisite memories', () => {
    expect(shortStoryEvents).toHaveLength(6);
    expect(shortStoryEvents.map(({ id }) => id)).toEqual([
      'position-race-opening',
      'position-race-review',
      'position-race-resolution',
      'coach-trust-opening',
      'coach-trust-test',
      'coach-trust-resolution',
    ]);

    const byId = new Map(shortStoryEvents.map((event) => [event.id, event]));
    expect(byId.get('position-race-opening')?.nextEvents).toEqual(['position-race-review']);
    expect(byId.get('position-race-review')?.condition.requireStoryId).toBe('position-race-opened');
    expect(byId.get('position-race-review')?.nextEvents).toEqual(['position-race-resolution']);
    expect(byId.get('position-race-resolution')?.condition.requireStoryId).toBe(
      'position-race-reviewed',
    );
    expect(byId.get('coach-trust-opening')?.nextEvents).toEqual(['coach-trust-test']);
    expect(byId.get('coach-trust-test')?.condition.requireStoryId).toBe('coach-trust-opened');
    expect(byId.get('coach-trust-test')?.nextEvents).toEqual(['coach-trust-resolution']);
    expect(byId.get('coach-trust-resolution')?.condition.requireStoryId).toBe('coach-trust-tested');
  });

  it('contains conditional early-prodigy and late-bloomer signals without fixed outcomes', () => {
    expect(trajectoryEvents.map(({ id }) => id)).toEqual([
      'early-prodigy-signal',
      'late-bloomer-window',
    ]);
    const early = trajectoryEvents[0]!;
    const late = trajectoryEvents[1]!;
    expect(early.theme).toBe('trajectory');
    expect(early.condition.maturationPaces).toEqual(['early']);
    expect(early.condition.minCoachEvaluation).toBeGreaterThanOrEqual(60);
    expect(late.condition.maturationPaces).toEqual(['late']);
    expect(late.condition.growthBackgrounds).toContain('late-bloomer');
    expect(late.condition.minWeek).toBeGreaterThanOrEqual(18);
    expect(late.condition.minProfessionalism).toBeGreaterThanOrEqual(55);
    expect(late.condition.minStability).toBeGreaterThanOrEqual(45);
    expect([...shortStoryEvents, ...trajectoryEvents].every((event) => event.baseWeight)).toBe(
      true,
    );
  });
});

describe('俱乐部与经纪人内容', () => {
  it('捆绑内容包含经过校验的俱乐部与经纪人', () => {
    const content = getYouthContent();
    const validated = validateYouthContent(content);

    expect(validated.clubs.length).toBeGreaterThanOrEqual(60);
    expect(validated.clubs.every(({ tier }) => tier >= 3 && tier <= 8)).toBe(true);
    expect(validated.clubs.every(({ name }) => name.length > 0)).toBe(true);
    expect(validated.agents.length).toBeGreaterThanOrEqual(2);
    expect(
      validated.agents.every(({ focusTierMin, focusTierMax }) => focusTierMin <= focusTierMax),
    ).toBe(true);
  });

  it('每个层级 3-8 拥有至少 8 家俱乐部', () => {
    const content = getYouthContent();
    for (let tier = 3; tier <= 8; tier += 1) {
      expect(
        content.clubs.filter(({ tier: clubTierValue }) => clubTierValue === tier).length,
      ).toBeGreaterThanOrEqual(8);
    }
  });

  it('拒绝重复俱乐部 ID、未知地区与真实品牌词', () => {
    const content = getYouthContent();
    const duplicated = { ...content, clubs: [...content.clubs, content.clubs[0]!] };
    expect(() => validateYouthContent(duplicated)).toThrow(/俱乐部/);

    const unknownRegion = {
      ...content,
      clubs: [{ ...content.clubs[0]!, id: 'club-x', regionId: 'atlantis' }],
    };
    expect(() => validateYouthContent(unknownRegion)).toThrow(/未知地区/);

    const branded = { ...content, clubs: [{ ...content.clubs[0]!, name: '皇家马德里青年联' }] };
    expect(() => validateYouthContent(branded)).toThrow();
  });
});

describe('文案编码完整性', () => {
  it('全部事件文案不含损坏的替换字符', () => {
    const content = getYouthContent();
    const validated = validateYouthContent(content);
    for (const event of validated.events) {
      expect(event.title).not.toContain('\uFFFD');
      expect(event.description).not.toContain('\uFFFD');
      for (const choice of event.choices) {
        expect(choice.text).not.toContain('\uFFFD');
      }
    }
  });
});

describe('overseas club regions', () => {
  it('lets every overseas tier 4-8 form a league inside its region', () => {
    for (const region of ['europe', 'asia'] as const) {
      const regional = overseasClubs.filter(({ overseasRegion }) => overseasRegion === region);
      expect(regional.length).toBeGreaterThanOrEqual(10);
      for (const tier of [4, 5, 6, 7, 8]) {
        const nearby = regional.filter(
          ({ tier: clubTier }) => Math.abs(clubTier - tier) <= 1,
        ).length;
        expect(`区域 ${region} 层级 ${tier} 附近俱乐部数`).toBe(
          `区域 ${region} 层级 ${tier} 附近俱乐部数`,
        );
        expect(nearby).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
