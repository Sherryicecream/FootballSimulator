import type {
  CareerLedgerEntryV2,
  CareerSaveV2,
  MonthlyReport,
  YouthAcademyProfile,
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

export type AdvanceMonthOutcome =
  | {
      status: 'awaiting-decision';
      save: CareerSaveV2;
      event: NonNullable<CareerSaveV2['story']['pendingEvent']>;
    }
  | { status: 'month-complete'; save: CareerSaveV2; report: MonthlyReport }
  | { status: 'season-complete'; save: CareerSaveV2; report: MonthlyReport };

export const advanceCareerMonth = (
  initialSave: CareerSaveV2,
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
  let save: CareerSaveV2 = {
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

const roleFromEvaluation = (evaluation: number): CareerSaveV2['clubContext']['playerRole'] => {
  if (evaluation >= 72) return 'starter';
  if (evaluation >= 60) return 'regular';
  if (evaluation >= 46) return 'rotation';
  return 'fringe';
};
