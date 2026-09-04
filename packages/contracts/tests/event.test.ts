import { describe, it, expect } from 'vitest';
import { EventDefinitionSchema, EventChoiceSchema, StoryStateSchema } from '../src/event';

describe('EventChoice', () => {
  it('验证事件选项', () => {
    const valid = EventChoiceSchema.parse({
      id: 'accept_challenge',
      text: '接受挑战，加倍努力训练',
      riskLabel: '中等',
      effects: { reputation: 5, determination: 2 },
      delayEffects: { stamina: -3 },
      resultTitle: '训练计划已记录',
    });
    expect(valid.id).toBe('accept_challenge');
    expect(valid.riskLabel).toBe('中等');
    expect(valid.resultTitle).toBe('训练计划已记录');
    expect(valid.nextEventIds).toBeUndefined();
  });
});

describe('EventDefinition', () => {
  it('验证完整事件定义', () => {
    const valid = EventDefinitionSchema.parse({
      id: 'coach_challenge_01',
      version: 1,
      category: 'dressing-room',
      rarity: 'common',
      title: '教练的挑战',
      description: '主教练在训练后单独找到你，对你的表现提出了更高的要求。',
      condition: { minAge: 16, maxAge: 35, minReputation: 10 },
      choices: [
        { id: 'accept', text: '接受挑战', riskLabel: '低', effects: { determination: 3 } },
        { id: 'ignore', text: '不以为意', riskLabel: '中', effects: { coachTrust: -5 } },
      ],
      cooldownWeeks: 8,
    });
    expect(valid.id).toBe('coach_challenge_01');
    expect(valid.choices.length).toBe(2);
  });

  it('拒绝缺少选项的事件', () => {
    expect(() =>
      EventDefinitionSchema.parse({
        id: 'bad_event',
        version: 1,
        category: 'dressing-room',
        rarity: 'common',
        title: '坏事件',
        description: '没有选项',
        condition: {},
        choices: [],
        cooldownWeeks: 4,
      }),
    ).toThrow();
  });
});

describe('StoryState', () => {
  it('验证故事状态', () => {
    const valid = StoryStateSchema.parse({
      activeStorylines: [],
      completedStoryIds: ['coach_challenge_01'],
      cooldowns: { coach_challenge_01: 8 },
      pendingDelayedEffects: [],
    });
    expect(valid.completedStoryIds).toContain('coach_challenge_01');
  });
});
