import type {
  CareerSaveV5Like,
  CareerSaveV7,
  ClubProfile,
  EventDefinition,
  NodeAdvanceRecord,
  NodeBrief,
  NodeStopReason,
  YouthAcademyProfile,
  YouthEventInstance,
} from '@football/contracts';
import { migrateCareerSaveV7 } from '@football/contracts';
import {
  advanceToNextNode as advanceNode,
  summarizeMonth,
  type NodeAdvanceTransition,
} from '@football/simulation';
import { advanceCareerMonth } from './advance-career-month';
import { buildNodeBrief } from './build-node-brief';
import { completeYouthSeason } from './complete-youth-season';
import type { YouthSeasonOutcome } from './complete-youth-season';
import { advanceProMonth, completeProfessionalSeason } from './pro-flow';

export interface AdvanceToNodeContent {
  academies: readonly YouthAcademyProfile[];
  clubs: readonly ClubProfile[];
  events: readonly EventDefinition[];
}

export interface AdvanceToNodeResult {
  save: CareerSaveV7;
  skippedMonths: ReturnType<typeof summarizeMonth>[];
  stopReason: NodeStopReason;
  stopAt: CareerSaveV7;
  stopEvent?: YouthEventInstance;
  brief: NodeBrief;
  youthOutcome?: YouthSeasonOutcome;
}

export const advanceToNextNode = (
  initialSave: CareerSaveV7,
  content: AdvanceToNodeContent,
): AdvanceToNodeResult => {
  if (initialSave.careerPhase !== 'youth-season' && initialSave.careerPhase !== 'pro-season') {
    throw new Error(`当前阶段 ${initialSave.careerPhase} 不能推进到下一个节点`);
  }

  const start = clearNodeAdvance(initialSave);
  const node = advanceNode<CareerSaveV7>(start, (current) => {
    if (current.careerPhase === 'pro-season') {
      return advanceProTransition(current, content);
    }
    return advanceYouthTransition(current, content);
  });

  let stopAt = migrateCareerSaveV7(node.stopAt);
  let stopReason = node.stopReason;
  let stopEvent = node.stopEvent;
  let youthOutcome: YouthSeasonOutcome | undefined;

  if (stopReason === 'season-end') {
    if (stopAt.careerPhase === 'pro-season') {
      const settled = completeProfessionalSeason(toApplicationSave(stopAt));
      stopAt = migrateCareerSaveV7(settled.save);
      stopEvent = stopAt.story.pendingEvent ?? undefined;
      stopReason =
        stopEvent?.storyId === 'national-team-debut'
          ? 'national-team'
          : stopAt.pendingOffers.length > 0
            ? 'offer'
            : 'season-end';
    } else {
      const settled = completeYouthSeason(toApplicationSave(stopAt));
      stopAt = migrateCareerSaveV7(settled.save);
      youthOutcome = settled.outcome;
    }
  }

  const brief = buildNodeBrief(node.skippedMonths, stopReason, stopEvent, currentMonthKey(stopAt));
  const record: NodeAdvanceRecord = {
    brief,
    skippedMonths: node.skippedMonths,
    stopReason,
    stopEventTitle: stopEvent?.title ?? null,
  };
  const finalSave = migrateCareerSaveV7({
    ...stopAt,
    lastMonthlyReport: null,
    monthlyAdvance: {
      ...stopAt.monthlyAdvance,
      nodeAdvance: record,
    },
  });

  return {
    save: finalSave,
    skippedMonths: node.skippedMonths,
    stopReason,
    stopAt: finalSave,
    ...(stopEvent ? { stopEvent } : {}),
    brief,
    ...(youthOutcome ? { youthOutcome } : {}),
  };
};

const advanceYouthTransition = (
  current: CareerSaveV7,
  content: AdvanceToNodeContent,
): NodeAdvanceTransition<CareerSaveV7> => {
  const outcome = advanceCareerMonth(current, content.academies, content.events);
  if (outcome.status === 'awaiting-decision') return outcome;
  return {
    ...outcome,
    report: outcome.report,
  };
};

const advanceProTransition = (
  current: CareerSaveV7,
  content: AdvanceToNodeContent,
): NodeAdvanceTransition<CareerSaveV7> => {
  const outcome = advanceProMonth(current, content.clubs, content.events);
  if (outcome.status === 'awaiting-decision') return outcome;
  return {
    ...outcome,
    report: outcome.report,
  };
};

const clearNodeAdvance = (save: CareerSaveV7): CareerSaveV7 => ({
  ...save,
  lastMonthlyReport: null,
  monthlyAdvance: {
    ...save.monthlyAdvance,
    nodeAdvance: null,
  },
});

const toApplicationSave = (save: CareerSaveV7): CareerSaveV5Like =>
  save as unknown as CareerSaveV5Like;

const currentMonthKey = (save: CareerSaveV7): string =>
  save.careerPhase === 'pro-season'
    ? (save.proSeason?.currentMonth ?? save.season.currentMonth)
    : save.season.currentMonth;
