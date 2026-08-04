import { describe, it, expect } from 'vitest';
import { filterEligibleEvents, selectEvent } from '../../src/events/event-selector';
import { createSeededRandomSource } from '../../src/randomness/seeded-random-source';
import type { EventDefinition } from '@football/contracts';

const mockEvents: EventDefinition[] = [
  {
    id: 'youth_training',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '青训训练',
    description: '日常训练',
    condition: { minAge: 14, maxAge: 20 },
    choices: [{ id: 'a', text: '努力训练', riskLabel: '低' }],
    cooldownWeeks: 4,
  },
  {
    id: 'coach_praise',
    version: 1,
    category: 'dressing-room',
    rarity: 'common',
    title: '教练表扬',
    description: '教练在队前表扬了你',
    condition: { minReputation: 30 },
    choices: [{ id: 'a', text: '谦虚回应', riskLabel: '低' }],
    cooldownWeeks: 8,
  },
  {
    id: 'injury_scare',
    version: 1,
    category: 'dressing-room',
    rarity: 'uncommon',
    title: '伤病惊魂',
    description: '训练中感到不适',
    condition: {},
    choices: [
      { id: 'a', text: '报告教练', riskLabel: '低' },
      { id: 'b', text: '继续训练', riskLabel: '高' },
    ],
    cooldownWeeks: 12,
  },
];

describe('filterEligibleEvents', () => {
  it('根据年龄过滤事件', () => {
    const result = filterEligibleEvents(mockEvents, {
      age: 16,
      reputation: 20,
      season: 2024,
      week: 1,
      storyState: {
        activeStorylines: [],
        completedStoryIds: [],
        cooldowns: {},
        pendingDelayedEffects: [],
      },
    });
    expect(result.map((e) => e.id)).toContain('youth_training');
    expect(result.map((e) => e.id)).not.toContain('coach_praise');
  });

  it('排除冷却期中的事件', () => {
    const result = filterEligibleEvents(mockEvents, {
      age: 16,
      reputation: 20,
      season: 2024,
      week: 1,
      storyState: {
        activeStorylines: [],
        completedStoryIds: [],
        cooldowns: { youth_training: 4 },
        pendingDelayedEffects: [],
      },
    });
    expect(result.map((e) => e.id)).not.toContain('youth_training');
  });

  it('排除已互斥的事件', () => {
    // 没有事件设置了 excludeStoryId，所以所有事件都可通过
    // 为互斥测试添加一个临时事件
    const eventsWithExclude = [
      ...mockEvents,
      {
        id: 'post_training',
        version: 1,
        category: 'china-youth',
        rarity: 'common',
        title: '训练后',
        description: '训练后的总结',
        condition: { excludeStoryId: 'youth_training' },
        choices: [{ id: 'a', text: '听取意见', riskLabel: '低' }],
        cooldownWeeks: 4,
      },
    ];
    const filtered = filterEligibleEvents(eventsWithExclude, {
      age: 16,
      reputation: 20,
      season: 2024,
      week: 1,
      storyState: {
        activeStorylines: [],
        completedStoryIds: ['youth_training'],
        cooldowns: {},
        pendingDelayedEffects: [],
      },
    });
    expect(filtered.map((e) => e.id)).not.toContain('post_training');
  });

  it('需要前置故事线的事件', () => {
    const eventsWithRequire = [
      ...mockEvents,
      {
        id: 'advanced_training',
        version: 1,
        category: 'china-youth',
        rarity: 'uncommon',
        title: '进阶训练',
        description: '需要先完成基础训练',
        condition: { requireStoryId: 'youth_training' },
        choices: [{ id: 'a', text: '参加', riskLabel: '中' }],
        cooldownWeeks: 8,
      },
    ];
    const result = filterEligibleEvents(eventsWithRequire, {
      age: 16,
      reputation: 20,
      season: 2024,
      week: 1,
      storyState: {
        activeStorylines: [],
        completedStoryIds: ['youth_training'],
        cooldowns: {},
        pendingDelayedEffects: [],
      },
    });
    expect(result.map((e) => e.id)).toContain('advanced_training');
  });
});

describe('selectEvent', () => {
  it('从合法事件中按稀有度加权选择一个', () => {
    const rng = createSeededRandomSource(42);
    const events = [mockEvents[0]!, mockEvents[2]!];
    const selected = selectEvent(events, rng);
    expect(events.map((e) => e.id)).toContain(selected.id);
  });

  it('没有合法事件时返回 undefined', () => {
    const rng = createSeededRandomSource(42);
    const selected = selectEvent([], rng);
    expect(selected).toBeUndefined();
  });

  it('同一种子选择相同事件', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const events = [mockEvents[0]!, mockEvents[1]!, mockEvents[2]!];

    const selected1 = selectEvent(events, rng1);
    const selected2 = selectEvent(events, rng2);

    expect(selected1.id).toBe(selected2.id);
  });
});
