import { describe, expect, it } from 'vitest';
import { CareerSaveV3Schema, type CareerSaveV3 } from '@football/contracts';
import { startNextSeason } from '../../src/career/start-next-season';
import { createYouthSave, academies } from '../fixtures/youth-save';

const competition = {
  id: 'league',
  name: '测试青年联赛',
  participatingAcademyIds: ['home', 'away', 'third'],
  seasonStartMonth: 9,
  seasonEndMonth: 6,
  targetFixtureCount: { min: 18, max: 26 },
} as const;

const asV3 = (overrides: Partial<CareerSaveV3> = {}): CareerSaveV3 =>
  CareerSaveV3Schema.parse({
    ...createYouthSave(),
    schemaVersion: 3,
    careerPhase: 'offseason',
    offseason: {
      briefing: {
        healthClearance: '伤病全部痊愈，可以完整参加季前训练',
        attributeDrift: [],
        reputationChange: 0,
        ageUpdate: { from: 16, to: 17 },
      },
      graduationEligible: false,
      eligibilityReport: [],
      nextSeasonStart: '2025-09-01',
    },
    ...overrides,
  });

describe('startNextSeason', () => {
  it('生成新赛季：日期推进一年、赛程重新固定、游标与统计重置', () => {
    const save = asV3();
    const next = startNextSeason(save, academies[0]!, competition);
    expect(next.careerPhase).toBe('youth-season');
    expect(next.season.id).toBe('season-2025');
    expect(next.season.startDate).toBe('2025-09-01');
    expect(next.season.endDate).toBe('2026-06-30');
    expect(next.season.currentDate).toBe('2025-09-01');
    expect(next.season.currentWeek).toBe(1);
    expect(next.season.currentMonth).toBe('2025-09');
    expect(next.season.completed).toBe(false);
    expect(next.season.fixtures.length).toBeGreaterThanOrEqual(18);
    expect(next.season.fixtures.length).toBeLessThanOrEqual(26);
    expect(next.season.fixtures.every(({ status }) => status === 'scheduled')).toBe(true);
    expect(
      next.season.fixtures.every(({ homeClubId, awayClubId }) =>
        [homeClubId, awayClubId].includes('home'),
      ),
    ).toBe(true);
    expect(next.monthlyAdvance.status).toBe('idle');
    expect(next.monthlyAdvance.monthKey).toBe('2025-09');
    expect(next.seasonStats).toEqual({
      appearances: 0,
      goals: 0,
      assists: 0,
      ratingSum: 0,
      ratingCount: 0,
    });
    expect(next.offseason).toBeNull();
  });

  it('同种子生成相同赛程；不同赛季生成不同赛程', () => {
    const save = asV3();
    const a = startNextSeason(save, academies[0]!, competition);
    const b = startNextSeason(save, academies[0]!, competition);
    expect(a.season.fixtures).toEqual(b.season.fixtures);
    const later = startNextSeason(
      asV3({
        offseason: {
          briefing: {
            healthClearance: '痊愈',
            attributeDrift: [],
            reputationChange: 0,
            ageUpdate: { from: 17, to: 18 },
          },
          graduationEligible: false,
          eligibilityReport: [],
          nextSeasonStart: '2026-09-01',
        },
      }),
      academies[0]!,
      competition,
    );
    expect(later.season.fixtures).not.toEqual(a.season.fixtures);
  });

  it('故事冷却清空但已完成故事保留；教练评价回归中位区间', () => {
    const save = asV3({
      story: {
        activeStorylines: ['story-1'],
        completedStoryIds: ['story-done'],
        cooldownsByEventId: { 'event-a': 5 },
        themeCooldownsByTheme: { media: 3 },
        pendingDelayedEffects: [],
        pendingEvent: null,
      },
    });
    const next = startNextSeason(save, academies[0]!, competition);
    expect(next.story.cooldownsByEventId).toEqual({});
    expect(next.story.themeCooldownsByTheme).toEqual({});
    expect(next.story.activeStorylines).toEqual([]);
    expect(next.story.completedStoryIds).toEqual(['story-done']);
    expect(next.story.pendingEvent).toBeNull();
    expect(next.clubContext.coachEvaluation).toBeGreaterThanOrEqual(55);
    expect(next.clubContext.coachEvaluation).toBeLessThanOrEqual(65);
  });

  it('被放弃球员更换机构后按新机构与赛事生成赛季', () => {
    const save = asV3();
    const next = startNextSeason(save, academies[1]!, competition);
    expect(next.season.academyId).toBe('away');
    expect(
      next.season.fixtures.every(({ homeClubId, awayClubId }) =>
        [homeClubId, awayClubId].includes('away'),
      ),
    ).toBe(true);
  });

  it('青训赛季进行中调用属于非法阶段转移', () => {
    const save = asV3({ careerPhase: 'youth-season' });
    expect(() => startNextSeason(save, academies[0]!, competition)).toThrow(/阶段/);
  });

  it('下一赛季将满 20 岁时不能继续开启青训赛季', () => {
    const base = createYouthSave();
    const save = asV3({
      player: {
        ...base.player,
        age: 19,
        identity: { ...base.player.identity, dateOfBirth: '2006-01-01' },
      },
      offseason: {
        briefing: {
          healthClearance: '痊愈',
          attributeDrift: [],
          reputationChange: 0,
          ageUpdate: { from: 19, to: 20 },
        },
        graduationEligible: false,
        eligibilityReport: [],
        nextSeasonStart: '2026-09-01',
      },
    });

    expect(() => startNextSeason(save, academies[0]!, competition)).toThrow(/20 岁/);
  });
});
