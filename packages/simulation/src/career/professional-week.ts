import type {
  CareerLedgerEntryV2,
  CareerSaveV4Like,
  ClubProfile,
  LeagueStanding,
  YouthMatchResultV2,
} from '@football/contracts';
import { advanceDomesticCup } from './domestic-cup';
import {
  accrueWeeklyDevelopment,
  mergeDevelopmentAccrual,
  type DevelopmentAccrual,
} from '../player-development/development';
import { simulateInjuryRisk } from '../health/injury-model';
import { simulateMatch } from '../match/match-engine';
import { calculatePlayerTeamImpact } from './player-team-impact';

export { calculatePlayerTeamImpact } from './player-team-impact';
import type { Position, TeamStrength } from '@football/contracts';
import { createSeededRandomSource } from '../randomness';
import { deriveAge } from './simulate-youth-week';
import { depthRank } from './pro-squad';

export interface ProWeekTransition<S = CareerSaveV4Like> {
  save: S;
  weekKey: string;
  matchResult: YouthMatchResultV2 | null;
  facts: CareerLedgerEntryV2[];
  developmentAccrual: DevelopmentAccrual;
}

type PlayerProfessionalMatch = {
  match: YouthMatchResultV2;
  competitionId: string;
  opponentStrength: number;
  teamImpact: number;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const addDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const trainingLoad = (intensity: CareerSaveV4Like['trainingPlan']['intensity']) =>
  ({ light: 20, normal: 36, intense: 54 })[intensity];
const recoveryBonus = (focus: CareerSaveV4Like['trainingPlan']['focus']) =>
  focus === 'recovery' ? 8 : 3;

const clubStrength = (club: ClubProfile): TeamStrength => {
  const base = club.tier * 6.2 + club.wageBudget * 0.18;
  return {
    attack: Math.round(base + (club.youthCycle === 'contending' ? 4 : 0)),
    midfield: Math.round(base + club.wageBudget / 20),
    defence: Math.round(base + (club.youthCycle === 'rebuilding' ? -3 : 2)),
    overall: Math.round(base),
  };
};

const applyPlayerImpact = (strength: TeamStrength, impact: number): TeamStrength => ({
  attack: clamp(strength.attack + impact),
  midfield: clamp(strength.midfield + impact),
  defence: clamp(strength.defence + impact),
  overall: clamp(strength.overall + impact),
});

const deriveFixtureSeed = (seed: number, competitionId: string, fixtureId: string): number => {
  let hash = seed | 0;
  for (const character of `${competitionId}:${fixtureId}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return (hash + 0x6d2b79f5) | 0;
};
/**
 * 职业周转移：负荷 → 登场决策 → 比赛（本队 + 同轮其他场次并更新积分榜）→ 健康 → 发展积累。
 * 与青训周共享训练、伤病与比赛引擎；同种子同输入结果完全一致。
 */
export const simulateProfessionalWeek = <S extends CareerSaveV4Like>(
  save: S,
  clubs: readonly ClubProfile[],
): ProWeekTransition<S> => {
  const pro = save.proSeason;
  if (!pro) throw new Error('尚未开启职业赛季');
  if (pro.completed) throw new Error('职业赛季已经结束');
  if (save.story.pendingEvent) throw new Error('有待处理事件，不能继续推进');

  const rng = createSeededRandomSource(save.randomState.seed);
  for (let index = 0; index < save.randomState.sequencePosition; index += 1) rng.next();

  const nextWeek = pro.currentWeek + 1;
  const weekKey = `${pro.startDate.slice(0, 4)}-W${String(nextWeek).padStart(2, '0')}`;
  const leagueFixtures = pro.fixtures.filter(({ weekKey: key }) => key === weekKey);
  const cupFixtures = pro.domesticCup?.fixtures.filter(({ weekKey: key }) => key === weekKey) ?? [];
  const weekFixtures = [...leagueFixtures, ...cupFixtures];
  const ownFixtures = weekFixtures.filter(
    ({ homeClubId, awayClubId }) => homeClubId === pro.clubId || awayClubId === pro.clubId,
  );

  const trainingContribution = trainingLoad(save.trainingPlan.intensity);
  const load =
    (trainingContribution + 8) * 1.15 +
    ownFixtures.length * 12 * (save.trainingPlan.intensity === 'light' ? 0.5 : 1);
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

  const weeklyAccrual = accrueWeeklyDevelopment(save.player, save.trainingPlan, health, 0);
  const developmentAccrual = mergeDevelopmentAccrual(
    save.monthlyAdvance.developmentAccrual as DevelopmentAccrual,
    weeklyAccrual,
  );

  const selection = decideAppearance(save, health, rng, ownFixtures.length > 0);

  const playerMatches: PlayerProfessionalMatch[] = [];
  let domesticCup = pro.domesticCup;
  let standings: LeagueStanding[] = pro.standings;
  const clubById = new Map(clubs.map((club) => [club.id, club]));
  const ownClub = clubById.get(pro.clubId);
  if (!ownClub) throw new Error(`俱乐部 ${pro.clubId} 不在内容包中`);

  for (const fixture of leagueFixtures) {
    const home = clubById.get(fixture.homeClubId);
    const away = clubById.get(fixture.awayClubId);
    if (!home || !away) throw new Error(`固定赛程引用了未知俱乐部：${fixture.id}`);
    const isOwn = fixture.homeClubId === pro.clubId || fixture.awayClubId === pro.clubId;
    const isHome = fixture.homeClubId === pro.clubId;
    const opponent = clubStrength(isHome ? away : home).overall;
    const impact = isOwn ? calculatePlayerTeamImpact(save, health, selection, opponent) : 0;
    const homeStrength = applyPlayerImpact(clubStrength(home), isOwn && isHome ? impact : 0);
    const awayStrength = applyPlayerImpact(clubStrength(away), isOwn && !isHome ? impact : 0);
    const result = simulateMatch(
      home.name,
      away.name,
      homeStrength,
      awayStrength,
      nextWeek,
      Number(pro.startDate.slice(0, 4)),
      rng,
    );
    standings = updateStandings(standings, fixture, result.homeScore, result.awayScore);
    if (isOwn && selection.appearance !== 'unavailable') {
      const match: YouthMatchResultV2 = {
        id: `pro-${fixture.id}`,
        fixtureId: fixture.id,
        opponentId: isHome ? fixture.awayClubId : fixture.homeClubId,
        opponentName: isHome ? away.name : home.name,
        isHome,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        played: selection.appearance === 'starter' || selection.appearance === 'bench',
        minutesPlayed: selection.minutes,
        rating:
          selection.appearance === 'reserve'
            ? reserveRating(rng)
            : matchRating(rng, selection.minutes, result, isHome),
        goals: playerGoals(selection, rng),
        assists: playerAssists(selection, rng),
      };
      playerMatches.push({
        match,
        competitionId: fixture.competitionId,
        opponentStrength: opponent,
        teamImpact: impact,
      });
    }
  }

  for (const fixture of cupFixtures) {
    const cup = domesticCup;
    if (!cup) throw new Error('杯赛赛程存在但职业杯赛状态缺失');
    const home = clubById.get(fixture.homeClubId);
    const away = clubById.get(fixture.awayClubId);
    if (!home || !away) throw new Error(`杯赛赛程引用了未知俱乐部：${fixture.id}`);
    const isOwn = fixture.homeClubId === pro.clubId || fixture.awayClubId === pro.clubId;
    const isHome = fixture.homeClubId === pro.clubId;
    const opponent = clubStrength(isHome ? away : home).overall;
    const impact = isOwn ? calculatePlayerTeamImpact(save, health, selection, opponent) : 0;
    const homeStrength = applyPlayerImpact(clubStrength(home), isOwn && isHome ? impact : 0);
    const awayStrength = applyPlayerImpact(clubStrength(away), isOwn && !isHome ? impact : 0);
    const cupRng = createSeededRandomSource(
      deriveFixtureSeed(save.randomState.seed, fixture.competitionId, fixture.id),
    );
    const result = simulateMatch(
      home.name,
      away.name,
      homeStrength,
      awayStrength,
      nextWeek,
      Number(pro.startDate.slice(0, 4)),
      cupRng,
    );
    if (isOwn && selection.appearance !== 'unavailable') {
      const match: YouthMatchResultV2 = {
        id: `pro-${fixture.id}`,
        fixtureId: fixture.id,
        opponentId: isHome ? fixture.awayClubId : fixture.homeClubId,
        opponentName: isHome ? away.name : home.name,
        isHome,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        played: selection.appearance === 'starter' || selection.appearance === 'bench',
        minutesPlayed: selection.minutes,
        rating:
          selection.appearance === 'reserve'
            ? reserveRating(cupRng)
            : matchRating(cupRng, selection.minutes, result, isHome),
        goals: playerGoals(selection, cupRng),
        assists: playerAssists(selection, cupRng),
      };
      playerMatches.push({
        match,
        competitionId: fixture.competitionId,
        opponentStrength: opponent,
        teamImpact: impact,
      });
    }
    domesticCup = advanceDomesticCup(
      cup,
      fixture.id,
      result.homeScore,
      result.awayScore,
      cupRng.nextInt(0, 1_000_000),
    );
  }
  const matchResult = playerMatches.at(-1)?.match ?? null;
  const facts = createProFacts(
    save,
    weekKey,
    trainingContribution,
    load,
    playerMatches,
    selection,
    injury,
  );
  const nextDate = addDays(pro.currentDate, 7);
  const playedIds = new Set(leagueFixtures.map(({ id }) => id));
  const fixtures = pro.fixtures.map((fixture) =>
    playedIds.has(fixture.id)
      ? {
          ...fixture,
          status: 'played' as const,
          resultId: `pro-${fixture.id}`,
        }
      : fixture,
  );
  const normalizedProStats = {
    ...save.proSeasonStats,
    cupAppearances: save.proSeasonStats.cupAppearances ?? 0,
    cupMinutes: save.proSeasonStats.cupMinutes ?? 0,
    cupGoals: save.proSeasonStats.cupGoals ?? 0,
    cupAssists: save.proSeasonStats.cupAssists ?? 0,
  };
  const leagueMatches = playerMatches.filter(
    ({ competitionId }) => competitionId !== 'domestic-cup',
  );
  const cupMatches = playerMatches.filter(({ competitionId }) => competitionId === 'domestic-cup');
  const playedLeagueMatches = leagueMatches.filter(({ match }) => match.played);
  const playedCupMatches = cupMatches.filter(({ match }) => match.played);
  const sumMatchField = (
    matches: readonly PlayerProfessionalMatch[],
    field: 'minutesPlayed' | 'goals' | 'assists',
  ) => matches.reduce((sum, { match }) => sum + match[field], 0);
  const ratingMatches = leagueMatches.filter(({ match }) => match.rating != null);

  const proStats = {
    leagueAppearances: save.proSeasonStats.leagueAppearances + playedLeagueMatches.length,
    reserveAppearances:
      save.proSeasonStats.reserveAppearances +
      leagueMatches.filter(({ match }) => !match.played).length,
    minutes: save.proSeasonStats.minutes + sumMatchField(playedLeagueMatches, 'minutesPlayed'),
    goals: save.proSeasonStats.goals + sumMatchField(leagueMatches, 'goals'),
    assists: save.proSeasonStats.assists + sumMatchField(leagueMatches, 'assists'),
    ratingSum:
      save.proSeasonStats.ratingSum +
      ratingMatches.reduce((sum, { match }) => sum + (match.rating ?? 0), 0),
    ratingCount: save.proSeasonStats.ratingCount + ratingMatches.length,
    cupAppearances: normalizedProStats.cupAppearances + playedCupMatches.length,
    cupMinutes: normalizedProStats.cupMinutes + sumMatchField(playedCupMatches, 'minutesPlayed'),
    cupGoals: normalizedProStats.cupGoals + sumMatchField(playedCupMatches, 'goals'),
    cupAssists: normalizedProStats.cupAssists + sumMatchField(playedCupMatches, 'assists'),
  };

  const nextSave: S = {
    ...save,
    player: {
      ...save.player,
      age: deriveAge(save.player.identity.dateOfBirth, nextDate),
    },
    health,
    currentState: {
      morale: clamp(
        Math.round(
          save.currentState.morale + moraleDelta(matchResult) - overseasMoralePenalty(save),
        ),
      ),
      form: clamp(save.currentState.form + formDelta(matchResult)),
      confidence: clamp(save.currentState.confidence + confidenceDelta(matchResult)),
    },
    proSeason: {
      ...pro,
      currentDate: nextDate,
      currentWeek: nextWeek,
      currentMonth: nextDate.slice(0, 7),
      fixtures,
      standings,
      domesticCup,
      completed: nextDate >= pro.endDate,
    },
    proSeasonStats: proStats,
    monthlyAdvance: {
      ...save.monthlyAdvance,
      developmentAccrual,
      status: 'advancing',
    },
    ledger: [...save.ledger, ...facts],
    randomState: { ...save.randomState, sequencePosition: rng.getPosition() },
  };

  return { save: nextSave, weekKey, matchResult, facts, developmentAccrual };
};

export interface ProAppearanceDecision {
  appearance: 'starter' | 'bench' | 'reserve' | 'unavailable';
  minutes: number;
  selectionScore: number;
  threshold: number;
}

/** 登场决策（设计 §5.3）：承诺修正、竞争压制、伤病疲劳硬门槛。 */
export const decideAppearance = (
  save: CareerSaveV4Like,
  health: CareerSaveV4Like['health'],
  rng: ReturnType<typeof createSeededRandomSource>,
  hasFixture: boolean,
): ProAppearanceDecision => {
  if (health.activeInjury || health.fitness < 30 || !hasFixture) {
    return { appearance: 'unavailable', minutes: 0, selectionScore: 0, threshold: 0 };
  }
  const pro = save.proSeason!;
  const contract = save.contract;
  const rank = depthRank(
    pro.depthChart,
    save.player.identity.primaryPosition as Position,
    'player',
  );
  const depthScore = Math.max(20, 100 - (rank - 1) * 12);
  const trainingPerf = clamp(50 + save.player.development.professionalism / 4 + rng.next() * 20);
  let threshold = 62;
  if (contract?.squadRole === 'first-team-rotation') threshold -= 6;
  else if (contract?.squadRole === 'rotation') threshold -= 3;
  const promise = contract?.promise;
  if (promise?.kind === 'playing-time') {
    threshold -= promise.minimumShare >= 0.5 ? 6 : 3;
  }
  if (promise?.kind === 'position-guarantee') threshold -= 3;
  const rivals = pro.squad
    .filter(
      ({ primaryPosition, personId }) =>
        primaryPosition === save.player.identity.primaryPosition && personId !== 'player',
    )
    .map(({ currentAbility }) => currentAbility);
  const playerAbility = weightedPlayerAbility(save);
  if (rivals.length > 0 && Math.max(...rivals) > playerAbility + 8) threshold += 8;
  const lastReview = save.promiseReviews.at(-1);
  if (lastReview?.status === 'broken' && lastReview.cause === 'club') threshold -= 4;
  if (health.fatigue >= 80) threshold -= 10;

  const selectionScore = Math.round(
    save.clubContext.coachEvaluation * 0.35 +
      save.currentState.form * 0.2 +
      health.fitness * 0.15 +
      depthScore * 0.2 +
      trainingPerf * 0.1,
  );
  if (selectionScore >= threshold) {
    return {
      appearance: 'starter',
      minutes: 60 + Math.floor(rng.next() * 31),
      selectionScore,
      threshold,
    };
  }
  if (selectionScore >= 40) {
    return {
      appearance: 'bench',
      minutes: 10 + Math.floor(rng.next() * 26),
      selectionScore,
      threshold,
    };
  }
  return {
    appearance: 'reserve',
    minutes: 60 + Math.floor(rng.next() * 31),
    selectionScore,
    threshold,
  };
};

const weightedPlayerAbility = (save: CareerSaveV4Like): number => {
  const { technical, physical, mental } = save.player.attributes;
  const values: number[] = [
    ...Object.values(technical),
    ...Object.values(physical),
    ...Object.values(mental),
  ];
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const playerGoals = (
  selection: ProAppearanceDecision,
  rng: ReturnType<typeof createSeededRandomSource>,
): number => {
  if (selection.appearance === 'unavailable') return 0;
  const chance = (selection.minutes / 90) * 0.22;
  return rng.next() < chance ? 1 : 0;
};

const playerAssists = (
  selection: ProAppearanceDecision,
  rng: ReturnType<typeof createSeededRandomSource>,
): number => {
  if (selection.appearance === 'unavailable') return 0;
  const chance = (selection.minutes / 90) * 0.26;
  return rng.next() < chance ? 1 : 0;
};

const matchRating = (
  rng: ReturnType<typeof createSeededRandomSource>,
  minutes: number,
  result: { homeScore: number; awayScore: number },
  isHome: boolean,
): number => {
  if (minutes <= 0) return 0;
  const own = isHome ? result.homeScore : result.awayScore;
  const against = isHome ? result.awayScore : result.homeScore;
  let rating = 6 + (own > against ? 0.6 : own === against ? 0.1 : -0.4) + (rng.next() - 0.5) * 2;
  return Math.min(10, Math.max(3, Math.round(rating * 10) / 10));
};

const reserveRating = (rng: ReturnType<typeof createSeededRandomSource>): number =>
  Math.min(10, Math.max(4, Math.round((6 + (rng.next() - 0.5) * 2) * 10) / 10));

/** 留洋适应损耗（设计 §6）：首季每周 -(100-适应力)/25，次季减半，之后归零。 */
const overseasMoralePenalty = (save: CareerSaveV4Like): number => {
  if (!save.overseasSince) return 0;
  const seasonYear = Number(save.proSeason?.startDate.slice(0, 4) ?? 0);
  const years = seasonYear - Number(save.overseasSince.slice(0, 4));
  const full = (100 - save.player.development.adaptability) / 25;
  if (years <= 0) return Math.round(full * 10) / 10;
  if (years === 1) return Math.round((full / 2) * 10) / 10;
  return 0;
};

const moraleDelta = (match: YouthMatchResultV2 | null) =>
  !match
    ? 0
    : (match.isHome ? match.homeScore : match.awayScore) >
        (match.isHome ? match.awayScore : match.homeScore)
      ? 2
      : -1;
const formDelta = (match: YouthMatchResultV2 | null) =>
  match?.rating == null ? 0 : Math.round(match.rating - 6);
const confidenceDelta = (match: YouthMatchResultV2 | null) =>
  match?.played ? (match.goals + match.assists > 0 ? 2 : 0) : -1;

const createProFacts = (
  save: CareerSaveV4Like,
  weekKey: string,
  trainingContribution: number,
  load: number,
  playerMatches: readonly PlayerProfessionalMatch[],
  selection: ProAppearanceDecision,
  injury: CareerSaveV4Like['health']['activeInjury'],
): CareerLedgerEntryV2[] => {
  const facts: CareerLedgerEntryV2[] = [
    {
      id: `pro-training-${weekKey}`,
      weekKey,
      type: 'training',
      summary: `${save.trainingPlan.focus}/${save.trainingPlan.intensity}，周负荷 ${Math.round(load)}`,
      participantIds: [],
      trainingContext: {
        focus: save.trainingPlan.focus,
        intensity: save.trainingPlan.intensity,
        trainingLoad: trainingContribution,
        totalLoad: load,
      },
    },
  ];
  for (const { match, competitionId, opponentStrength, teamImpact } of playerMatches) {
    const appearanceText =
      match.played && selection.appearance === 'starter'
        ? `首发 ${match.minutesPlayed} 分钟`
        : match.played
          ? `替补 ${match.minutesPlayed} 分钟`
          : '预备队出场';
    facts.push({
      id: match.id,
      weekKey,
      type: 'pro-match',
      matchContext: {
        competitionId,
        teamImpact,
        opponentStrength,
        isHome: match.isHome,
        played: match.played,
        minutesPlayed: match.minutesPlayed,
        rating: match.rating,
        goals: match.goals,
        assists: match.assists,
      },
      summary: `${competitionId === 'domestic-cup' ? '国内杯' : '联赛'}：${match.opponentName} ${match.homeScore}:${match.awayScore}；${appearanceText}${match.rating != null ? `，评分 ${match.rating}` : ''}${match.goals + match.assists > 0 ? `；${match.goals} 球 ${match.assists} 助攻` : ''}`,
      participantIds: ['player'],
    });
  }
  if (injury) {
    facts.push({
      id: `pro-injury-${weekKey}`,
      weekKey,
      type: 'health',
      summary: `${injury.bodyArea}${injury.kind}，预计恢复 ${injury.expectedRecoveryWeeks} 周`,
      participantIds: [],
    });
  }
  return facts;
};

const advanceInjury = (injury: CareerSaveV4Like['health']['activeInjury']) => {
  if (!injury) return { active: null, recovered: null };
  const advanced = { ...injury, recoveredWeeks: injury.recoveredWeeks + 1 };
  return advanced.recoveredWeeks >= advanced.expectedRecoveryWeeks
    ? { active: null, recovered: advanced }
    : { active: advanced, recovered: null };
};

const updateStandings = (
  standings: LeagueStanding[],
  fixture: { homeClubId: string; awayClubId: string },
  homeScore: number,
  awayScore: number,
): LeagueStanding[] => {
  return standings.map((standing) => {
    if (standing.clubId === fixture.homeClubId)
      return applyStanding(standing, homeScore, awayScore);
    if (standing.clubId === fixture.awayClubId)
      return applyStanding(standing, awayScore, homeScore);
    return standing;
  });
};

const applyStanding = (
  standing: LeagueStanding,
  goalsFor: number,
  goalsAgainst: number,
): LeagueStanding => {
  const isWin = goalsFor > goalsAgainst;
  const isDraw = goalsFor === goalsAgainst;
  return {
    ...standing,
    played: standing.played + 1,
    won: standing.won + (isWin ? 1 : 0),
    drawn: standing.drawn + (isDraw ? 1 : 0),
    lost: standing.lost + (!isWin && !isDraw ? 1 : 0),
    goalsFor: standing.goalsFor + goalsFor,
    goalsAgainst: standing.goalsAgainst + goalsAgainst,
    points: standing.points + (isWin ? 3 : isDraw ? 1 : 0),
  };
};
