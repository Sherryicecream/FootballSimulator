import type {
  CareerLedgerEntryV2,
  MonthlyReport,
  CareerSaveV4,
  ClubProfile,
  EventDefinition,
  Position,
} from '@football/contracts';
import {
  buildDepthChart,
  buildRenewalOffer,
  createLeagueFixtures,
  createLeagueStandings,
  createSeededRandomSource,
  generateProSquad,
  mergeDevelopmentAccrual,
  pickYouthEventForWeek,
  reviewPromise,
  settleMonthlyDevelopment,
  simulateProfessionalWeek,
  weightedAbility,
} from '@football/simulation';
import type { DevelopmentAccrual } from '@football/simulation';
import { resolveCareerEvent } from './resolve-career-event';

const ensureContract = (save: CareerSaveV4) => {
  if (!save.contract) throw new Error('没有生效的职业合同');
  return save.contract;
};

/** 开启职业赛季（设计 §5）：阵容、双循环赛程与积分榜生成后立即固化。 */
export const startProfessionalSeason = (
  save: CareerSaveV4,
  clubs: readonly ClubProfile[],
): CareerSaveV4 => {
  if (save.careerPhase !== 'professional-contract' && save.careerPhase !== 'pro-offseason') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能开启职业赛季`);
  }
  const contract = ensureContract(save);
  const club = clubs.find(({ id }) => id === contract.clubId);
  if (!club) throw new Error(`签约俱乐部 ${contract.clubId} 不在内容包中`);

  // 首个职业赛季从签署年份开始；续赛季从上个职业赛季年份 +1（8 月开赛）
  const year =
    save.careerPhase === 'professional-contract'
      ? Number(contract.signedOn.slice(0, 4))
      : save.proSeason
        ? Number(save.proSeason.startDate.slice(0, 4)) + 1
        : 0;
  if (!Number.isFinite(year) || year <= 0) throw new Error('无法确定职业赛季年份');
  const startDate = `${year}-08-01`;
  const competitionId = `pro-tier-${club.tier}`;
  const leagueClubs = clubs.filter(({ tier }) => tier === club.tier);
  if (leagueClubs.length < 4) throw new Error(`层级 ${club.tier} 俱乐部不足，无法组成联赛`);

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

  const fact: CareerLedgerEntryV2 = {
    id: `pro-season-start-${year}`,
    weekKey: `${year}-W31`,
    type: 'decision',
    summary: `开启职业赛季：${club.name}（层级 ${club.tier}），阵容 ${squad.length} 人，联赛 ${fixtures.length} 场`,
    participantIds: [],
  };

  return {
    ...save,
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
    },
    pendingOffers: [],
    ledger: [...save.ledger, fact],
  };
};

export type AdvanceProMonthOutcome =
  | {
      status: 'awaiting-decision';
      save: CareerSaveV4;
      event: NonNullable<CareerSaveV4['story']['pendingEvent']>;
    }
  | { status: 'month-complete'; save: CareerSaveV4; report: MonthlyReport }
  | { status: 'season-complete'; save: CareerSaveV4; report: MonthlyReport };

/** 职业月度推进：与青训月度共享事件系统与月末成长结算，比赛与登场走职业周转移。 */
export const advanceProMonth = (
  initialSave: CareerSaveV4,
  clubs: readonly ClubProfile[],
  events: readonly EventDefinition[] = [],
): AdvanceProMonthOutcome => {
  if (initialSave.careerPhase !== 'pro-season') {
    throw new Error(`非法阶段转移：当前阶段 ${initialSave.careerPhase} 不能推进职业月度`);
  }
  const pro = initialSave.proSeason;
  if (!pro) throw new Error('职业赛季状态缺失');
  if (pro.completed) throw new Error('职业赛季已经结束');
  if (initialSave.story.pendingEvent) {
    return {
      status: 'awaiting-decision',
      save: initialSave,
      event: initialSave.story.pendingEvent,
    };
  }

  const monthKey = pro.currentMonth;
  const resuming =
    initialSave.monthlyAdvance.monthKey === monthKey &&
    ['advancing', 'awaiting-decision'].includes(initialSave.monthlyAdvance.status);
  let save: CareerSaveV4 = {
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
        matchIds: transition.matchResult
          ? [...transition.save.monthlyAdvance.matchIds, transition.matchResult.id]
          : transition.save.monthlyAdvance.matchIds,
      },
    };
    const canInterrupt = save.proSeason!.currentMonth === monthKey && !save.proSeason!.completed;
    factsDuringMonth.push(...transition.facts.map(({ id }) => id));
    const eventPick = pickYouthEventForWeek(canInterrupt ? [...events] : [], save);
    save = eventPick.save;
    if (eventPick.event?.interaction === 'automatic') {
      save = resolveCareerEvent(
        save as unknown as never,
        eventPick.event.choices[0]!.id,
      ) as unknown as CareerSaveV4;
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
  const settlementFact: CareerLedgerEntryV2 = {
    id: `pro-settlement-${save.proSeason!.currentMonth}`,
    weekKey: `${save.proSeason!.startDate.slice(0, 4)}-W${String(save.proSeason!.currentWeek).padStart(2, '0')}`,
    type: 'monthly-settlement',
    summary: settlement.attributeChanges.length
      ? `月末成长结算：${settlement.attributeChanges
          .map(({ attribute, oldValue, newValue }) => `${attribute} ${oldValue}→${newValue}`)
          .join('，')}`
      : '月末成长结算：本月没有可见属性提升',
    participantIds: [],
  };
  save = {
    ...save,
    player: settlement.player,
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
    },
    ledger: [...save.ledger, settlementFact],
  };
  const monthFactIds = [...initialSave.monthlyAdvance.factIds, ...factsDuringMonth];
  const report: MonthlyReport = {
    monthKey,
    facts: save.ledger.filter(({ id }) => monthFactIds.includes(id)),
    attributeChanges: settlement.attributeChanges,
    stateSummary: {
      ...save.currentState,
      fitness: save.health.fitness,
      fatigue: save.health.fatigue,
    },
    matchIds,
  };
  void mergeDevelopmentAccrual;
  return {
    status: save.proSeason!.completed ? 'season-complete' : 'month-complete',
    save,
    report,
  };
};

/** 职业赛季结算：承诺对照、角色评估、合同年限递减、续约要约。 */
export const completeProfessionalSeason = (
  save: CareerSaveV4,
): { save: CareerSaveV4; review: ReturnType<typeof reviewPromise> } => {
  if (save.careerPhase !== 'pro-season') {
    throw new Error(`非法阶段转移：当前阶段 ${save.careerPhase} 不能结算职业赛季`);
  }
  if (!save.proSeason?.completed) throw new Error('职业赛季尚未结束');
  if (save.story.pendingEvent) throw new Error('请先处理待决事件');

  const outcome = reviewPromise(save);

  const contract = save.contract!;
  const expired = contract.seasonsCompleted + 1 >= contract.contractYears;
  const contractAfter = { ...contract, seasonsCompleted: contract.seasonsCompleted + 1 };
  if (outcome) {
    contractAfter.promiseStatus = outcome.review.status;
  }

  const facts: CareerLedgerEntryV2[] = [];
  if (outcome) {
    facts.push({
      id: `promise-review-${save.proSeason!.id}`,
      weekKey: `${save.proSeason!.startDate.slice(0, 4)}-W53`,
      type: 'promise-review',
      summary: outcome.summary,
      participantIds: [],
    });
  }

  let next: CareerSaveV4 = {
    ...save,
    careerPhase: 'pro-offseason',
    proPhase: 'settled',
    contract: contractAfter,
    promiseReviews: outcome ? [...save.promiseReviews, outcome.review] : save.promiseReviews,
    player: {
      ...save.player,
      reputation: Math.max(
        0,
        Math.min(100, save.player.reputation + (outcome?.reputationDelta ?? 0)),
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
          promise: offer.promise,
          releaseClauseNote: '',
        },
      ],
      ledger: [...next.ledger, offerFact],
    };
  }

  return { save: next, review: outcome };
};

/** 接受续约：新合同写入存档。 */
export const acceptRenewal = (save: CareerSaveV4): CareerSaveV4 => {
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
export const declineRenewal = (save: CareerSaveV4): CareerSaveV4 => {
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
