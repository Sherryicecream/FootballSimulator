import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EventDefinition } from '@football/contracts';
import { buildStoryGroups, StoryCodex } from '../../src/career-dashboard/StoryCodex';

const chainOpening: EventDefinition = {
  id: 'race-opening',
  version: 1,
  category: 'china-youth',
  rarity: 'uncommon',
  theme: 'relationships',
  interaction: 'decision',
  baseWeight: 18,
  title: '位置竞争的开始',
  description: '同位置的竞争者抢走了不少出场时间。',
  condition: {},
  storyId: 'race',
  nextEvents: ['race-review'],
  cooldownWeeks: 10,
  choices: [
    {
      id: 'compete',
      text: '正面竞争同一位置',
      riskLabel: 'medium',
      effects: { confidence: 3, fatigue: 4 },
    },
  ],
};

const chainFollowUp: EventDefinition = {
  ...chainOpening,
  id: 'race-review',
  title: '位置竞争的进展',
  description: '教练分别找你们谈了话。',
  condition: { requireStoryId: 'race-opened' },
  storyId: 'race',
  nextEvents: [],
  baseWeight: 26,
};

const standalone: EventDefinition = {
  ...chainOpening,
  id: 'exam-week',
  title: '考试周来临',
  description: '文化课考试恰好和比赛撞车。',
  storyId: undefined,
  nextEvents: [],
  choices: [{ id: 'plan', text: '提前规划时间表', riskLabel: 'low', effects: { fatigue: -2 } }],
};

const events = [chainFollowUp, standalone, chainOpening];

describe('buildStoryGroups', () => {
  it('按 nextEvents 把剧情线排序并把无 storyId 的事件归为独立事件', () => {
    const { storylines, standalone: singles } = buildStoryGroups(events);
    expect(storylines).toHaveLength(1);
    expect(storylines[0]!.chain.map(({ id }) => id)).toEqual(['race-opening', 'race-review']);
    expect(singles.map(({ id }) => id)).toEqual(['exam-week']);
  });
});

describe('StoryCodex', () => {
  it('展示剧情线顺序、事件结果与已经历标记', () => {
    render(<StoryCodex events={events} encounteredEventIds={new Set(['race-opening'])} />);
    expect(screen.getByText('剧情图鉴')).toBeVisible();
    expect(screen.getByText(/剧情线「位置竞争/)).toBeVisible();
    expect(screen.getByText('1. 位置竞争的开始（已经历）')).toBeVisible();
    expect(screen.getByText('2. 位置竞争的进展')).toBeVisible();
    expect(screen.getAllByText('正面竞争同一位置').length).toBeGreaterThan(0);
    expect(screen.getAllByText('→ 自信+3、疲劳+4').length).toBeGreaterThan(0);
    expect(screen.getByText('→ 疲劳-2')).toBeVisible();
    expect(screen.getAllByText('已经历').length).toBeGreaterThan(0);
  });

  it('未经历的事件不显示已经历徽标', () => {
    render(<StoryCodex events={events} encounteredEventIds={new Set()} />);
    expect(screen.queryByText('已经历')).toBeNull();
    expect(screen.getByText('考试周来临')).toBeVisible();
  });
});
