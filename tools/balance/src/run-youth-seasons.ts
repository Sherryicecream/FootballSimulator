import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  advanceCareerMonth,
  completeYouthSeason,
  createCareerSave,
  createYouthCareerV2,
  enterOffseason,
  generateContractOffers,
  rejectOffers,
  signContract,
  startNextYouthSeason,
  submitAgentPreferences,
  submitCareerDecision,
} from '@football/application';
import { getYouthContent } from '@football/content';
import {
  acceptRenewal,
  advanceProMonth,
  completeProfessionalSeason,
  startProfessionalSeason,
} from '@football/application';
import {
  migrateCareerSaveV5,
  type CareerSaveV5Like,
  type PlayerAttributes,
} from '@football/contracts';
import { weightedAbility } from '@football/simulation';
import {
  correlation,
  percentile,
  type YouthBalanceReport,
  type YouthSeasonMetrics,
} from './youth-season-metrics';

/** 生涯终结方式：毕业签约后接职业期，或三季培养期满。 */
type LifecycleOutcome = {
  seasonsPlayed: number;
  graduated: boolean;
  graduationAge: number | null;
  contractTier: number | null;
  contractPromiseKind: string | null;
  rejectedOfferSeasons: number;
  proSeasonsPlayed: number;
  promiseKept: boolean;
  lastCause: string;
  starterReached: boolean;
  totalMinutes: number;
  leagueAppearances: number;
  severeInjuries: number;
  freeAgent: boolean;
};

