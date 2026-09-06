import type {
  CareerLedgerEntryV2,
  MonthlyReport,
  CareerSaveV4Like,
  CareerSaveV5Like,
  LoanHistoryEntry,
  ClubProfile,
  EventDefinition,
  LeagueStanding,
  Position,
  SeasonHonour,
  SeasonHistorySummary,
} from '@football/contracts';
import { retire as retireCareer, returnFromLoan } from './transfer-flow';
import {
  applyAgeDecline,
  accrueNationalTeam,
  buildMonthlyMomentum,
  buildMatchdayMoments,
  buildStoryProgress,
  buildTrainingFeedback,
  buildDepthChart,
  buildRenewalOffer,
  createLeagueFixtures,
  createDomesticCup,
  createLeagueStandings,
  createSeededRandomSource,
  generateProSquad,
  isEligibleForNationalTeam,
  mergeDevelopmentAccrual,
  pickYouthEventForWeek,
  pickMatchMomentForWeek,
  reviewPromise,
  settleMonthlyDevelopment,
  simulateProfessionalWeek,
  weightedAbility,
} from '@football/simulation';
import type { DevelopmentAccrual } from '@football/simulation';
import { resolveCareerEvent } from './resolve-career-event';
import { applyReputationGain, leagueTierFactor } from '@football/simulation';

const ensureContract = (save: CareerSaveV4Like) => {
  if (!save.contract) throw new Error('没有生效的职业合同');
  return save.contract;
};

