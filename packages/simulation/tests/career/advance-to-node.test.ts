import { describe, expect, it } from 'vitest';
import type { MonthlyReport, YouthEventInstance } from '@football/contracts';
import {
  advanceToNextNode,
  summarizeMonth,
  type NodeAdvanceTransition,
} from '../../src/career/advance-to-node';

type TestSave = {
  health: { fatigue: number; activeInjury: object | null };
  monthlyAdvance: { interactiveEventCount: number };
  season: { currentMonth: string; completed: boolean };
  story: { pendingEvent: YouthEventInstance | null };
};

const createReport = (
  monthKey: string,
  homeScore: number,
  awayScore: number,
  attributeChanges: MonthlyReport['attributeChanges'] = [],
): MonthlyReport => ({
  monthKey,
  facts: [
    {
      id: `match-${monthKey}`,
      weekKey: `${monthKey}-W04`,
      type: 'match',
      summary: `对手 ${homeScore}:${awayScore}`,
      participantIds: [],
      matchContext: {
        opponentStrength: 60,
        isHome: true,
        played: true,
        minutesPlayed: 90,
        rating: 7,
        goals: 0,
        assists: 0,
        homeScore,
        awayScore,
      },
    },
  ],
  attributeChanges,
  stateSummary: { morale: 60, form: 60, confidence: 60, fitness: 70, fatigue: 20 },
  matchIds: [`match-${monthKey}`],
});

const event: YouthEventInstance = {
  eventId: 'event-next-node',
  title: '下一节点事件',
  description: '这次选择必须由玩家处理。',
  choices: [{ id: 'continue', text: '继续', riskLabel: '低', effects: {} }],
  resolvedChoiceId: null,
  participantIds: [],
  factRefs: [],
  storyId: null,
  nextEventIds: [],
  interaction: 'decision',
};

const transition = (save: TestSave, report: MonthlyReport): NodeAdvanceTransition<TestSave> => ({
  status: 'month-complete',
  save,
  report,
});

describe('advanceToNextNode', () => {
  it('skips uneventful months and stops at the next event without consuming interaction count', () => {
    const start: TestSave = {
      health: { fatigue: 10, activeInjury: null },
      monthlyAdvance: { interactiveEventCount: 0 },
      season: { currentMonth: '2026-08', completed: false },
      story: { pendingEvent: null },
    };
    const reports = [
      createReport('2026-08', 2, 1),
      createReport('2026-09', 1, 1, [{ attribute: 'passing', oldValue: 60, newValue: 61 }]),
      createReport('2026-10', 0, 2),
    ];
    let index = 0;
    const result = advanceToNextNode(start, (current) => {
      if (index === reports.length) {
        const next = {
          ...current,
          season: { ...current.season, currentMonth: '2026-11' },
          story: { pendingEvent: event },
        };
        index += 1;
        return {
          status: 'awaiting-decision',
          save: next,
          event,
        };
      }
      const report = reports[index]!;
      index += 1;
      return transition(
        {
          ...current,
          health: { ...current.health, fatigue: current.health.fatigue + 5 },
          season: { ...current.season, currentMonth: report.monthKey },
        },
        report,
      );
    });

    expect(result.skippedMonths).toHaveLength(3);
    expect(result.skippedMonths[0]).toMatchObject({
      monthKey: '2026-08',
      matchCount: 1,
      goalsFor: 2,
      goalsAgainst: 1,
      fatigueTrend: 'up',
    });
    expect(result.skippedMonths[1]?.notableChange).toContain('传球');
    expect(result.stopReason).toBe('event');
    expect(result.stopAt.story.pendingEvent).toBe(event);
    expect(result.stopAt.monthlyAdvance.interactiveEventCount).toBe(0);
  });

  it('stops at season end and at a newly triggered injury', () => {
    const start: TestSave = {
      health: { fatigue: 30, activeInjury: null },
      monthlyAdvance: { interactiveEventCount: 0 },
      season: { currentMonth: '2026-06', completed: false },
      story: { pendingEvent: null },
    };
    const ending = advanceToNextNode(start, (current) => ({
      status: 'season-complete',
      save: {
        ...current,
        season: { ...current.season, completed: true },
      },
      report: createReport('2026-06', 3, 2),
    }));
    expect(ending.stopReason).toBe('season-end');
    expect(ending.skippedMonths).toHaveLength(1);

    const injured = advanceToNextNode(start, (current) => ({
      status: 'month-complete',
      save: { ...current, health: { ...current.health, activeInjury: { id: 'injury-1' } } },
      report: createReport('2026-06', 0, 0),
    }));
    expect(injured.stopReason).toBe('injury');
  });
});

describe('summarizeMonth', () => {
  it('projects match score, growth, and fatigue direction from existing monthly output', () => {
    const summary = summarizeMonth(
      { health: { fatigue: 45 } },
      { health: { fatigue: 33 } },
      createReport('2026-09', 4, 2, [{ attribute: 'passing', oldValue: 60, newValue: 62 }]),
    );

    expect(summary).toEqual({
      monthKey: '2026-09',
      matchCount: 1,
      goalsFor: 4,
      goalsAgainst: 2,
      fatigueTrend: 'down',
      notableChange: '成长：传球 60→62',
    });
  });
});