export const runYouthSeasons = (runs: number, seedStart = 1): YouthBalanceReport => {
  const content = getYouthContent();
  const metrics: YouthSeasonMetrics[] = [];
  const eventIdsByLength = content.events
    .map(({ id }) => id)
    .sort((left, right) => right.length - left.length);
  const eventThemeById = new Map(
    content.events.map((event) => [event.id, event.theme ?? 'off-pitch']),
  );
  const knownThemeCount = new Set(eventThemeById.values()).size;

  for (let seed = seedStart; seed < seedStart + runs; seed += 1) {
    let save = migrateCareerSaveV5(
      createYouthCareerV2(
        createCareerSave({
          playerName: `球员${seed}`,
          hometown: '上海',
          primaryPosition: 'FORWARD',
          preferredFoot: 'RIGHT',
          regionId: 'shanghai',
          seed,
        }),
        content,
      ),
    );
    const initialAttributes = flatten(save.player.attributes);
    let guard = 0;
    while (!save.season.completed && guard < 100) {
      const outcome = advanceCareerMonth(save, content.academies, content.events);
      save = outcome.save;
      if (outcome.status === 'awaiting-decision') {
        save = submitCareerDecision(save, outcome.event.eventId, outcome.event.choices[0]!.id);
      }
      guard += 1;
    }
    if (!save.season.completed) throw new Error(`种子 ${seed} 未在保护步数内完成`);
    const final = completeYouthSeason(save);
    const finalAttributes = flatten(final.save.player.attributes);
    const growth = Object.keys(initialAttributes).map(
      (key) => finalAttributes[key]! - initialAttributes[key]!,
    );
    const matchFacts = final.save.ledger.filter(({ type }) => type === 'match');
    const totalGoals = matchFacts.reduce((sum, { summary }) => {
      const score = summary.match(/(\d+):(\d+)/);
      return sum + (score ? Number(score[1]) + Number(score[2]) : 0);
    }, 0);
    const decisionFacts = final.save.ledger.filter(({ type }) => type === 'decision');
    const decisionEventIds = decisionFacts
      .map(({ id }) => eventIdsByLength.find((eventId) => id.startsWith(`decision-${eventId}-`)))
      .filter((eventId): eventId is string => Boolean(eventId));
    const eventThemes = [
      ...new Set(
        decisionEventIds.flatMap((eventId) => {
          const theme = eventThemeById.get(eventId);
          return theme ? [theme] : [];
        }),
      ),
    ];
    const decisionsByMonth = new Map<string, number>();
    for (const fact of decisionFacts) {
      const month = weekKeyToMonth(final.save.season.startDate, fact.weekKey);
      decisionsByMonth.set(month, (decisionsByMonth.get(month) ?? 0) + 1);
    }
    const maxDecisionsInMonth = Math.max(0, ...decisionsByMonth.values());

    // 三连季生命周期：休赛期 → 毕业签约（确定性策略）或留队/补救续打
    const lifecycle = playLifecycle(final.save, content);

    metrics.push({
      seed,
      fixtures: final.save.season.fixtures.length,
      decisions: decisionFacts.length,
      totalAttributeGrowth: growth.reduce((sum, value) => sum + value, 0),
      maxAttributeGrowth: Math.max(...growth),
      injuries:
        final.save.health.previousInjuries.length + Number(Boolean(final.save.health.activeInjury)),
      severeInjuries: [
        ...final.save.health.previousInjuries,
        ...(final.save.health.activeInjury ? [final.save.health.activeInjury] : []),
      ].filter(({ kind }) => kind === 'severe').length,
      firstTeamStage: final.save.clubContext.firstTeamStage,
      released: final.outcome.status === 'released',
      goalsPerMatch: matchFacts.length ? totalGoals / matchFacts.length : 0,
      uniqueDecisionEvents: new Set(decisionEventIds).size,
      decisionEventIds,
      eventThemes,
      maxDecisionsInMonth,
      coachEvaluation: final.save.clubContext.coachEvaluation,
      form: final.save.currentState.form,
      confidence: final.save.currentState.confidence,
      playerRole: final.save.clubContext.playerRole,
      seasonsPlayed: lifecycle.seasonsPlayed,
      graduated: lifecycle.graduated,
      graduationAge: lifecycle.graduationAge,
      contractTier: lifecycle.contractTier,
      contractPromiseKind: lifecycle.contractPromiseKind,
      rejectedOfferSeasons: lifecycle.rejectedOfferSeasons,
      proSeasonsPlayed: lifecycle.proSeasonsPlayed,
      promiseKept: lifecycle.promiseKept,
      promiseCause: lifecycle.lastCause,
      starterReached: lifecycle.starterReached,
      proMinutes: lifecycle.totalMinutes,
      proLeagueAppearances: lifecycle.leagueAppearances,
      proSevereInjuries: lifecycle.severeInjuries,
      freeAgent: lifecycle.freeAgent,
      weightedAbility: weightedAbility(
        final.save.player.identity.primaryPosition,
        final.save.player.attributes,
      ),
    });
  }
  const watchStages = new Set([
    'watchlist',
    'training-invite',
    'bench-list',
    'substitute-appearance',
    'starting-appearance',
  ]);
  const appearanceStages = new Set(['substitute-appearance', 'starting-appearance']);
  const graduatedMetrics = metrics.filter(({ graduated }) => graduated);
  const promiseKinds = ['playing-time', 'position-guarantee', 'none'];
  const promiseShares = Object.fromEntries(
    promiseKinds.map((kind) => [
      kind,
      graduatedMetrics.filter(({ contractPromiseKind }) => contractPromiseKind === kind).length /
        Math.max(1, graduatedMetrics.length),
    ]),
  );
  return {
    runs,
    seedStart,
    metrics,
    summary: {
      completionRate: metrics.length / runs,
      fixtureMedian: percentile(
        metrics.map(({ fixtures }) => fixtures),
        0.5,
      ),
      decisionMedian: percentile(
        metrics.map(({ decisions }) => decisions),
        0.5,
      ),
      decisionP90: percentile(
        metrics.map(({ decisions }) => decisions),
        0.9,
      ),
      maxDecisionsInMonth: Math.max(0, ...metrics.map((metric) => metric.maxDecisionsInMonth)),

      attributeGrowthMedian: percentile(
        metrics.map(({ totalAttributeGrowth }) => totalAttributeGrowth),
        0.5,
      ),
      maxAttributeGrowthP90: percentile(
        metrics.map(({ maxAttributeGrowth }) => maxAttributeGrowth),
        0.9,
      ),
      severeInjuryRate: metrics.filter(({ severeInjuries }) => severeInjuries > 0).length / runs,
      firstTeamWatchlistRate:
        metrics.filter(({ firstTeamStage }) => watchStages.has(firstTeamStage)).length / runs,
      firstTeamAppearanceRate:
        metrics.filter(({ firstTeamStage }) => appearanceStages.has(firstTeamStage)).length / runs,
      releaseRate: metrics.filter(({ released }) => released).length / runs,
      goalsPerMatch: metrics.reduce((sum, item) => sum + item.goalsPerMatch, 0) / runs,
      uniqueStoryCombinations: new Set(
        metrics.map(
          ({ decisions, uniqueDecisionEvents }) => `${decisions}:${uniqueDecisionEvents}`,
        ),
      ).size,
      themeCoverageRate:
        new Set(metrics.flatMap(({ eventThemes }) => eventThemes)).size /
        Math.max(1, knownThemeCount),
      uniqueEventCombinations: new Set(
        metrics.map(({ decisionEventIds }) => [...new Set(decisionEventIds)].sort().join('|')),
      ).size,
      graduationRate: graduatedMetrics.length / runs,
      underageGraduationRate:
        graduatedMetrics.filter(({ graduationAge }) => graduationAge != null && graduationAge < 18)
          .length / runs,
      contractTierCorrelation: correlation(
        graduatedMetrics.map(({ weightedAbility, contractTier }) => [
          weightedAbility,
          contractTier ?? 0,
        ]),
      ),
      rejectRate:
        metrics.filter(({ rejectedOfferSeasons }) => rejectedOfferSeasons > 0).length / runs,
      proPromiseKeptRate:
        metrics.filter(({ proSeasonsPlayed, promiseKept }) => proSeasonsPlayed > 0 && promiseKept)
          .length /
        Math.max(1, metrics.filter(({ proSeasonsPlayed }) => proSeasonsPlayed > 0).length),
      proClubCauseBrokenRate:
        metrics.filter(
          ({ proSeasonsPlayed, promiseCause }) => proSeasonsPlayed > 0 && promiseCause === 'club',
        ).length /
        Math.max(1, metrics.filter(({ proSeasonsPlayed }) => proSeasonsPlayed > 0).length),
      proStarterRate: metrics.filter(({ starterReached }) => starterReached).length / runs,
      proMinutesMedian: percentile(
        metrics
          .filter(
            ({ proSeasonsPlayed, proLeagueAppearances }) =>
              proSeasonsPlayed > 0 && proLeagueAppearances > 0,
          )
          .map(({ proMinutes, proLeagueAppearances }) => proMinutes / proLeagueAppearances),
        0.5,
      ),
      proSevereInjuryRate:
        metrics.filter(({ proSevereInjuries }) => proSevereInjuries > 0).length /
        Math.max(1, metrics.filter(({ proSeasonsPlayed }) => proSeasonsPlayed > 0).length),
      proFreeAgentRate: metrics.filter(({ freeAgent }) => freeAgent).length / runs,
      promiseShares,
      seasonsPlayedMedian: percentile(
        metrics.map(({ seasonsPlayed }) => seasonsPlayed),
        0.5,
      ),
    },
  };
};

