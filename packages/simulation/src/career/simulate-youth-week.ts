import type {
  CareerLedgerEntryV2,
  CareerSaveV2,
  CareerSaveV2Like,
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
import { academyStrength } from '../match/scheduled-youth-match';
import { simulateScheduledYouthMatch } from '../match/scheduled-youth-match';

export type YouthWeekInputShape = CareerSaveV2Like;

export interface YouthWeekTransition<S = CareerSaveV2> {
  save: S;
  weekKey: string;
  matchResult: YouthMatchResultV2 | null;
  facts: CareerLedgerEntryV2[];
  developmentAccrual: DevelopmentAccrual;
}

export const simulateYouthWeek = <S extends YouthWeekInputShape>(
  save: S,
  academies: readonly YouthAcademyProfile[],
): YouthWeekTransition<S> => {
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
  const facts = createFacts(
    save,
    weekKey,
    load,
    matchResult,
    injury,
    academies,
    matchTags(save, matchResult, academies),
  );
  const nextDate = addDays(save.season.currentDate, 7);
  const fixtures = save.season.fixtures.map((candidate) =>
    fixture && candidate.id === fixture.id
      ? { ...candidate, status: 'played' as const, resultId: matchResult!.id }
      : candidate,
  );
  const nextSave: S = {
    ...save,
    player: { ...save.player, age: deriveAge(save.player.identity.dateOfBirth, nextDate) },
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
    clubContext: {
      ...save.clubContext,
      coachEvaluation: clamp(
        save.clubContext.coachEvaluation +
          evaluationDelta(matchResult) +
          (rng.next() < 0.25 ? 1 : 0),
      ),
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

export const deriveAge = (dateOfBirth: string, currentDate: string): number => {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number);
  const [year, month, day] = currentDate.split('-').map(Number);
  let age = year! - birthYear!;
  if (month! < birthMonth! || (month === birthMonth && day! < birthDay!)) age -= 1;
  return age;
};

const advanceInjury = (injury: CareerSaveV2['health']['activeInjury']) => {
  if (!injury) return { active: null, recovered: null };
  const advanced = { ...injury, recoveredWeeks: injury.recoveredWeeks + 1 };
  return advanced.recoveredWeeks >= advanced.expectedRecoveryWeeks
    ? { active: null, recovered: advanced }
    : { active: advanced, recovered: null };
};

const createFacts = (
  save: CareerSaveV2Like,
  weekKey: string,
  load: number,
  match: YouthMatchResultV2 | null,
  injury: CareerSaveV2['health']['activeInjury'],
  academies: readonly YouthAcademyProfile[],
  tags: string[],
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
      matchContext: {
        opponentStrength: opponentStrengthFor(match, academies),
        isHome: match.isHome,
        played: match.played,
        minutesPlayed: match.minutesPlayed,
        rating: match.rating,
        goals: match.goals,
        assists: match.assists,
      },
      type: 'match',
      summary: `${match.opponentName} ${match.homeScore}:${match.awayScore}；${match.played ? `出场 ${match.minutesPlayed} 分钟，评分 ${match.rating}` : '未出场'}${tags.length ? `；${tags.join('、')}` : ''}`,
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

const opponentStrengthFor = (
  match: YouthMatchResultV2,
  academies: readonly YouthAcademyProfile[],
): number => {
  const opponent = academies.find(({ id }) => id === match.opponentId);
  if (!opponent) return 55;
  return academyStrength(opponent).overall;
};

const matchTags = (
  save: CareerSaveV2Like,
  match: YouthMatchResultV2 | null,
  academies: readonly YouthAcademyProfile[],
): string[] => {
  if (!match) return [];
  const tags: string[] = [];
  if ((match.rating ?? 0) >= 8 || match.goals >= 2 || match.assists >= 2) tags.push('突出表现');
  const own = academies.find(({ id }) => id === save.season.academyId);
  const opponent = academies.find(({ id }) => id === match.opponentId);
  const ownGoals = match.isHome ? match.homeScore : match.awayScore;
  const opponentGoals = match.isHome ? match.awayScore : match.homeScore;
  if (
    own &&
    opponent &&
    opponent.competitionLevel >= own.competitionLevel + 5 &&
    ownGoals > opponentGoals
  ) {
    tags.push('爆冷');
  }
  return tags;
};

const ownScore = (match: YouthMatchResultV2) => (match.isHome ? match.homeScore : match.awayScore);
const moraleDelta = (match: YouthMatchResultV2 | null) =>
  !match ? 0 : ownScore(match) > (match.isHome ? match.awayScore : match.homeScore) ? 2 : -1;
const formDelta = (match: YouthMatchResultV2 | null) =>
  match?.rating == null ? 0 : Math.round(match.rating - 6);
const confidenceDelta = (match: YouthMatchResultV2 | null) =>
  match?.played ? (match.goals + match.assists > 0 ? 2 : 0) : -1;
const evaluationDelta = (match: YouthMatchResultV2 | null) => {
  if (!match?.played || match.rating === null) return 0;
  if (match.rating >= 7.5) return 2;
  if (match.rating >= 6) return 1;
  if (match.rating < 4.5) return -1;
  return 0;
};
