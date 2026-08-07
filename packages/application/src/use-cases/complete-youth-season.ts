import type { CareerLedgerEntryV2, CareerSaveV2 } from '@football/contracts';
import { deriveDevelopmentSignals, type DevelopmentSignal } from '@football/simulation';

export interface YouthSeasonOutcome {
  status: 'retained' | 'released';
  nextPath: 'academy-continuation' | 'school-football' | 'lower-tier-academy' | 'trial';
  signals: DevelopmentSignal[];
  summary: string;
}

export const completeYouthSeason = (
  save: CareerSaveV2,
): { save: CareerSaveV2; outcome: YouthSeasonOutcome } => {
  if (!save.season.completed) throw new Error('赛季尚未结束，不能结算');
  if (save.story.pendingEvent) throw new Error('请先处理待决事件');
  const signals = deriveDevelopmentSignals(save);
  const sustainedRisks = [
    signals.includes('release-risk'),
    save.clubContext.coachEvaluation < 30,
    save.currentState.form < 35,
    save.currentState.confidence < 35,
    save.health.activeInjury?.kind === 'severe',
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
  return { save: { ...save, ledger: [...save.ledger, fact] }, outcome };
};

const pathLabel = (path: YouthSeasonOutcome['nextPath']) =>
  ({
    'academy-continuation': '原青训体系',
    'school-football': '校园足球',
    'lower-tier-academy': '低级别青训',
    trial: '其他机构试训',
  })[path];