/**
 * 版本化确定性毕业策略（policy v1）：
 * 毕业资格达标即设定均衡倾向；有出场承诺要约时签薪资最高者，
 * 否则签层级 ≤5 的最高薪要约；两者皆无则拒绝全部要约并继续青训。
 */
const playLifecycle = (
  completed: CareerSaveV5Like,
  content: ReturnType<typeof getYouthContent>,
): LifecycleOutcome => {
  let save: CareerSaveV5Like = completed;
  let seasonsPlayed = 1;
  let rejectedOfferSeasons = 0;
  const outcome: LifecycleOutcome = {
    seasonsPlayed,
    graduated: false,
    graduationAge: null,
    contractTier: null,
    contractPromiseKind: null,
    rejectedOfferSeasons,
    proSeasonsPlayed: 0,
    promiseKept: false,
    lastCause: 'none',
    starterReached: false,
    totalMinutes: 0,
    leagueAppearances: 0,
    severeInjuries: 0,
    freeAgent: false,
  };
  for (let season = 1; season <= 3; season += 1) {
    if (!save.season.completed) throw new Error('生命周期要求进入休赛期的存档已完成赛季');
    const entered = enterOffseason(save, content.academies);
    save = entered.save;
    if (!save.offseason) throw new Error('休赛期状态缺失');
    const finishYouth = (): LifecycleOutcome => ({
      ...outcome,
      seasonsPlayed,
      rejectedOfferSeasons,
    });
    if (save.offseason.graduationEligible) {
      const priorities = ['playing-time', 'development', 'salary'] as const;
      const priority = priorities[save.randomState.seed % priorities.length]!;
      const withPrefs = submitAgentPreferences(save, {
        leagueTierBias: 'balanced',
        priority,
      });
      const withOffers = generateContractOffers(withPrefs, content);
      const offers = withOffers.pendingOffers;
      // policy v3：诉求决定目标要约池；全部要约缺乏诚意（一年且无承诺）、
      // 目标池为空，或最高层级低于球员身价一档以上时，拒绝并留在青训。
      const attractive = offers.filter(
        (offer) => offer.contractYears >= 2 || offer.promise.kind !== 'none',
      );
      const pool =
        priority === 'playing-time'
          ? attractive.filter(({ promise }) => promise.kind === 'playing-time')
          : priority === 'development'
            ? attractive.filter(
                ({ promise, squadRole }) =>
                  promise.kind === 'position-guarantee' || squadRole === 'highlighted-prospect',
              )
            : attractive;
      const abilityCeiling = Math.floor(
        (weightedAbility(save.player.identity.primaryPosition, save.player.attributes) - 10) / 10,
      );
      // 雄心风格：偶数种子要求报价达到身价层阶，奇数种子只接受高于身价一档的要约。
      const ambitionFloor = abilityCeiling + (save.randomState.seed % 2);
      const bestTier =
        attractive.length > 0 ? Math.max(...attractive.map(({ clubTier }) => clubTier)) : 0;
      if (attractive.length === 0 || pool.length === 0 || bestTier < ambitionFloor) {
        save = rejectOffers(withOffers);
        rejectedOfferSeasons += 1;
      } else {
        const candidates = pool.length > 0 ? pool : attractive;
        const best = candidates.reduce((left, right) =>
          right.clubTier !== left.clubTier
            ? right.clubTier > left.clubTier
              ? right
              : left
            : right.salaryPerYear > left.salaryPerYear
              ? right
              : left,
        );
        const signed = signContract(withOffers, best.id);
        const pro = playProfessionalLife(signed, content, 3);
        return {
          seasonsPlayed,
          graduated: true,
          graduationAge: signed.player.age,
          contractTier: signed.contract?.clubTier ?? null,
          contractPromiseKind: signed.contract?.promise.kind ?? null,
          rejectedOfferSeasons,
          proSeasonsPlayed: pro.seasonsPlayed,
          promiseKept: pro.promiseKept,
          lastCause: pro.lastCause,
          starterReached: pro.starterReached,
          totalMinutes: pro.totalMinutes,
          leagueAppearances: pro.leagueAppearances,
          severeInjuries: pro.severeInjuries,
          freeAgent: pro.freeAgent,
        };
      }
    }
    if (season === 3) return finishYouth();
    save = completeNextSeason(save, content);
    seasonsPlayed += 1;
  }
  return { ...outcome, seasonsPlayed, rejectedOfferSeasons };
};

