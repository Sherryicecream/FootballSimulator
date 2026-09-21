import { describe, expect, it } from 'vitest';
import type { MonthSummary, YouthEventInstance } from '@football/contracts';
import { buildNodeBrief } from '../../src/use-cases/build-node-brief';

const summary: MonthSummary = {
  monthKey: '2026-11',
  matchCount: 3,
  goalsFor: 5,
  goalsAgainst: 2,
  fatigueTrend: 'down',
  notableChange: '成长：传球 60→61',
};

const event: YouthEventInstance = {
  eventId: 'node-event',
  title: '关键选择',
  description: '等待玩家处理。',
  choices: [{ id: 'continue', text: '继续', riskLabel: '低', effects: {} }],
  resolvedChoiceId: null,
  participantIds: [],
  factRefs: [],
  storyId: null,
  nextEventIds: [],
  interaction: 'decision',
};

describe('buildNodeBrief', () => {
  it('summarizes skipped months without recalculating their outcomes', () => {
    const brief = buildNodeBrief([summary], 'event', event);

    expect(brief).toEqual({
      headline: '2026年11月：关键选择等待你决定',
      skippedSummary: '1 个月，3 场比赛，球队进球 5，丢球 2；体能下降。',
      changes: ['成长：传球 60→61'],
      nextFocus: '关键选择等待你决定：关键选择。',
    });
  });

  it('points the player to the season review when no event interrupts the node', () => {
    expect(buildNodeBrief([summary], 'season-end').nextFocus).toContain('赛季总结');
  });
});