/** 开启职业赛季（设计 §5）：阵容、双循环赛程与积分榜生成后立即固化。 */
export const startProfessionalSeason = <S extends CareerSaveV4Like>(
  save: S,
  clubs: readonly ClubProfile[],
): S => {
  if (save.careerPhase !== 'professional-contract' && save.careerPhase !== 'pro-offseason') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能开启职业赛季`);
  }
  const contract = ensureContract(save);
  const activeLoan = (save as Partial<CareerSaveV5Like>).activeLoan ?? null;
  if (activeLoan && activeLoan.parentClubId !== contract.clubId) {
    throw new Error('租借母队与当前合同不一致');
  }
  const clubId = activeLoan?.loanClubId ?? contract.clubId;
  const club = clubs.find(({ id }) => id === clubId);
  if (!club) throw new Error(`参赛俱乐部 ${clubId} 不在内容包中`);
  if (activeLoan && club.tier !== activeLoan.loanClubTier) {
    throw new Error(`租借目标队层级 ${club.tier} 与存档 ${activeLoan.loanClubTier} 不一致`);
  }

  // 首个职业赛季从签署年份开始；续赛季从上个职业赛季年份 +1（8 月开赛）
  const year = activeLoan
    ? Number(activeLoan.seasonId.slice(4))
    : save.careerPhase === 'professional-contract'
      ? Number(contract.signedOn.slice(0, 4))
      : save.proSeason
        ? Number(save.proSeason.startDate.slice(0, 4)) + 1
        : 0;
  if (!Number.isFinite(year) || year <= 0) throw new Error('无法确定职业赛季年份');
  if (activeLoan && activeLoan.seasonId !== `pro-${year}`) {
    throw new Error(`租借绑定赛季 ${activeLoan.seasonId} 与开赛年份不一致`);
  }
  const startDate = `${year}-08-01`;
  const effectiveTier =
    activeLoan?.loanClubTier ?? save.proSeason?.nextClubTier ?? contract.clubTier;
  // 海外联赛按区域分组（M11 模块 1）：留洋亚洲/欧洲只在同区域俱乐部间比赛。
  const competitionId = `${club.overseas ? `pro-overseas-${club.overseasRegion ?? 'europe'}-tier` : 'pro-tier'}-${effectiveTier}`;
  const eligibleClubs = clubs.filter(
    ({ overseas, overseasRegion }) =>
      Boolean(overseas) === Boolean(club.overseas) &&
      (club.overseas ? overseasRegion === club.overseasRegion : true),
  );
  const sameTierClubs = eligibleClubs.filter(({ tier }) => tier === effectiveTier);
  const nearbyClubs = eligibleClubs.filter(({ tier }) => Math.abs(tier - effectiveTier) <= 1);
  const preferredClubs =
    sameTierClubs.length >= 4
      ? sameTierClubs
      : nearbyClubs.length >= 4
        ? nearbyClubs
        : eligibleClubs;
  const leagueOpponents = preferredClubs
    .filter(({ id }) => id !== club.id)
    .sort(
      (left, right) =>
        Math.abs(left.tier - effectiveTier) - Math.abs(right.tier - effectiveTier) ||
        left.tier - right.tier ||
        left.id.localeCompare(right.id),
    );
  const leagueClubs = [club, ...leagueOpponents.slice(0, 11)];
  if (leagueClubs.length < 4) throw new Error(`层级 ${effectiveTier} 俱乐部不足，无法组成联赛`);

  const rng = createSeededRandomSource(save.randomState.seed + 5500 + year);
  const playerAbility = weightedAbility(
    save.player.identity.primaryPosition as unknown as Position,
    save.player.attributes,
  );
  const squad = generateProSquad(
    club,
    save.player.identity.primaryPosition as Parameters<typeof generateProSquad>[1],
    playerAbility,
    rng,
  );
  const depthChart = buildDepthChart(squad);
  const position: Position = save.player.identity.primaryPosition as unknown as Position;
  // 球员以能力排入深度图，与竞争者共同参与排序
  const depthList = [...(depthChart[position] ?? []), 'player'];
  depthList.sort((left, right) => {
    const abilityOf = (id: string) =>
      id === 'player'
        ? playerAbility
        : (squad.find(({ personId }) => personId === id)?.currentAbility ?? 0);
    return abilityOf(right) - abilityOf(left);
  });
  depthChart[position] = depthList;

  const fixtures = createLeagueFixtures(
    leagueClubs.map(({ id }) => id),
    competitionId,
    save.randomState.seed + year,
    String(year),
  );

  const domesticCup = club.overseas
    ? null
    : createDomesticCup(
        clubs,
        club.id,
        effectiveTier,
        String(year),
        save.randomState.seed + 7600 + year * 17,
      );
  const cupSummary = domesticCup ? '，国内杯 7 场' : '';

  const fact: CareerLedgerEntryV2 = {
    id: `pro-season-start-${year}`,
    weekKey: `${year}-W31`,
    type: 'decision',
    summary: `开启职业赛季：${club.name}（层级 ${effectiveTier}），阵容 ${squad.length} 人，联赛 ${fixtures.length} 场${cupSummary}`,
    participantIds: [],
  };

  const startingHealth = {
    ...save.health,
    fitness: Math.max(70, save.health.fitness),
    fatigue: Math.min(20, save.health.fatigue),
    recentLoad: 0,
  };
  return {
    ...save,
    contract: activeLoan ? contract : { ...contract, clubTier: effectiveTier },
    careerPhase: 'pro-season',
    proPhase: 'preseason',
    proSeason: {
      id: `pro-${year}`,
      startDate,
      endDate: `${year + 1}-05-31`,
      currentDate: startDate,
      currentWeek: 1,
      currentMonth: `${year}-08`,
      clubId: club.id,
      competitionId,
      domesticCup,
      nextClubTier: null,
      fixtures,
      standings: createLeagueStandings(leagueClubs.map(({ id }) => id)),
      squad,
      depthChart,
      completed: false,
    },
    proSeasonStats: {
      leagueAppearances: 0,
      reserveAppearances: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      ratingSum: 0,
      ratingCount: 0,
      cupAppearances: 0,
      cupMinutes: 0,
      cupGoals: 0,
      cupAssists: 0,
    },
    monthlyAdvance: {
      monthKey: `${year}-08`,
      nextWeekIndex: 0,
      totalWeeks: 4,
      status: 'idle',
      developmentAccrual: {},
      factIds: [],
      matchIds: [],
      interactiveEventCount: 0,
      feedbackStartHealth: startingHealth,
    },
    pendingOffers: [],
    lastMonthlyReport: null,
    health: startingHealth,
    ledger: [...save.ledger, fact],
  };
};

export type AdvanceProMonthOutcome<S = CareerSaveV4Like> =
  | {
      status: 'awaiting-decision';
      save: S;
      event: NonNullable<CareerSaveV4Like['story']['pendingEvent']>;
    }
  | { status: 'month-complete'; save: S; report: MonthlyReport }
  | { status: 'season-complete'; save: S; report: MonthlyReport };

/** 职业月度推进：与青训月度共享事件系统与月末成长结算，比赛与登场走职业周转移。 */
export const advanceProMonth = <S extends CareerSaveV4Like>(
  initialSave: S,
  clubs: readonly ClubProfile[],
  events: readonly EventDefinition[] = [],
): AdvanceProMonthOutcome<S> => {
  if (initialSave.careerPhase !== 'pro-season') {
    throw new Error(`非法阶段转移：当前阶段 ${initialSave.careerPhase} 不能推进职业月度`);
  }
  const pro = initialSave.proSeason;
  if (!pro) throw new Error('职业赛季状态缺失');
  if (pro.completed) throw new Error('职业赛季已经结束');
  const currentClub = clubs.find(({ id }) => id === pro.clubId);
  if (initialSave.story.pendingEvent) {
    return {
      status: 'awaiting-decision',
      save: initialSave,
      event: initialSave.story.pendingEvent,
    };
  }
  if (initialSave.story.pendingFeedback) {
    throw new Error('请先确认事件反馈，再继续推进职业月份');
  }

  const monthKey = pro.currentMonth;
  const resuming =
    initialSave.monthlyAdvance.monthKey === monthKey &&
    ['advancing', 'awaiting-decision'].includes(initialSave.monthlyAdvance.status);
  const monthStartHealth = resuming
    ? (initialSave.monthlyAdvance.feedbackStartHealth ?? initialSave.health)
    : initialSave.health;
  let save: S = {
    ...initialSave,
    monthlyAdvance: {
      ...initialSave.monthlyAdvance,
      monthKey,
      nextWeekIndex: resuming ? initialSave.monthlyAdvance.nextWeekIndex : 0,
      status: 'advancing' as const,
      factIds: resuming ? initialSave.monthlyAdvance.factIds : [],
      matchIds: resuming ? initialSave.monthlyAdvance.matchIds : [],
      interactiveEventCount: resuming ? initialSave.monthlyAdvance.interactiveEventCount : 0,
      feedbackStartHealth: monthStartHealth,
    },
  };

  let matchIds: string[] = resuming ? initialSave.monthlyAdvance.matchIds : [];
  const factsDuringMonth: string[] = resuming ? [] : [];
  let guard = 0;
  while (save.proSeason!.currentMonth === monthKey && !save.proSeason!.completed && guard < 10) {
    const transition = simulateProfessionalWeek(save, clubs);
    save = {
      ...transition.save,
      monthlyAdvance: {
        ...transition.save.monthlyAdvance,
        nextWeekIndex: transition.save.monthlyAdvance.nextWeekIndex + 1,
        factIds: [
          ...transition.save.monthlyAdvance.factIds,
          ...transition.facts.map(({ id }) => id),
        ],
        matchIds: [
          ...transition.save.monthlyAdvance.matchIds,
          ...transition.facts.filter(({ type }) => type === 'pro-match').map(({ id }) => id),
        ],
      },
    };
    matchIds = save.monthlyAdvance.matchIds;
    const canInterrupt = save.proSeason!.currentMonth === monthKey && !save.proSeason!.completed;
    factsDuringMonth.push(...transition.facts.map(({ id }) => id));
    const matchMoment = pickMatchMomentForWeek(save, transition.facts);
    if (matchMoment && canInterrupt) {
      return {
        status: 'awaiting-decision',
        save: {
          ...matchMoment.save,
          monthlyAdvance: {
            ...matchMoment.save.monthlyAdvance,
            interactiveEventCount: save.monthlyAdvance.interactiveEventCount + 1,
          },
        },
        event: matchMoment.event,
      };
    }
    const eventPick = pickYouthEventForWeek(
      canInterrupt ? [...events] : [],
      save,
      currentClub ? { currentClub } : {},
    );
    save = eventPick.save;
    if (eventPick.event?.interaction === 'automatic') {
      save = resolveCareerEvent(
        save as unknown as never,
        eventPick.event.choices[0]!.id,
      ) as unknown as S;
      guard += 1;
      continue;
    }
    if (eventPick.event) {
      return { status: 'awaiting-decision', save, event: eventPick.event };
    }
    guard += 1;
  }

  // 月末成长结算（与青训共用同一结算函数）
  const settlement = settleMonthlyDevelopment(
    save.player,
    save.monthlyAdvance.developmentAccrual as DevelopmentAccrual,
  );
  const ageDecline = applyAgeDecline(
    { ...save, player: settlement.player },
    createSeededRandomSource(save.randomState.seed + 8800 + Number(monthKey.replace('-', ''))),
  );
  const attributeChanges = [...settlement.attributeChanges, ...ageDecline.changes];
  const ageDeclineSummary = ageDecline.changes.length
    ? `；年龄衰退：${ageDecline.changes
        .map(({ attribute, oldValue, newValue }) => `${attribute} ${oldValue}→${newValue}`)
        .join('，')}`
    : '';
  const settlementFact: CareerLedgerEntryV2 = {
    id: `pro-settlement-${save.proSeason!.currentMonth}`,
    weekKey: `${save.proSeason!.startDate.slice(0, 4)}-W${String(save.proSeason!.currentWeek).padStart(2, '0')}`,
    type: 'monthly-settlement',
    summary: attributeChanges.length
      ? `月末成长结算：${attributeChanges
          .map(({ attribute, oldValue, newValue }) => `${attribute} ${oldValue}→${newValue}`)
          .join('，')}${ageDeclineSummary}`
      : '月末成长结算：本月没有可见属性提升',
    participantIds: [],
  };
  save = {
    ...save,
    player: ageDecline.player,
    proPhase: 'league',
    monthlyAdvance: {
      monthKey: save.proSeason!.currentMonth,
      nextWeekIndex: 0,
      totalWeeks: 4,
      status: 'report-ready',
      developmentAccrual: settlement.remainingAccrual,
      factIds: [],
      matchIds: [],
      interactiveEventCount: 0,
      feedbackStartHealth: null,
    },
    ledger: [...save.ledger, settlementFact],
  };
  const monthFactIds = [...initialSave.monthlyAdvance.factIds, ...factsDuringMonth];
  const reportFacts = save.ledger.filter(({ id }) => monthFactIds.includes(id));
  const trainingFeedback = buildTrainingFeedback({
    plan: save.trainingPlan,
    facts: reportFacts,
    startHealth: monthStartHealth,
    endHealth: save.health,
    attributeChanges,
  });
  const report: MonthlyReport = {
    monthKey,
    facts: reportFacts,
    attributeChanges,
    stateSummary: {
      ...save.currentState,
      fitness: save.health.fitness,
      fatigue: save.health.fatigue,
    },
    matchIds,
    ...(trainingFeedback ? { trainingFeedback } : {}),
    momentum: buildMonthlyMomentum(reportFacts, attributeChanges),
    storyProgress: buildStoryProgress(save, events),
    matchdayMoments: buildMatchdayMoments(reportFacts),
  };
  save = { ...save, lastMonthlyReport: report };
  void mergeDevelopmentAccrual;
  return {
    status: save.proSeason!.completed ? 'season-complete' : 'month-complete',
    save,
    report,
  };
};

type SeasonOutcome = {
  nextClubTier: number;
  honours: SeasonHonour[];
  evidenceId: string;
  summary: string;
};

const sortStandingsForSeason = (standings: readonly LeagueStanding[]): LeagueStanding[] =>
  [...standings].sort((left, right) => {
    const goalDifference =
      right.goalsFor - right.goalsAgainst - (left.goalsFor - left.goalsAgainst);
    return (
      right.points - left.points ||
      goalDifference ||
      right.goalsFor - left.goalsFor ||
      left.clubId.localeCompare(right.clubId)
    );
  });

const buildSeasonOutcome = (
  save: CareerSaveV5Like,
  contract: NonNullable<CareerSaveV5Like['contract']>,
): SeasonOutcome => {
  const pro = save.proSeason!;
  const sorted = sortStandingsForSeason(pro.standings);
  const playerRank = sorted.findIndex(({ clubId }) => clubId === pro.clubId) + 1;
  if (playerRank === 0) throw new Error('赛季积分榜缺少球员所在俱乐部');

  const currentTier = save.activeLoan?.loanClubTier ?? pro.nextClubTier ?? contract.clubTier;
  const isPromoted = playerRank <= 2 && currentTier < 8;
  const isRelegated =
    playerRank >= Math.max(1, sorted.length - 1) && currentTier > 3 && !isPromoted;
  const nextClubTier = isPromoted ? currentTier + 1 : isRelegated ? currentTier - 1 : currentTier;
  const evidenceId = 'pro-season-outcome-' + pro.id;
  const honours: SeasonHonour[] = [];
  if (playerRank === 1) {
    honours.push({
      id: pro.id + '-league-champion',
      kind: 'league-champion',
      label: '联赛冠军',
      seasonId: pro.id,
      clubId: pro.clubId,
      evidenceId,
    });
  }
  if (pro.domesticCup?.completed && pro.domesticCup.winnerClubId === pro.clubId) {
    honours.push({
      id: pro.id + '-cup-champion',
      kind: 'cup-champion',
      label: '国内杯冠军',
      seasonId: pro.id,
      clubId: pro.clubId,
      evidenceId,
    });
  }
  if (isPromoted) {
    honours.push({
      id: pro.id + '-promotion',
      kind: 'promotion',
      label: '升级',
      seasonId: pro.id,
      clubId: pro.clubId,
      evidenceId,
    });
  }
  if (isRelegated) {
    honours.push({
      id: pro.id + '-relegation',
      kind: 'relegation',
      label: '降级',
      seasonId: pro.id,
      clubId: pro.clubId,
      evidenceId,
    });
  }
  const cupSummary = !pro.domesticCup
    ? '国内杯未参赛'
    : pro.domesticCup.completed
      ? pro.domesticCup.winnerClubId === pro.clubId
        ? '国内杯冠军'
        : '国内杯止步'
      : '国内杯进行至' +
        ({
          quarterfinal: '四分之一决赛',
          semifinal: '半决赛',
          final: '决赛',
          complete: '结束',
        }[pro.domesticCup.currentRound] ?? pro.domesticCup.currentRound);
  const tierSummary =
    nextClubTier > currentTier
      ? '升级至层级 ' + nextClubTier
      : nextClubTier < currentTier
        ? '降级至层级 ' + nextClubTier
        : '层级保持 ' + currentTier;
  return {
    nextClubTier,
    honours,
    evidenceId,
    summary: '赛季结算：联赛第' + playerRank + '名；' + cupSummary + '；' + tierSummary,
  };
};

/** 职业赛季结算：承诺对照、角色评估、合同年限递减、续约要约。 */
export const completeProfessionalSeason = <S extends CareerSaveV5Like>(
  save: S,
): { save: S; review: ReturnType<typeof reviewPromise> } => {
  if (save.careerPhase !== 'pro-season') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能结算职业赛季`);
  }
  if (!save.proSeason?.completed) throw new Error('职业赛季尚未结束');
  if (save.story.pendingEvent) throw new Error('请先处理待决事件');
  if (save.story.pendingFeedback) throw new Error('请先确认事件反馈');

  const outcome = reviewPromise(save);

  const contract = save.contract!;
  const activeLoan = save.activeLoan;
  const expired = contract.seasonsCompleted + 1 >= contract.contractYears;
  const contractAfter = { ...contract, seasonsCompleted: contract.seasonsCompleted + 1 };
  if (outcome) {
    contractAfter.promiseStatus = outcome.review.status;
  }

  const seasonOutcome = buildSeasonOutcome(save, contract);
  const outcomeFactAlreadyRecorded = save.ledger.some(({ id }) => id === seasonOutcome.evidenceId);
  const facts: CareerLedgerEntryV2[] = [];
  if (!outcomeFactAlreadyRecorded) {
    facts.push({
      id: seasonOutcome.evidenceId,
      weekKey: save.proSeason!.startDate.slice(0, 4) + '-W53',
      type: 'season-outcome',
      summary: seasonOutcome.summary,
      participantIds: ['player'],
    });
  }
  if (outcome) {
    facts.push({
      id: `promise-review-${save.proSeason!.id}`,
      weekKey: `${save.proSeason!.startDate.slice(0, 4)}-W53`,
      type: 'promise-review',
      summary: outcome.summary,
      participantIds: [],
    });
  }

  const leagueAppearances = save.proSeasonStats.leagueAppearances;
  const reserveAppearances = save.proSeasonStats.reserveAppearances;
  const cupAppearances = save.proSeasonStats.cupAppearances ?? 0;
  const cupGoals = save.proSeasonStats.cupGoals ?? 0;
  const cupAssists = save.proSeasonStats.cupAssists ?? 0;
  const cupMinutes = save.proSeasonStats.cupMinutes ?? 0;
  const seasonAppearances = leagueAppearances + reserveAppearances + cupAppearances;
  const seasonGoals = save.proSeasonStats.goals + cupGoals;
  const seasonAssists = save.proSeasonStats.assists + cupAssists;
  const seasonMinutes = save.proSeasonStats.minutes + cupMinutes;
  const totals = {
    appearances: save.totals.appearances + seasonAppearances,
    goals: save.totals.goals + seasonGoals,
    assists: save.totals.assists + seasonAssists,
    minutes: save.totals.minutes + seasonMinutes,
  };
  const seasonApps = leagueAppearances;
  const averageRating =
    save.proSeasonStats.ratingCount > 0
      ? save.proSeasonStats.ratingSum / save.proSeasonStats.ratingCount
      : 0;
  const visibilityReputationDelta =
    Math.min(3, Math.floor(seasonApps / 5)) + (averageRating >= 7 ? 1 : 0);
  const existingClubIndex = activeLoan
    ? -1
    : save.clubHistory.findIndex(({ clubId, to }) => clubId === contract.clubId && to === null);
  const clubHistory = [...save.clubHistory];
  if (existingClubIndex >= 0) {
    const entry = clubHistory[existingClubIndex]!;
    clubHistory[existingClubIndex] = {
      ...entry,
      seasons: entry.seasons + 1,
      appearances: entry.appearances + seasonAppearances,
      goals: entry.goals + seasonGoals,
    };
  } else if (!activeLoan) {
    clubHistory.push({
      clubId: contract.clubId,
      clubName: contract.clubName,
      from: contract.signedOn,
      to: null,
      seasons: 1,
      appearances: seasonAppearances,
      goals: seasonGoals,
    });
  }
  const loanHistoryEntry: LoanHistoryEntry | null = activeLoan
    ? {
        seasonId: activeLoan.seasonId,
        parentClubId: activeLoan.parentClubId,
        parentClubName: activeLoan.parentClubName,
        loanClubId: activeLoan.loanClubId,
        loanClubName: activeLoan.loanClubName,
        from: activeLoan.startedOn,
        to: activeLoan.returnsOn,
        appearances: seasonAppearances,
        goals: seasonGoals,
        assists: seasonAssists,
        minutes: seasonMinutes,
        competitionTier: activeLoan.loanClubTier,
        outcomeEvidenceId: seasonOutcome.evidenceId,
      }
    : null;
  let next: S = {
    ...save,
    careerPhase: 'pro-offseason',
    proPhase: 'settled',
    totals,
    clubHistory,
    proSeason: {
      ...save.proSeason!,
      nextClubTier: seasonOutcome.nextClubTier,
    },
    contract: contractAfter,
    seasonHistory: save.seasonHistory.some(({ seasonId }) => seasonId === save.proSeason!.id)
      ? save.seasonHistory
      : [
          ...save.seasonHistory,
          {
            seasonId: save.proSeason!.id,
            age: save.player.age,
            status: 'retained',
            appearances: seasonAppearances,
            goals: seasonGoals,
            assists: seasonAssists,
            avgRating:
              save.proSeasonStats.ratingCount > 0
                ? Math.round(
                    (save.proSeasonStats.ratingSum / save.proSeasonStats.ratingCount) * 10,
                  ) / 10
                : null,
            signals: ['professional-season'],
            endedOn: save.proSeason!.endDate,
            honours: seasonOutcome.honours,
          } satisfies SeasonHistorySummary,
        ],
    promiseReviews: outcome ? [...save.promiseReviews, outcome.review] : save.promiseReviews,
    nationalTeam: save.nationalTeam,
    player: {
      ...save.player,
      // 声望经济 v2（设计 §6）：可见度按联赛层级加权，整体经衰减带入口。
      reputation: applyReputationGain(
        save.player.reputation,
        Math.round(
          ((outcome?.reputationDelta ?? 0) +
            visibilityReputationDelta * leagueTierFactor(contract.clubTier)) *
            (save.overseasSince ? 1.2 : 1),
        ),
      ),
    },
    clubContext: {
      ...save.clubContext,
      coachEvaluation: Math.max(
        0,
        Math.min(100, save.clubContext.coachEvaluation + (outcome?.trustDelta ?? 0)),
      ),
    },
    ledger: [...save.ledger, ...facts],
  };
  if (activeLoan && loanHistoryEntry) {
    next = returnFromLoan(next, loanHistoryEntry) as S;
  }
  if (next.player.age >= 38) {
    const forced = retireCareer(next, next.proSeason!.endDate) as S;
    return { save: forced, review: outcome };
  }

  const nationalEligible = isEligibleForNationalTeam(next);
  const shouldOfferDebut =
    nationalEligible &&
    !next.nationalTeam?.capped &&
    !next.story.completedStoryIds.includes('national-team-debut');
  const nationalRng = createSeededRandomSource(
    next.randomState.seed + 6600 + Number(next.proSeason!.startDate.slice(0, 4)) * 11,
  );
  const nationalAccrual =
    nationalEligible && next.nationalTeam?.capped ? accrueNationalTeam(next, nationalRng) : null;
  const nationalFacts: CareerLedgerEntryV2[] = nationalAccrual
    ? [
        {
          id: 'national-' + next.proSeason!.id,
          weekKey: next.proSeason!.startDate.slice(0, 4) + '-W53',
          type: 'decision',
          summary: nationalAccrual.factSummary,
          participantIds: [],
        },
      ]
    : [];
  next = {
    ...next,
    nationalTeam: nationalAccrual?.nationalTeam ?? next.nationalTeam,
    player: {
      ...next.player,
      reputation: applyReputationGain(
        next.player.reputation,
        nationalAccrual?.reputationDelta ?? 0,
      ),
    },
    story: shouldOfferDebut
      ? {
          ...next.story,
          pendingEvent: {
            eventId: 'national-debut-' + next.proSeason!.id,
            title: '国家队首秀征召',
            description: '国家队邀请你参加本期国际比赛窗口。',
            choices: [
              {
                id: 'accept-national-team',
                text: '接受征召，代表国家队出场',
                riskLabel: '疲劳增加',
                effects: { confidence: 3, fatigue: 2 },
                response:
                  '你接受了国家队的邀请。俱乐部教练没有阻拦，只提醒你把恢复计划排在庆祝之前。',
                followUp:
                  '这次国际比赛窗口会带来首个国家队出场记录，也会压缩你的恢复时间；回到俱乐部后，轮换安排可能暂时更谨慎。',
              },
              {
                id: 'decline-national-team',
                text: '婉拒本次征召，专注俱乐部赛季',
                riskLabel: '错失机会',
                effects: { confidence: -1 },
                response:
                  '你向国家队说明了自己的决定。机会暂时错过了，但你没有让一次征召打乱正在建立的俱乐部位置。',
                followUp:
                  '国家队工作人员会保留你的观察记录；接下来几个月的联赛出场和稳定表现，将决定下一次窗口是否还会收到邀请。',
              },
            ],
            resolvedChoiceId: null,
            participantIds: [],
            factRefs: [],
            storyId: 'national-team-debut',
            nextEventIds: [],
            interaction: 'decision',
          },
        }
      : next.story,
    ledger: [...next.ledger, ...nationalFacts],
  };

  if (expired) {
    const rng = createSeededRandomSource(next.randomState.seed + 7700);
    const offer = buildRenewalOffer(next, () => rng.next());
    const offerFact: CareerLedgerEntryV2 = {
      id: `renewal-offer-${next.proSeason!.id}`,
      weekKey: `${next.proSeason!.startDate.slice(0, 4)}-W53`,
      type: 'renewal-offer',
      summary: `合同到期，${contract.clubName}提供 ${offer.contractYears} 年续约要约（年薪 ${offer.salaryPerYear}）`,
      participantIds: [],
    };
    next = {
      ...next,
      pendingOffers: [
        {
          id: `renewal-${next.proSeason!.id}`,
          clubId: contract.clubId,
          clubName: contract.clubName,
          clubTier: offer.clubTier,
          salaryPerYear: offer.salaryPerYear,
          contractYears: offer.contractYears,
          squadRole: offer.squadRole,
          offerKind: 'permanent',
          promise: offer.promise,
          releaseClauseNote: '',
        },
      ],
      ledger: [...next.ledger, offerFact],
    };
  }

  return { save: next, review: outcome };
};