/** 开启并完整模拟下个赛季，返回结算后的存档。 */
const completeNextSeason = (
  offseasonSave: CareerSaveV5Like,
  content: ReturnType<typeof getYouthContent>,
): CareerSaveV5Like => {
  let save = advanceToNextSeason(offseasonSave, content);
  let guard = 0;
  while (!save.season.completed && guard < 100) {
    const outcome = advanceCareerMonth(save, content.academies, content.events);
    save = outcome.save;
    if (outcome.status === 'awaiting-decision') {
      save = submitCareerDecision(save, outcome.event.eventId, outcome.event.choices[0]!.id);
    }
    guard += 1;
  }
  if (!save.season.completed) throw new Error('下个赛季未在保护步数内完成');
  return completeYouthSeason(save).save;
};

const advanceToNextSeason = (
  save: CareerSaveV5Like,
  content: ReturnType<typeof getYouthContent>,
): CareerSaveV5Like => {
  const lastStatus = save.seasonHistory.at(-1)?.status;
  const pathwayByNextPath: Record<string, string> = {
    'school-football': 'school-elite',
    'lower-tier-academy': 'local-academy',
    trial: 'relocation-academy',
  };
  let requestedAcademyId: string | undefined;
  if (lastStatus === 'released') {
    const nextPath = (['school-football', 'lower-tier-academy', 'trial'] as const)[
      save.randomState.seed % 3
    ]!;
    const pathway = pathwayByNextPath[nextPath];
    const candidates = content.academies.filter(
      ({ pathway: candidatePathway }) => candidatePathway === pathway,
    );
    requestedAcademyId =
      candidates.length > 0 ? candidates[save.randomState.seed % candidates.length]!.id : undefined;
  }
  return startNextYouthSeason(save, content, requestedAcademyId);
};

