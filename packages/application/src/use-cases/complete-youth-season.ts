import type { CareerLedgerEntryV2, CareerSaveV3, SeasonHistorySummary } from '@football/contracts';
import { deriveDevelopmentSignals, type DevelopmentSignal } from '@football/simulation';

export interface YouthSeasonOutcome {
  status: 'retained' | 'released';
  nextPath: 'academy-continuation' | 'school-football' | 'lower-tier-academy' | 'trial';
  signals: DevelopmentSignal[];
  summary: string;
}

export const completeYouthSeason = (
  save: CareerSaveV3,
): { save: CareerSaveV3; outcome: YouthSeasonOutcome } => {
  if (!save.season.completed) throw new Error('赛季尚未结束，不能结算');
  if (save.story.pendingEvent) throw new Error('请先处理待决事件');
  if (save.careerPhase !== 'youth-season') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能结算赛季`);
  }
  const signals = deriveDevelopmentSignals(save);
  const sustainedRisks = [
    signals.includes('release-risk'),
    save.clubContext.coachEvaluation < 60,
    save.currentState.form < 35,
    save.currentState.confidence < 32,
    save.health.activeInjury?.kind === 'severe',
    ['fringe', 'rotation'].includes(save.clubContext.playerRole),
  ].filter(Boolean).length;
  const released = sustainedRisks >= 3;
  const nextPath = released
    ? (['school-football', 'lower-tier-academy', 'trial'] as const)[save.randomState.seed % 3]!
    : 'academy-continuation';
  const outcome: YouthSeasonOutcome = {
    status: released ? 'released' : 'retained',
    nextPath,
    signals,
    summary: released
      ? `俱乐部决定结束本阶段培养，但可以继续选择${pathLabel(nextPath)}。`
      : `俱乐部确认继续培养，下赛季从 ${save.clubContext.firstTeamStage} 阶段继续。`,
  };
  const fact: CareerLedgerEntryV2 = {
    id: `season-outcome-${save.season.id}`,
    weekKey: `${save.season.startDate.slice(0, 4)}-W${String(save.season.currentWeek).padStart(2, '0')}`,
    type: 'season-outcome',
    summary: outcome.summary,
    participantIds: save.relationships.persons
      .filter(({ role }) => role === 'youth-coach')
      .map(({ id }) => id),
  };
  const seasonSummary = buildSeasonSummary(save, outcome.status, signals);
  const hasOutcomeFact = save.ledger.some(({ id }) => id === fact.id);
  const hasSummary = save.seasonHistory.some(({ seasonId }) => seasonId === save.season.id);
  return {
    save: hasOutcomeFact
      ? save
      : {
          ...save,
          ledger: [...save.ledger, fact],
          seasonHistory: hasSummary ? save.seasonHistory : [...save.seasonHistory, seasonSummary],
        },
    outcome,
  };
};

const buildSeasonSummary = (
  save: CareerSaveV3,
  status: SeasonHistorySummary['status'],
  signals: DevelopmentSignal[],
): SeasonHistorySummary => {
  const { appearances, goals, assists, ratingSum, ratingCount } = save.seasonStats;
  return {
    seasonId: save.season.id,
    age: save.player.age,
    status,
    appearances,
    goals,
    assists,
    avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    signals,
    endedOn: save.season.endDate,
  };
};

const pathLabel = (path: YouthSeasonOutcome['nextPath']) =>
  ({
    'academy-continuation': '原青训体系',
    'school-football': '校园足球',
    'lower-tier-academy': '低级别青训',
    trial: '其他机构试训',
  })[path];