/** 处理国家队首召：先应用事件选择，再在接受时固化首个国际窗口数据。 */
export const submitNationalTeamDecision = <S extends CareerSaveV5Like>(
  save: S,
  choiceId: string,
): S => {
  if (save.careerPhase !== 'pro-offseason') {
    throw new Error('国家队首召只能在职业休赛期处理');
  }
  const event = save.story.pendingEvent;
  if (!event || event.storyId !== 'national-team-debut') {
    throw new Error('当前没有待处理的国家队首召');
  }
  if (choiceId !== 'accept-national-team' && choiceId !== 'decline-national-team') {
    throw new Error('无效的国家队首召选择');
  }
  const resolved = resolveCareerEvent(save, choiceId) as unknown as S;
  if (choiceId === 'decline-national-team') return resolved;

  const accrual = accrueNationalTeam(
    {
      ...resolved,
      nationalTeam: { capped: true, caps: 0, goals: 0, debutOn: null },
    },
    createSeededRandomSource(
      resolved.randomState.seed + 6900 + Number(resolved.proSeason!.startDate.slice(0, 4)) * 13,
    ),
  );
  if (!accrual) throw new Error('国家队首召已失效，无法固化首秀数据');
  const fact: CareerLedgerEntryV2 = {
    id: 'national-debut-' + resolved.proSeason!.id,
    weekKey: resolved.proSeason!.startDate.slice(0, 4) + '-W53',
    type: 'national-debut',
    summary: accrual.factSummary,
    participantIds: [],
  };
  return {
    ...resolved,
    nationalTeam: accrual.nationalTeam,
    player: {
      ...resolved.player,
      reputation: applyReputationGain(resolved.player.reputation, accrual.reputationDelta),
    },
    ledger: [...resolved.ledger, fact],
  };
};