const flatten = (attributes: PlayerAttributes): Record<string, number> => ({
  ...attributes.technical,
  ...attributes.physical,
  ...attributes.mental,
});
const weekKeyToMonth = (startDate: string, weekKey: string): string => {
  const weekNumber = Number(/-W(\d{1,2})$/.exec(weekKey)?.[1] ?? 1);
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (Math.max(1, weekNumber) - 1) * 7);
  return date.toISOString().slice(0, 7);
};

/**
 * 职业期生命周期（policy v1）：
 * 持续接受续约、推进赛季并记录承诺兑现与出场数据，最多 proSeasons 季。
 */
const playProfessionalLife = (
  signed: CareerSaveV5Like,
  content: ReturnType<typeof getYouthContent>,
  proSeasons: number,
): {
  seasonsPlayed: number;
  promiseKept: boolean;
  lastCause: string;
  starterReached: boolean;
  totalMinutes: number;
  leagueAppearances: number;
  severeInjuries: number;
  freeAgent: boolean;
} => {
  let save = signed;
  let seasonsPlayed = 0;
  let promiseKept = false;
  let lastCause = 'none';
  let starterReached = false;
  let totalMinutes = 0;
  let leagueAppearances = 0;
  let severeInjuries = 0;
  let freeAgent = false;

  for (let season = 0; season < proSeasons; season += 1) {
    if (save.careerPhase !== 'professional-contract' && save.careerPhase !== 'pro-offseason') {
      freeAgent = save.careerPhase === 'free-agent';
      break;
    }
    save = startProfessionalSeason(save, content.clubs);
    let guard = 0;
    while (!save.proSeason!.completed && guard < 60) {
      const outcome = advanceProMonth(save, content.clubs, content.events);
      save = outcome.save;
      if (outcome.status === 'awaiting-decision') {
        save = submitCareerDecision(save, outcome.event.eventId, outcome.event.choices[0]!.id);
      }
      guard += 1;
    }
    if (!save.proSeason!.completed) throw new Error('职业赛季未在保护步数内完成');
    const settled = completeProfessionalSeason(save);
    save = settled.save;
    seasonsPlayed += 1;
    totalMinutes += save.proSeasonStats.minutes;
    leagueAppearances += save.proSeasonStats.leagueAppearances;
    const review = settled.review;
    if (review) {
      promiseKept = review.review.status === 'kept';
      lastCause = review.review.cause;
    }
    const ownPlayed = save.proSeason!.fixtures.filter(
      ({ status, homeClubId, awayClubId }) =>
        status === 'played' &&
        (homeClubId === save.proSeason!.clubId || awayClubId === save.proSeason!.clubId),
    ).length;
    const shareDebug = save.proSeasonStats.minutes / Math.max(1, ownPlayed * 90);
    if (shareDebug >= 0.5) {
      starterReached = true;
    }
    if (save.pendingOffers.length > 0) {
      save = acceptRenewal(save);
    }
  }
  freeAgent = save.careerPhase === 'free-agent';
  severeInjuries =
    save.health.previousInjuries.filter(({ kind }) => kind === 'severe').length +
    (save.health.activeInjury?.kind === 'severe' ? 1 : 0);
  return {
    seasonsPlayed,
    promiseKept,
    lastCause,
    starterReached,
    totalMinutes,
    leagueAppearances,
    severeInjuries,
    freeAgent,
  };
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const readArg = (name: string, fallback: string) => {
    const index = process.argv.indexOf(name);
    if (index < 0) return fallback;
    return process.argv[index + 1] ?? fallback;
  };
  const runs = Number(readArg('--runs', '1000'));
  const seedStart = Number(readArg('--seed-start', '1'));
  const output = resolve(readArg('--output', 'artifacts/youth-balance.json'));
  const report = runYouthSeasons(runs, seedStart);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report.summary, null, 2));
}
