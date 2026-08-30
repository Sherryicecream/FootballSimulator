import type {
  CareerSaveV3,
  ScheduledYouthFixture,
  YouthAcademyProfile,
  YouthCompetitionDefinition,
} from '@football/contracts';

/** 固定赛程生成：同一种子与赛季年份生成完全一致的赛程。 */
export const createYouthFixtures = (
  academyId: string,
  competition: YouthCompetitionDefinition,
  seed: number,
  seasonYear: string,
): ScheduledYouthFixture[] => {
  const opponents = competition.participatingAcademyIds.filter((id) => id !== academyId);
  if (opponents.length === 0) {
    throw new Error(`赛事 ${competition.id} 没有有效对手`);
  }

  const range = competition.targetFixtureCount.max - competition.targetFixtureCount.min + 1;
  const fixtureCount = competition.targetFixtureCount.min + (seed % range);
  return Array.from({ length: fixtureCount }, (_, index) => {
    const opponentId = opponents[(index + seed) % opponents.length]!;
    const isHome = (index + seed) % 2 === 0;
    const week = Math.floor((index * 40) / fixtureCount) + 2;
    return {
      id: `${competition.id}-${index + 1}`,
      weekKey: `${seasonYear}-W${String(week).padStart(2, '0')}`,
      competitionId: competition.id,
      homeClubId: isHome ? academyId : opponentId,
      awayClubId: isHome ? opponentId : academyId,
      status: 'scheduled' as const,
      resultId: null,
    };
  });
};

/**
 * 从休赛期开启下个青训赛季：日期推进一年、固定赛程、重置月度游标与
 * 赛季统计、清空事件冷却；关系、人物记忆与一线队阶段保留。
 * 被放弃球员通过传入新机构实现补救路线重入。
 */
export const startNextSeason = (
  save: CareerSaveV3,
  academy: YouthAcademyProfile,
  competition: YouthCompetitionDefinition,
): CareerSaveV3 => {
  if (save.careerPhase !== 'offseason') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能开启下个赛季`);
  }
  const seasonStart = save.offseason?.nextSeasonStart;
  if (!seasonStart) throw new Error('休赛期状态缺少新赛季开始日期');

  const seasonYear = seasonStart.slice(0, 4);
  const seasonIndex = Number(seasonYear);
  if (!Number.isFinite(seasonIndex)) throw new Error(`无效的赛季年份：${seasonYear}`);
  const seasonSeed = save.randomState.seed + seasonIndex;

  return {
    ...save,
    careerPhase: 'youth-season',
    offseason: null,
    season: {
      id: `season-${seasonYear}`,
      startDate: seasonStart,
      endDate: `${seasonIndex + 1}-06-30`,
      currentDate: seasonStart,
      currentWeek: 1,
      currentMonth: `${seasonYear}-09`,
      academyId: academy.id,
      fixtures: createYouthFixtures(academy.id, competition, seasonSeed, seasonYear),
      completed: false,
    },
    clubContext: {
      ...save.clubContext,
      coachEvaluation: 55 + (seasonSeed % 11),
    },
    story: {
      activeStorylines: [],
      completedStoryIds: save.story.completedStoryIds,
      cooldownsByEventId: {},
      themeCooldownsByTheme: {},
      pendingDelayedEffects: [],
      pendingEvent: null,
    },
    monthlyAdvance: {
      monthKey: `${seasonYear}-09`,
      nextWeekIndex: 0,
      totalWeeks: 4,
      status: 'idle',
      developmentAccrual: {},
      factIds: [],
      matchIds: [],
      interactiveEventCount: 0,
    },
    seasonStats: {
      appearances: 0,
      goals: 0,
      assists: 0,
      ratingSum: 0,
      ratingCount: 0,
    },
  };
};
