import type {
  CareerLedgerEntryV2,
  MonthlyReport,
  MonthSummary,
  NodeStopReason,
  YouthEventInstance,
} from '@football/contracts';

export type NodeAdvanceState = {
  health: { fatigue: number; activeInjury: unknown };
  careerPhase?: string;
  season?: { completed: boolean };
  proSeason?: { completed: boolean } | null;
  contract?: { clubId?: string } | null;
  pendingOffers?: readonly unknown[];
  nationalTeam?: { capped?: boolean; caps?: number } | null;
};

export type NodeAdvanceTransition<S> =
  | { status: 'awaiting-decision'; save: S; event: YouthEventInstance }
  | { status: 'month-complete' | 'season-complete'; save: S; report: MonthlyReport };

export type NodeAdvanceResult<S> = {
  skippedMonths: MonthSummary[];
  stopReason: NodeStopReason;
  stopAt: S;
  stopEvent?: YouthEventInstance;
};

export const advanceToNextNode = <S extends NodeAdvanceState>(
  initialSave: S,
  advanceOneMonth: (save: S) => NodeAdvanceTransition<S>,
): NodeAdvanceResult<S> => {
  const skippedMonths: MonthSummary[] = [];
  let current = initialSave;

  for (let guard = 0; guard < 60; guard += 1) {
    const transition = advanceOneMonth(current);
    if (transition.status === 'awaiting-decision') {
      return {
        skippedMonths,
        stopReason: 'event',
        stopAt: transition.save,
        stopEvent: transition.event,
      };
    }

    skippedMonths.push(summarizeMonth(current, transition.save, transition.report));
    const stopReason = findStopReason(current, transition.save, transition.status);
    if (stopReason) {
      return { skippedMonths, stopReason, stopAt: transition.save };
    }
    current = transition.save;
  }

  throw new Error('节点推进超过 60 个月仍未遇到可停靠节点');
};

export const summarizeMonth = <S extends Pick<NodeAdvanceState, 'health'>>(
  previous: S,
  next: S,
  report: MonthlyReport,
): MonthSummary => ({
  monthKey: report.monthKey,
  matchCount: report.matchIds.length,
  goalsFor: report.facts.reduce((total, fact) => total + scoreFor(fact, true), 0),
  goalsAgainst: report.facts.reduce((total, fact) => total + scoreFor(fact, false), 0),
  fatigueTrend: fatigueTrend(previous.health.fatigue, next.health.fatigue),
  notableChange: notableChange(report, next.health.activeInjury),
});

const findStopReason = <S extends NodeAdvanceState>(
  previous: S,
  next: S,
  status: NodeAdvanceTransition<S>['status'],
): NodeStopReason | null => {
  if (status === 'season-complete' || next.season?.completed || next.proSeason?.completed) {
    return 'season-end';
  }
  if (!previous.health.activeInjury && next.health.activeInjury) return 'injury';
  if (previous.contract?.clubId !== next.contract?.clubId) return 'contract';
  if ((next.pendingOffers?.length ?? 0) > (previous.pendingOffers?.length ?? 0)) {
    return 'offer';
  }
  if (nationalTeamChanged(previous.nationalTeam, next.nationalTeam)) return 'national-team';
  return null;
};

const nationalTeamChanged = (
  previous: NodeAdvanceState['nationalTeam'],
  next: NodeAdvanceState['nationalTeam'],
): boolean => previous?.capped !== next?.capped || (previous?.caps ?? 0) !== (next?.caps ?? 0);

const scoreFor = (fact: CareerLedgerEntryV2, own: boolean): number => {
  if (!fact.matchContext) return 0;
  const homeScore = fact.matchContext.homeScore ?? parseScore(fact.summary)?.[0];
  const awayScore = fact.matchContext.awayScore ?? parseScore(fact.summary)?.[1];
  if (homeScore === undefined || awayScore === undefined) return 0;
  const ownScore = fact.matchContext.isHome ? homeScore : awayScore;
  const opponentScore = fact.matchContext.isHome ? awayScore : homeScore;
  return own ? ownScore : opponentScore;
};

const parseScore = (summary: string): [number, number] | null => {
  const match = summary.match(/(?:^|\s)(\d+):(\d+)(?:\s|；|$)/);
  return match ? [Number(match[1]), Number(match[2])] : null;
};

const fatigueTrend = (previous: number, next: number): MonthSummary['fatigueTrend'] => {
  if (next > previous) return 'up';
  if (next < previous) return 'down';
  return 'flat';
};

const notableChange = (report: MonthlyReport, activeInjury: unknown): string | null => {
  if (report.attributeChanges.length > 0) {
    return (
      '成长：' +
      report.attributeChanges
        .map(
          ({ attribute, oldValue, newValue }) =>
            `${attributeLabel(attribute)} ${oldValue}→${newValue}`,
        )
        .join('，')
    );
  }
  if (activeInjury) {
    return report.facts.find(({ type }) => type === 'health')?.summary ?? '出现伤病，需要恢复';
  }
  const notableFact = report.facts.find(
    ({ type }) => !['training', 'match', 'pro-match', 'monthly-settlement'].includes(type),
  );
  return notableFact?.summary ?? null;
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  firstTouch: '停球',
  dribbling: '盘带',
  passing: '传球',
  shooting: '射门',
  defending: '防守',
  aerialAbility: '空中能力',
  pace: '速度',
  strength: '力量',
  stamina: '耐力',
  agility: '灵活',
  offTheBall: '跑位',
  vision: '视野',
  decision: '决策',
  composure: '镇定',
  determination: '意志',
  discipline: '纪律',
};

const attributeLabel = (attribute: string): string => ATTRIBUTE_LABELS[attribute] ?? attribute;