/** 接受续约：新合同写入存档。 */
export const acceptRenewal = <S extends CareerSaveV5Like>(save: S): S => {
  if (save.careerPhase !== 'pro-offseason') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能接受续约`);
  }
  const offer = save.pendingOffers[0];
  if (!offer) throw new Error('没有待处理的续约要约');
  const fact: CareerLedgerEntryV2 = {
    id: `renewal-signed-${offer.id}`,
    weekKey: `${save.proSeason?.startDate.slice(0, 4) ?? ''}-W53`,
    type: 'renewal-signed',
    summary: `与${offer.clubName}续约 ${offer.contractYears} 年（年薪 ${offer.salaryPerYear}）`,
    participantIds: [],
  };
  return {
    ...save,
    contract: {
      ...offer,
      signedOn: save.proSeason?.endDate ?? '',
      seasonsCompleted: 0,
      promiseStatus: 'pending',
    },
    pendingOffers: [],
    ledger: [...save.ledger, fact],
  };
};

/** 拒绝续约：成为自由球员（M7 起点）。 */
export const declineRenewal = <S extends CareerSaveV5Like>(save: S): S => {
  if (save.careerPhase !== 'pro-offseason') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能拒绝续约`);
  }
  if (save.pendingOffers.length === 0) throw new Error('没有待处理的续约要约');
  const fact: CareerLedgerEntryV2 = {
    id: `renewal-declined-${save.proSeason?.id ?? ''}`,
    weekKey: `${save.proSeason?.startDate.slice(0, 4) ?? ''}-W53`,
    type: 'decision',
    summary: '拒绝续约，成为自由球员',
    participantIds: [],
  };
  return {
    ...save,
    careerPhase: 'free-agent',
    contract: null,
    pendingOffers: [],
    ledger: [...save.ledger, fact],
  };
};
