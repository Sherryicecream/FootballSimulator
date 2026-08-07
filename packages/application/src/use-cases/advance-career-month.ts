import type {
  CareerLedgerEntryV2,
  CareerSaveV2,
  MonthlyReport,
  YouthAcademyProfile,
} from '@football/contracts';
import {
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
  let save: CareerSaveV2 = {
    ...initialSave,
    monthlyAdvance: {
      ...initialSave.monthlyAdvance,
      monthKey,
      nextWeekIndex: 0,
      status: 'advancing' as const,
    },
  };
  const facts: CareerLedgerEntryV2[] = [];
  const matchIds: string[] = [];

  while (save.season.currentMonth === monthKey && !save.season.completed) {
    const transition = simulateYouthWeek(save, academies);
    save = {
      ...transition.save,
      monthlyAdvance: {
        ...transition.save.monthlyAdvance,
        nextWeekIndex: transition.save.monthlyAdvance.nextWeekIndex + 1,
      },
    };
    facts.push(...transition.facts);
    if (transition.matchResult) matchIds.push(transition.matchResult.id);
  }

  const settlement = settleMonthlyDevelopment(
    save.player,
    save.monthlyAdvance.developmentAccrual as DevelopmentAccrual,
  );
  const settlementFact: CareerLedgerEntryV2 = {
    id: `settlement-${monthKey}`,
    weekKey: `${save.season.startDate.slice(0, 4)}-W${String(save.season.currentWeek).padStart(2, '0')}`,
    type: 'monthly-settlement',
    summary: settlement.attributeChanges.length
      ? `月末成长结算：${settlement.attributeChanges.map(({ attribute, oldValue, newValue }) => `${attribute} ${oldValue}→${newValue}`).join('，')}`
      : '月末成长结算：本月没有可见属性提升',
    participantIds: [],
  };
  save = {
    ...save,
    player: settlement.player,
    monthlyAdvance: {
      monthKey: save.season.currentMonth,
      nextWeekIndex: 0,
      totalWeeks: 4,
      status: 'report-ready',
      developmentAccrual: settlement.remainingAccrual,
    },
    ledger: [...save.ledger, settlementFact],
  };
  const report: MonthlyReport = {
    monthKey,
    facts: [...facts, settlementFact],
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
