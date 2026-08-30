import type {
  CareerLedgerEntryV2,
  CareerSaveV3,
  MonthlyReport,
  YouthAcademyProfile,
  YouthMatchResultV2,
  EventDefinition,
} from '@football/contracts';
import {
  advanceFirstTeamPathway,
  createSeededRandomSource,
  pickYouthEventForWeek,
  settleMonthlyDevelopment,
  simulateYouthWeek,
  type DevelopmentAccrual,
} from '@football/simulation';
import { resolveCareerEvent } from './resolve-career-event';

export type AdvanceMonthOutcome =
  | {
      status: 'awaiting-decision';
      save: CareerSaveV3;
      event: NonNullable<CareerSaveV3['story']['pendingEvent']>;
    }
  | { status: 'month-complete'; save: CareerSaveV3; report: MonthlyReport }
  | { status: 'season-complete'; save: CareerSaveV3; report: MonthlyReport };

export const advanceCareerMonth = (
  initialSave: CareerSaveV3,
  academies: readonly YouthAcademyProfile[],
  events: readonly EventDefinition[] = [],
): AdvanceMonthOutcome => {
  if (initialSave.story.pendingEvent) {
    return {
      status: 'awaiting-decision',
      save: initialSave,
      event: initialSave.story.pendingEvent,
    };
  }
  if (initialSave.season.completed) throw new Error('青训赛季已经结束');

  const monthKey = initialSave.season.currentMonth;
  const resuming =
    initialSave.monthlyAdvance.monthKey === monthKey &&
    ['advancing', 'awaiting-decision'].includes(initialSave.monthlyAdvance.status);
  let save: CareerSaveV3 = {
    ...initialSave,
    monthlyAdvance: {
      ...initialSave.monthlyAdvance,
      monthKey,
      nextWeekIndex: resuming ? initialSave.monthlyAdvance.nextWeekIndex : 0,
      status: 'advancing' as const,
      factIds: resuming ? initialSave.monthlyAdvance.factIds : [],
      matchIds: resuming ? initialSave.monthlyAdvance.matchIds : [],
      interactiveEventCount: resuming ? initialSave.monthlyAdvance.interactiveEventCount : 0,
    },
  };

  while (save.season.currentMonth === monthKey && !save.season.completed) {
    const transition = simulateYouthWeek(save, academies);
    save = {
      ...transition.save,
      seasonStats: accumulateSeasonStats(transition.save.seasonStats, transition.matchResult),
      monthlyAdvance: {
        ...transition.save.monthlyAdvance,
        nextWeekIndex: transition.save.monthlyAdvance.nextWeekIndex + 1,
        factIds: [
          ...transition.save.monthlyAdvance.factIds,
          ...transition.facts.map(({ id }) => id),
        ],
        matchIds: transition.matchResult
          ? [...transition.save.monthlyAdvance.matchIds, transition.matchResult.id]
          : transition.save.monthlyAdvance.matchIds,
      },
    };
    const canInterrupt = save.season.currentMonth === monthKey && !save.season.completed;
    const eventPick = pickYouthEventForWeek(canInterrupt ? events : [], save);
    save = eventPick.save;
    if (eventPick.event?.interaction === 'automatic') {
      save = resolveCareerEvent(save, eventPick.event.choices[0]!.id);
      continue;
    }
    if (eventPick.event) {
      return { status: 'awaiting-decision', save, event: eventPick.event };
    }
  }

  const settlement = settleMonthlyDevelopment(
    save.player,
    save.monthlyAdvance.developmentAccrual as DevelopmentAccrual,
  );
  const monthFactIds = save.monthlyAdvance.factIds;
  const matchIds = save.monthlyAdvance.matchIds;
  const facts = save.ledger.filter(({ id }) => monthFactIds.includes(id));
  const settlementFact: CareerLedgerEntryV2 = {
    id: `settlement-${monthKey}`,
    weekKey: `${save.season.startDate.slice(0, 4)}-W${String(save.season.currentWeek).padStart(2, '0')}`,
    type: 'monthly-settlement',
    summary: settlement.attributeChanges.length
      ? `月末成长结算：${settlement.attributeChanges.map(({ attribute, oldValue, newValue }) => `${attribute} ${oldValue}→${newValue}`).join('，')}`
      : '月末成长结算：本月没有可见属性提升',
    participantIds: [],
  };
  const pathwayRng = createSeededRandomSource(save.randomState.seed);
  for (let index = 0; index < save.randomState.sequencePosition; index += 1) pathwayRng.next();
  const pathway = advanceFirstTeamPathway(save, pathwayRng);
  save = {
    ...save,
    player: settlement.player,
    clubContext: {
      ...save.clubContext,
      firstTeamStage: pathway.nextStage,
      playerRole: roleFromEvaluation(save.clubContext.coachEvaluation),
    },
    monthlyAdvance: {
      monthKey: save.season.currentMonth,
      nextWeekIndex: 0,
      totalWeeks: 4,
      status: 'report-ready',
      developmentAccrual: settlement.remainingAccrual,
      factIds: [],
      matchIds: [],
      interactiveEventCount: 0,
    },
    ledger: [...save.ledger, settlementFact, ...pathway.facts],
    randomState: { ...save.randomState, sequencePosition: pathwayRng.getPosition() },
  };
  const report: MonthlyReport = {
    monthKey,
    facts: [...facts, settlementFact, ...pathway.facts],
    attributeChanges: settlement.attributeChanges,
    stateSummary: {
      ...save.currentState,
      fitness: save.health.fitness,
      fatigue: save.health.fatigue,
    },
    matchIds,
  };
  return { status: save.season.completed ? 'season-complete' : 'month-complete', save, report };
};

const roleFromEvaluation = (evaluation: number): CareerSaveV3['clubContext']['playerRole'] => {
  if (evaluation >= 72) return 'starter';
  if (evaluation >= 60) return 'regular';
  if (evaluation >= 46) return 'rotation';
  return 'fringe';
};

const emptySeasonStats = (): CareerSaveV3['seasonStats'] => ({
  appearances: 0,
  goals: 0,
  assists: 0,
  ratingSum: 0,
  ratingCount: 0,
});

const accumulateSeasonStats = (
  stats: CareerSaveV3['seasonStats'] | undefined,
  match: YouthMatchResultV2 | null,
): CareerSaveV3['seasonStats'] => {
  if (!match) return stats ?? emptySeasonStats();
  const base = stats ?? emptySeasonStats();
  return {
    appearances: base.appearances + (match.played ? 1 : 0),
    goals: base.goals + match.goals,
    assists: base.assists + match.assists,
    ratingSum: base.ratingSum + (match.rating ?? 0),
    ratingCount: base.ratingCount + (match.rating == null ? 0 : 1),
  };
};
