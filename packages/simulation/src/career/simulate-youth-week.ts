import type {
  CareerLedgerEntryV2,
  CareerSaveV2,
  YouthAcademyProfile,
  YouthMatchResultV2,
} from '@football/contracts';
import {
  accrueWeeklyDevelopment,
  mergeDevelopmentAccrual,
  type DevelopmentAccrual,
} from '../player-development/development';
import { simulateInjuryRisk } from '../health/injury-model';
import { createSeededRandomSource } from '../randomness';
import { simulateScheduledYouthMatch } from '../match/scheduled-youth-match';

export interface YouthWeekTransition {
  save: CareerSaveV2;
  weekKey: string;
  matchResult: YouthMatchResultV2 | null;
  facts: CareerLedgerEntryV2[];
  developmentAccrual: DevelopmentAccrual;
}

export const simulateYouthWeek = (
  save: CareerSaveV2,
  academies: readonly YouthAcademyProfile[],
): YouthWeekTransition => {
  if (save.season.completed) throw new Error('青训赛季已经结束');
  if (save.story.pendingEvent) throw new Error('有待处理事件，不能继续推进');

  const rng = createSeededRandomSource(save.randomState.seed);
  for (let index = 0; index < save.randomState.sequencePosition; index += 1) rng.next();
  const nextWeek = save.season.currentWeek + 1;
  const weekKey = `${save.season.startDate.slice(0, 4)}-W${String(nextWeek).padStart(2, '0')}`;
  const fixture = save.season.fixtures.find(
    (candidate) => candidate.weekKey === weekKey && candidate.status === 'scheduled',
  );
  const matchResult = fixture ? simulateScheduledYouthMatch(save, fixture, academies, rng) : null;
  const load = trainingLoad(save.trainingPlan.intensity) + (matchResult?.minutesPlayed ?? 0) * 0.42;
  const recoveredInjury = advanceInjury(save.health.activeInjury);
  let health = {
    ...save.health,
    activeInjury: recoveredInjury.active,
    previousInjuries: recoveredInjury.recovered
      ? [...save.health.previousInjuries, recoveredInjury.recovered]
      : save.health.previousInjuries,
    recentLoad: Math.min(100, Math.round(save.health.recentLoad * 0.55 + load * 0.45)),
    fatigue: clamp(
      Math.round(save.health.fatigue * 0.78 + load * 0.22 - recoveryBonus(save.trainingPlan.focus)),
    ),
    fitness: clamp(Math.round(save.health.fitness + 8 - load * 0.13 - save.health.fatigue * 0.025)),
  };
  const injury = simulateInjuryRisk(save.player.development, health, load, weekKey, rng);
  if (injury) health = { ...health, activeInjury: injury };
  const weeklyAccrual = accrueWeeklyDevelopment(
    save.player,
    save.trainingPlan,
    health,
    matchResult?.minutesPlayed ?? 0,
  );
  const developmentAccrual = mergeDevelopmentAccrual(
    save.monthlyAdvance.developmentAccrual as DevelopmentAccrual,
    weeklyAccrual,
  );
  const facts = createFacts(save, weekKey, load, matchResult, injury);
  const nextDate = addDays(save.season.currentDate, 7);
  const fixtures = save.season.fixtures.map((candidate) =>
    fixture && candidate.id === fixture.id
      ? { ...candidate, status: 'played' as const, resultId: matchResult!.id }
      : candidate,
  );
  const nextSave: CareerSaveV2 = {
    ...save,
    season: {
      ...save.season,
      currentDate: nextDate,
      currentWeek: nextWeek,
      currentMonth: nextDate.slice(0, 7),
      fixtures,
      completed: nextDate >= save.season.endDate,
    },
    health,
    currentState: {
      morale: clamp(save.currentState.morale + moraleDelta(matchResult)),
      form: clamp(save.currentState.form + formDelta(matchResult)),
      confidence: clamp(save.currentState.confidence + confidenceDelta(matchResult)),
    },
    monthlyAdvance: { ...save.monthlyAdvance, developmentAccrual, status: 'advancing' },
    ledger: [...save.ledger, ...facts],
    randomState: { ...save.randomState, sequencePosition: rng.getPosition() },
  };
  return { save: nextSave, weekKey, matchResult, facts, developmentAccrual };
};

const trainingLoad = (intensity: CareerSaveV2['trainingPlan']['intensity']) =>
  ({ light: 20, normal: 36, intense: 54 })[intensity];
const recoveryBonus = (focus: CareerSaveV2['trainingPlan']['focus']) =>
  focus === 'recovery' ? 8 : 3;
const clamp = (value: number) => Math.min(100, Math.max(0, value));
const addDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const advanceInjury = (injury: CareerSaveV2['health']['activeInjury']) => {
  if (!injury) return { active: null, recovered: null };
  const advanced = { ...injury, recoveredWeeks: injury.recoveredWeeks + 1 };
  return advanced.recoveredWeeks >= advanced.expectedRecoveryWeeks
    ? { active: null, recovered: advanced }
    : { active: advanced, recovered: null };
};

const createFacts = (
  save: CareerSaveV2,
  weekKey: string,
  load: number,
  match: YouthMatchResultV2 | null,
  injury: CareerSaveV2['health']['activeInjury'],
): CareerLedgerEntryV2[] => {
  const facts: CareerLedgerEntryV2[] = [
    {
      id: `training-${weekKey}`,
      weekKey,
      type: 'training',
      summary: `${save.trainingPlan.focus}/${save.trainingPlan.intensity}，周负荷 ${Math.round(load)}`,
      participantIds: [],
    },
  ];
  if (match)
    facts.push({
      id: match.id,
      weekKey,
      type: 'match',
      summary: `${match.opponentName} ${match.homeScore}:${match.awayScore}；${match.played ? `出场 ${match.minutesPlayed} 分钟` : '未出场'}`,
      participantIds: [],
    });
  if (injury)
    facts.push({
      id: injury.id,
      weekKey,
      type: 'health',
      summary: `${injury.bodyArea}${injury.kind}，预计恢复 ${injury.expectedRecoveryWeeks} 周`,
      participantIds: [],
    });
  return facts;
};

const ownScore = (match: YouthMatchResultV2) => (match.isHome ? match.homeScore : match.awayScore);
const moraleDelta = (match: YouthMatchResultV2 | null) =>
  !match ? 0 : ownScore(match) > (match.isHome ? match.awayScore : match.homeScore) ? 2 : -1;
const formDelta = (match: YouthMatchResultV2 | null) =>
  match?.rating == null ? 0 : Math.round(match.rating - 6);
const confidenceDelta = (match: YouthMatchResultV2 | null) =>
  match?.played ? (match.goals + match.assists > 0 ? 2 : 0) : -1;
