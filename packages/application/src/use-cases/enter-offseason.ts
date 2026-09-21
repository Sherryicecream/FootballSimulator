import type {
  CareerSaveV3Like,
  CareerSaveV6Like,
  OffseasonBriefing,
  YouthAcademyProfile,
} from '@football/contracts';
import { createSeededRandomSource, evaluateOffseason, stampCareerFact } from '@football/simulation';

export const enterOffseason = <S extends CareerSaveV3Like>(
  save: S,
  academies: readonly YouthAcademyProfile[],
): { save: S; briefing: OffseasonBriefing } => {
  if (save.careerPhase !== 'youth-season') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能进入休赛期`);
  }
  if (!save.season.completed) throw new Error('赛季尚未结束，不能进入休赛期');
  if (save.story.pendingEvent) throw new Error('请先处理待决事件');
  if (save.story.pendingFeedback) throw new Error('请先确认事件反馈');
  const academy = academies.find(({ id }) => id === save.season.academyId);
  if (!academy) throw new Error(`青训机构 ${save.season.academyId} 不在内容包中`);

  const nextSeasonStart = `${Number(save.season.endDate.slice(0, 4))}-09-01`;
  const rng = createSeededRandomSource(save.randomState.seed + 9100 + save.seasonHistory.length);
  const settlement = evaluateOffseason(save, academy, nextSeasonStart, rng);
  const fact = stampCareerFact(save as unknown as CareerSaveV6Like, {
    id: `offseason-${save.season.id}`,
    weekKey: `${save.season.startDate.slice(0, 4)}-W${String(save.season.currentWeek).padStart(2, '0')}`,
    type: 'offseason-settlement',
    summary: `休赛期结算：${settlement.briefing.healthClearance}；声望 ${settlement.briefing.reputationChange >= 0 ? '+' : ''}${settlement.briefing.reputationChange}；年龄 ${settlement.briefing.ageUpdate.from}→${settlement.briefing.ageUpdate.to}`,
    participantIds: [],
  });
  return {
    save: { ...settlement.save, ledger: [...settlement.save.ledger, fact] },
    briefing: settlement.briefing,
  };
};
