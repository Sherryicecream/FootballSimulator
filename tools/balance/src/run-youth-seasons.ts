import { mkdir, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import {
  advanceCareerMonth,
  advanceProMonth,
  buildNodeBrief,
  clearEventFeedback,
  completeYouthSeason,
  createCareerSave,
  createYouthCareerV2,
  endYouthCareer,
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
  canContinueYouthSeason,
  completeProfessionalSeason,
  declineRenewal as declineRenewalUse,
  endProfessionalCareer,
  generateFreeAgentOffers,
  requestCareerMarket,
  retire as retireUse,
  signMarketOffer,
  signTransfer,
  startProfessionalSeason,
  submitNationalTeamDecision,
} from '@football/application';
import { summarizeMonth, weightedAbility } from '@football/simulation';
import {
  inferLegacyClubCountry,
  type CareerSaveV5Like,
  type CareerSaveV7Like,
  type ContractOfferV3,
  type Country,
  type EventFeedback,
  type MonthSummary,
  type NodeStopReason,
  type PlayerAttributes,
  type YouthEventInstance,
} from '@football/contracts';
import {
  summarizeExperienceBatch,
  type ExperiencePath,
  type ExperienceTraceEntry,
} from './experience-metrics';
import { summarizeCountryExperienceCoverage } from './country-experience-coverage';
import {
  correlation,
  percentile,
  type YouthBalanceReport,
  type YouthSeasonMetrics,
} from './youth-season-metrics';
import {
  buildDivergenceReport,
  completeCareerTrace,
  createCareerTrace,
  recordCareerChoice,
  type CareerTrace,
  type CareerTraceDraft,
} from './story-divergence';
import { summarizeWorldEcosystem } from './world-ecosystem-metrics';
import { runWorldEcosystemAnalysis } from './world-ecosystem-runner';

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
  transferCount: number;
  retireAge: number | null;
  retiredReputation: number;
  overseasSpent: boolean;
  experiencedCountries: Country[];
  hadCaps: boolean;
  capCount: number;
  cupAppearances: number;
  cupHonours: number;
  promotions: number;
  relegations: number;
  permanentMarketRequests: number;
  permanentMarketSignings: number;
  loanMarketRequests: number;
  loanSignings: number;
  loanReturns: number;
  loanSeasonAppearances: number;
  loanHistoryCount: number;
  activeLoanAtEnd: boolean;
  loanContractStable: boolean;
  overseasTransferCount: number;
};

type ExperienceTrace = ExperienceTraceEntry[] | null;

export type YouthBalanceProgress = {
  completed: number;
  total: number;
  seed: number;
};

export type YouthBalanceRunOptions = {
  collectExperience?: boolean;
  measureDivergence?: boolean;
  onProgress?: (progress: YouthBalanceProgress) => void;
};

type YouthBalanceExecutionOptions = YouthBalanceRunOptions & {
  skipWorldAnalysis?: boolean;
  precomputedMetrics?: readonly YouthSeasonMetrics[];
};

export type YouthBalanceParallelOptions = YouthBalanceRunOptions & {
  parallelism?: number;
};

const assertPositiveInteger = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} 必须是正整数`);
  }
};

const validateExecutionInput = (
  runs: number,
  seedStart: number,
  precomputedMetrics: readonly YouthSeasonMetrics[] | undefined,
): void => {
  assertPositiveInteger(runs, 'runs');
  if (!Number.isInteger(seedStart)) throw new Error('seedStart 必须是整数');
  if (!precomputedMetrics) return;
  if (precomputedMetrics.length !== runs) {
    throw new Error('预计算指标数量必须与 runs 一致');
  }
  precomputedMetrics.forEach((metric, index) => {
    if (metric.seed !== seedStart + index) {
      throw new Error('预计算指标必须按连续种子顺序排列');
    }
  });
};

const runYouthSeasonsInternal = (
  runs: number,
  seedStart = 1,
  options: YouthBalanceExecutionOptions = {},
): YouthBalanceReport => {
  validateExecutionInput(runs, seedStart, options.precomputedMetrics);
  const collectExperience = options.collectExperience ?? false;
  const collectDivergence = options.measureDivergence ?? false;
  const content = getYouthContent();
  const metrics: YouthSeasonMetrics[] = [...(options.precomputedMetrics ?? [])];
  const experiencePaths: ExperiencePath[] = [];
  const careerTraces: CareerTrace[] = [];
  const eventIdsByLength = content.events
    .map(({ id }) => id)
    .sort((left, right) => right.length - left.length);
  const eventThemeById = new Map(
    content.events.map((event) => [event.id, event.theme ?? 'off-pitch']),
  );
  const knownThemeCount = new Set(eventThemeById.values()).size;

  if (!options.precomputedMetrics) {
    for (let seed = seedStart; seed < seedStart + runs; seed += 1) {
      const experienceTrace: ExperienceTrace = collectExperience ? [] : null;
      const careerTrace: CareerTraceDraft | null = collectDivergence
        ? createCareerTrace(seed)
        : null;
      let save: CareerSaveV5Like = createYouthCareerV2(
        createCareerSave({
          playerName: `球员${seed}`,
          hometown: '上海',
          primaryPosition: 'FORWARD',
          preferredFoot: 'RIGHT',
          regionId: 'shanghai',
          seed,
        }),
        content,
      ) as unknown as CareerSaveV5Like;
      const initialAttributes = flatten(save.player.attributes);
      save = advanceYouthSeasonForExperience(
        save,
        content.academies,
        content.events,
        experienceTrace,
        careerTrace,
      );
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
        .map(
          ({ eventId, id }) =>
            eventId ??
            eventIdsByLength.find((candidate) => id.startsWith(`decision-${candidate}-`)),
        )
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

      // 平衡指标沿用三季基线；体验采集另跑完整青训窗口，避免分析工具改变分布门禁。
      const lifecycle = playLifecycle(final.save, content, null, careerTrace);
      const experienceLifecycle = experienceTrace
        ? playLifecycle(final.save, content, experienceTrace)
        : null;

      if (careerTrace) {
        completeCareerTrace(careerTrace, {
          ...lifecycle,
          careerSeasons: lifecycle.seasonsPlayed + lifecycle.proSeasonsPlayed,
          earlyRetirement: lifecycle.retireAge != null && lifecycle.retireAge < 30,
        });
        careerTraces.push(careerTrace);
      }

      metrics.push({
        seed,
        fixtures: final.save.season.fixtures.length,
        decisions: decisionFacts.length,
        totalAttributeGrowth: growth.reduce((sum, value) => sum + value, 0),
        maxAttributeGrowth: Math.max(...growth),
        injuries:
          final.save.health.previousInjuries.length +
          Number(Boolean(final.save.health.activeInjury)),
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
        careerSeasons: lifecycle.seasonsPlayed + lifecycle.proSeasonsPlayed,
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
        transferCount: lifecycle.transferCount,
        retireAge: lifecycle.retireAge,
        retiredReputation: lifecycle.retiredReputation,
        earlyRetirement: lifecycle.retireAge != null && lifecycle.retireAge < 30,
        overseasSpent: lifecycle.overseasSpent,
        experiencedCountries: lifecycle.experiencedCountries,
        hadCaps: lifecycle.hadCaps,
        capCount: lifecycle.capCount,
        proCupAppearances: lifecycle.cupAppearances,
        proCupHonours: lifecycle.cupHonours,
        proPromotions: lifecycle.promotions,
        proRelegations: lifecycle.relegations,
        permanentMarketRequests: lifecycle.permanentMarketRequests,
        permanentMarketSignings: lifecycle.permanentMarketSignings,
        loanMarketRequests: lifecycle.loanMarketRequests,
        loanSignings: lifecycle.loanSignings,
        loanReturns: lifecycle.loanReturns,
        loanSeasonAppearances: lifecycle.loanSeasonAppearances,
        loanHistoryCount: lifecycle.loanHistoryCount,
        activeLoanAtEnd: lifecycle.activeLoanAtEnd,
        loanContractStable: lifecycle.loanContractStable,
        overseasTransferCount: lifecycle.overseasTransferCount,
        weightedAbility: weightedAbility(
          final.save.player.identity.primaryPosition,
          final.save.player.attributes,
        ),
      });
      if (experienceTrace) {
        experiencePaths.push({
          careerSeasons: experienceLifecycle!.seasonsPlayed + experienceLifecycle!.proSeasonsPlayed,
          trace: experienceTrace,
        });
      }
      options.onProgress?.({
        completed: seed - seedStart + 1,
        total: runs,
        seed,
      });
    }
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
  const ratio = (numerator: number, denominator: number): number =>
    numerator / Math.max(1, denominator);
  const permanentMarketCareers = metrics.filter(
    ({ permanentMarketRequests }) => permanentMarketRequests > 0,
  ).length;
  const permanentMarketTransfers = metrics.filter(
    ({ permanentMarketSignings }) => permanentMarketSignings > 0,
  ).length;
  const loanMarketCareers = metrics.filter(
    ({ loanMarketRequests }) => loanMarketRequests > 0,
  ).length;
  const loanSigningCareers = metrics.filter(({ loanSignings }) => loanSignings > 0).length;
  const returnedLoanCareers = metrics.filter(
    ({ loanSignings, loanReturns }) => loanSignings > 0 && loanReturns > 0,
  ).length;
  const completedLoanCareers = metrics.filter(
    ({ loanHistoryCount }) => loanHistoryCount > 0,
  ).length;
  const loanAppearanceCareers = metrics.filter(
    ({ loanHistoryCount, loanSeasonAppearances }) =>
      loanHistoryCount > 0 && loanSeasonAppearances > 0,
  ).length;
  const transferSignings = metrics.reduce((sum, { transferCount }) => sum + transferCount, 0);
  const overseasMoveSignings = metrics.reduce(
    (sum, { overseasTransferCount }) => sum + overseasTransferCount,
    0,
  );
  // 世界层单独使用有限 5–100 季分析窗口，避免把 240 队背景计算写入生产存档或
  // 让玩家生涯平衡 runner 的成本随历史长度无限增长。
  const worldAnalysis = options.skipWorldAnalysis
    ? { metrics: [], summary: summarizeWorldEcosystem([]) }
    : runWorldEcosystemAnalysis(Math.min(100, Math.max(5, runs)), seedStart);
  const report: YouthBalanceReport = {
    runs,
    seedStart,
    metrics,
    experience: summarizeExperienceBatch(experiencePaths),
    countryExperience: summarizeCountryExperienceCoverage(metrics),
    worldMetrics: [...worldAnalysis.metrics],
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
      permanentTransferRate: ratio(permanentMarketTransfers, permanentMarketCareers),
      loanRate: ratio(loanSigningCareers, loanMarketCareers),
      loanReturnRate: ratio(returnedLoanCareers, loanSigningCareers),
      loanSeasonAppearanceRate: ratio(loanAppearanceCareers, completedLoanCareers),
      overseasMoveRate: ratio(overseasMoveSignings, transferSignings),
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
        metrics.reduce((sum, { proSevereInjuries }) => sum + proSevereInjuries, 0) /
        Math.max(
          1,
          metrics.reduce((sum, { proSeasonsPlayed }) => sum + proSeasonsPlayed, 0),
        ),
      proFreeAgentRate: metrics.filter(({ freeAgent }) => freeAgent).length / runs,
      careerTransferMean:
        graduatedMetrics.reduce((sum, { transferCount }) => sum + transferCount, 0) /
        Math.max(1, graduatedMetrics.length),
      // 留洋只对已签职业合同的球员开放，按职业生涯样本计算，避免青训未毕业样本稀释分母。
      overseasShare:
        graduatedMetrics.filter(({ overseasSpent }) => overseasSpent).length /
        Math.max(1, graduatedMetrics.length),
      nationalTeamShare: metrics.filter(({ hadCaps }) => hadCaps).length / runs,
      // spec §25.2：默认写实度下世界级球员（退役声望 ≥70，含传奇）占比目标 1%–5%。
      worldClassRate:
        metrics.filter(
          ({ retireAge, retiredReputation }) => retireAge != null && retiredReputation >= 70,
        ).length / runs,
      // spec §25.2/§11：伤病不得直接导致极早退役；阶段机只允许 ≥30 岁退役，该指标应恒为 0。
      earlyRetirementRate: metrics.filter(({ earlyRetirement }) => earlyRetirement).length / runs,
      world: worldAnalysis.summary,
      capsMedian: percentile(
        metrics.map(({ capCount }) => capCount),
        0.5,
      ),
      retirementAgeMedian: percentile(
        metrics.filter(({ retireAge }) => retireAge != null).map(({ retireAge }) => retireAge ?? 0),
        0.5,
      ),
      reviewGeneratedRate:
        metrics.filter(({ retireAge }) => retireAge != null).length /
        Math.max(1, graduatedMetrics.length),
      promiseShares,
      careerSeasonsMedian: percentile(
        metrics.map(({ careerSeasons }) => careerSeasons),
        0.5,
      ),
      proSeasonsPlayedMedian: percentile(
        graduatedMetrics.map(({ proSeasonsPlayed }) => proSeasonsPlayed),
        0.5,
      ),
      seasonsPlayedMedian: percentile(
        metrics.map(({ seasonsPlayed }) => seasonsPlayed),
        0.5,
      ),
      proCupAppearanceRate:
        graduatedMetrics.filter(({ proCupAppearances }) => proCupAppearances > 0).length /
        Math.max(1, graduatedMetrics.length),
      proCupHonourRate:
        graduatedMetrics.filter(({ proCupHonours }) => proCupHonours > 0).length /
        Math.max(1, graduatedMetrics.length),
      proPromotionRate:
        graduatedMetrics.filter(({ proPromotions }) => proPromotions > 0).length /
        Math.max(1, graduatedMetrics.length),
      proRelegationRate:
        graduatedMetrics.filter(({ proRelegations }) => proRelegations > 0).length /
        Math.max(1, graduatedMetrics.length),
    },
  };
  if (collectDivergence) report.divergence = buildDivergenceReport(careerTraces);
  return report;
};

export const runYouthSeasons = (
  runs: number,
  seedStart = 1,
  options: YouthBalanceRunOptions = {},
): YouthBalanceReport => runYouthSeasonsInternal(runs, seedStart, options);

type YouthBalanceWorkerData = {
  kind: 'youth-balance';
  index: number;
  runs: number;
  seedStart: number;
};

type YouthBalanceWorkerMessage =
  | { type: 'progress'; completed: number; seed: number }
  | { type: 'result'; metrics: YouthSeasonMetrics[] }
  | { type: 'error'; message: string };

const defaultParallelism = (): number => Math.max(1, Math.min(4, availableParallelism()));
const workerExecArgv = [
  '--experimental-strip-types',
  '--import',
  new URL('../register-loader.mjs', import.meta.url).href,
];

/** Runs independent seed ranges in bounded workers and aggregates them deterministically. */
export const runYouthSeasonsParallel = async (
  runs: number,
  seedStart = 1,
  options: YouthBalanceParallelOptions = {},
): Promise<YouthBalanceReport> => {
  validateExecutionInput(runs, seedStart, undefined);
  const requestedParallelism = options.parallelism ?? defaultParallelism();
  assertPositiveInteger(requestedParallelism, 'parallelism');
  const parallelism = Math.min(requestedParallelism, runs);
  if (parallelism === 1 || runs <= 1 || options.collectExperience || options.measureDivergence) {
    return runYouthSeasons(runs, seedStart, options);
  }

  const baseChunkSize = Math.floor(runs / parallelism);
  const remainder = runs % parallelism;
  const chunks = Array.from({ length: parallelism }, (_, index) => {
    const chunkRuns = baseChunkSize + Number(index < remainder);
    const previousChunks = baseChunkSize * index + Math.min(index, remainder);
    return {
      kind: 'youth-balance' as const,
      index,
      runs: chunkRuns,
      seedStart: seedStart + previousChunks,
    };
  });
  const workers: Worker[] = [];
  const completedByChunk = new Map<number, number>();
  try {
    const workerResults = await Promise.all(
      chunks.map(
        (chunk) =>
          new Promise<YouthSeasonMetrics[]>((resolveWorker, rejectWorker) => {
            const worker = new Worker(fileURLToPath(import.meta.url), {
              workerData: chunk,
              execArgv: workerExecArgv,
            });
            workers.push(worker);
            let settled = false;
            const resolveOnce = (metrics: YouthSeasonMetrics[]): void => {
              if (settled) return;
              settled = true;
              resolveWorker(metrics);
            };
            const rejectOnce = (error: Error): void => {
              if (settled) return;
              settled = true;
              rejectWorker(error);
            };
            worker.on('message', (value) => {
              if (settled) return;
              const message = value as YouthBalanceWorkerMessage;
              if (message.type === 'progress') {
                completedByChunk.set(chunk.index, message.completed);
                options.onProgress?.({
                  completed: [...completedByChunk.values()].reduce(
                    (sum, progress) => sum + progress,
                    0,
                  ),
                  total: runs,
                  seed: message.seed,
                });
                return;
              }
              if (message.type === 'result') {
                resolveOnce(message.metrics);
                return;
              }
              rejectOnce(new Error(message.message));
            });
            worker.on('error', (error) => {
              rejectOnce(error instanceof Error ? error : new Error(String(error)));
            });
            worker.on('exit', (code) => {
              if (settled) return;
              rejectOnce(new Error(`balance worker 未返回结果（退出码 ${code}）`));
            });
          }),
      ),
    );
    const metrics = workerResults.flatMap((result) => result);
    const finalOptions = {
      ...options,
      precomputedMetrics: metrics,
    };
    delete finalOptions.onProgress;
    delete finalOptions.parallelism;
    return runYouthSeasonsInternal(runs, seedStart, finalOptions);
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
};

const advanceYouthSeasonForExperience = (
  initialSave: CareerSaveV5Like,
  academies: ReturnType<typeof getYouthContent>['academies'],
  events: ReturnType<typeof getYouthContent>['events'],
  trace: ExperienceTrace,
  careerTrace: CareerTraceDraft | null = null,
): CareerSaveV5Like => {
  let save = initialSave;
  let guard = 0;
  while (!save.season.completed && guard < 100) {
    const skippedMonths: MonthSummary[] = [];
    let stopped = false;
    for (let monthGuard = 0; monthGuard < 60 && !save.season.completed; monthGuard += 1) {
      const previous = save;
      const outcome = advanceCareerMonth(save, academies, events);
      save = outcome.save;
      if (outcome.status === 'awaiting-decision') {
        recordNodeAdvance(trace, skippedMonths, 'event', outcome.event, save);
        save = resolveAutomatedDecision(save, outcome.event, events, trace, careerTrace);
        stopped = true;
        break;
      }
      skippedMonths.push(summarizeMonth(previous, save, outcome.report));
      const stopReason = experienceStopReason('youth-season', previous, save, outcome.status);
      if (stopReason) {
        recordNodeAdvance(trace, skippedMonths, stopReason, undefined, save);
        stopped = true;
        break;
      }
    }
    if (!stopped && !save.season.completed) {
      throw new Error('青训节点未在体验预算保护步数内停靠');
    }
    guard += 1;
  }
  if (!save.season.completed) throw new Error('青训赛季未在体验预算保护步数内完成');
  return save;
};

const advanceProfessionalSeasonForExperience = (
  initialSave: CareerSaveV5Like,
  clubs: ReturnType<typeof getYouthContent>['clubs'],
  events: ReturnType<typeof getYouthContent>['events'],
  trace: ExperienceTrace,
  careerTrace: CareerTraceDraft | null = null,
): CareerSaveV5Like => {
  let save = initialSave;
  let guard = 0;
  while (!save.proSeason?.completed && guard < 60) {
    const skippedMonths: MonthSummary[] = [];
    let stopped = false;
    for (let monthGuard = 0; monthGuard < 60 && !save.proSeason?.completed; monthGuard += 1) {
      const previous = save;
      const outcome = advanceProMonth(save, clubs, events);
      save = outcome.save;
      if (outcome.status === 'awaiting-decision') {
        recordNodeAdvance(trace, skippedMonths, 'event', outcome.event, save);
        save = resolveAutomatedDecision(save, outcome.event, events, trace, careerTrace);
        stopped = true;
        break;
      }
      skippedMonths.push(summarizeMonth(previous, save, outcome.report));
      const stopReason = experienceStopReason('pro-season', previous, save, outcome.status);
      if (stopReason) {
        recordNodeAdvance(trace, skippedMonths, stopReason, undefined, save);
        stopped = true;
        break;
      }
    }
    if (!stopped && !save.proSeason?.completed) {
      throw new Error('职业节点未在体验预算保护步数内停靠');
    }
    guard += 1;
  }
  if (!save.proSeason?.completed) throw new Error('职业赛季未在体验预算保护步数内完成');
  return save;
};

const experienceStopReason = (
  phase: 'youth-season' | 'pro-season',
  previous: CareerSaveV5Like,
  next: CareerSaveV5Like,
  status: 'month-complete' | 'season-complete',
): NodeStopReason | null => {
  if (
    status === 'season-complete' ||
    (phase === 'youth-season' ? next.season.completed : next.proSeason?.completed)
  ) {
    return 'season-end';
  }
  if (!previous.health.activeInjury && next.health.activeInjury) return 'injury';
  if (previous.contract?.clubId !== next.contract?.clubId) return 'contract';
  if ((next.pendingOffers?.length ?? 0) > (previous.pendingOffers?.length ?? 0)) return 'offer';
  if (
    previous.nationalTeam?.capped !== next.nationalTeam?.capped ||
    (previous.nationalTeam?.caps ?? 0) !== (next.nationalTeam?.caps ?? 0)
  ) {
    return 'national-team';
  }
  return null;
};

const resolveAutomatedDecision = (
  save: CareerSaveV5Like,
  event: YouthEventInstance,
  events: ReturnType<typeof getYouthContent>['events'],
  trace: ExperienceTrace,
  careerTrace: CareerTraceDraft | null = null,
): CareerSaveV5Like => {
  const choice = event.choices[0];
  if (!choice) throw new Error(`事件 ${event.eventId} 缺少可用选择`);
  recordEventChoice(event, trace);
  const resolved = submitCareerDecision(save, event.eventId, choice.id);
  recordCareerChoice(
    careerTrace,
    event.eventId,
    choice.id,
    resolved.story.pendingFeedback?.resultTitle ??
      resolved.story.pendingFeedback?.outcome?.label ??
      null,
  );
  if (resolved.story.pendingFeedback) {
    recordFeedback(resolved.story.pendingFeedback, events, trace);
  }
  return clearEventFeedback(resolved);
};

const recordNodeAdvance = (
  trace: ExperienceTrace,
  skippedMonths: readonly MonthSummary[],
  stopReason: NodeStopReason,
  stopEvent: YouthEventInstance | undefined,
  save: CareerSaveV5Like,
): void => {
  if (!trace) return;
  const brief = buildNodeBrief(
    skippedMonths,
    stopReason,
    stopEvent,
    save.proSeason?.currentMonth ?? save.season.currentMonth,
  );
  trace.push({
    kind: 'node-advance',
    surface: 'node-advance',
    requiredText: [
      '推进回顾 · 节点简报',
      '推进到下一节点',
      brief.headline,
      brief.skippedSummary,
      '期间变化',
      ...brief.changes,
      '下一步关注',
      brief.nextFocus,
    ].join(' '),
  });
};

const recordEventChoice = (event: YouthEventInstance, trace: ExperienceTrace): void => {
  if (!trace) return;
  trace.push({
    kind: 'decision',
    surface: 'event-choice',
    requiredText: [
      '生涯事件 · 需要决定',
      event.title,
      event.description,
      '请选择行动',
      '你的选择会留下生涯记录，也可能改变接下来几周的训练与关系。',
      ...event.choices.flatMap(({ text, riskLabel }) => [
        text,
        '风险',
        experienceRiskLabel(riskLabel),
      ]),
    ].join(' '),
  });
};

const recordFeedback = (
  feedback: EventFeedback,
  events: ReturnType<typeof getYouthContent>['events'],
  trace: ExperienceTrace,
): void => {
  if (!trace) return;
  const resultTone = feedback.resultTone ?? feedback.outcome?.outcome ?? 'neutral';
  const resultTitle = feedback.resultTitle ?? feedback.outcome?.label ?? '事件暂告一段落';
  const nextEventTitles = (feedback.nextEventIds ?? []).flatMap((eventId) => {
    const title = events.find(({ id }) => id === eventId)?.title;
    return title ? [title] : [];
  });
  trace.push({
    kind: 'feedback',
    surface: 'event-feedback',
    requiredText: [
      '事件反馈 · 已记录',
      feedback.title,
      '选择回放',
      '你已经做出决定，下面是这次选择在场内外留下的回应与影响。',
      '你的选择',
      feedback.resultTitle,
      feedback.choiceText,
      '结果',
      resultToneLabel(resultTone),
      resultTitle,
      feedback.response,
      '判定依据',
      feedback.outcome?.reason,
      '主能力',
      feedback.outcome?.attribute,
      feedback.outcome?.attributeValue,
      '综合判定',
      feedback.outcome?.score,
      '难度',
      feedback.outcome?.target,
      '对话',
      '人物回应',
      ...feedback.participantResponses.flatMap(({ personName, role, text }) => [
        personName,
        roleLabel(role),
        text,
      ]),
      feedback.participantResponses.length === 0 ? '本次选择暂未收到新的场内回应。' : undefined,
      '影响',
      '变化记录',
      '状态',
      '你身上的变化',
      ...feedback.stateChanges.flatMap(({ key, oldValue, newValue }) => [
        stateLabel(key, oldValue, newValue),
        oldValue,
        newValue,
      ]),
      '关系',
      '关系变化',
      ...feedback.relationshipChanges.flatMap(({ personName, dimension, delta }) => [
        personName,
        relationshipLabel(dimension),
        delta,
      ]),
      feedback.stateChanges.length === 0 && feedback.relationshipChanges.length === 0
        ? '本次选择暂未改变可量化状态，后续影响仍在观察中。'
        : undefined,
      '后续影响',
      feedback.followUp,
      nextEventTitles.length > 0 ? '剧情推进 下一幕线索' : undefined,
      ...nextEventTitles,
      '继续推进',
    ]
      .filter(
        (value): value is string | number => value !== undefined && value !== null && value !== '',
      )
      .map(String)
      .join(' '),
  });
};

const experienceRiskLabel = (value: string): string =>
  value === 'low' ? '低风险' : value === 'high' ? '高风险' : '中风险';

const resultToneLabel = (value: string): string =>
  value === 'success'
    ? '成功'
    : value === 'partial'
      ? '部分达成'
      : value === 'failure'
        ? '受挫'
        : '中性记录';

const roleLabel = (value: string): string =>
  ({
    'youth-coach': '教练',
    'assistant-coach': '助教',
    teammate: '队友',
    rival: '竞争者',
    family: '家人',
  })[value] ?? '相关人物';

const stateLabel = (value: string, oldValue: number, newValue: number): string =>
  value === 'fatigue' && newValue > oldValue
    ? '疲劳增加'
    : ({
        morale: '士气',
        form: '状态',
        confidence: '信心',
        fitness: '体能',
        fatigue: '疲劳',
        coachTrust: '教练评价',
      }[value] ?? value);

const relationshipLabel = (value: string): string =>
  ({ trust: '教练信任', respect: '尊重', closeness: '亲近度' })[value] ?? value;

const recordContractInteraction = (
  offers: readonly ContractOfferV3[],
  label: string,
  trace: ExperienceTrace,
  actionText = offers.length > 0 ? '选择这份要约' : label,
): void => {
  if (!trace) return;
  trace.push({
    kind: 'contract',
    surface: 'contract',
    requiredText: [
      '职业市场 · 谈判桌',
      label,
      '每一份合同都代表不同的出场路径、成长速度和风险承担。',
      ...offers.map(contractOfferText),
      actionText,
    ].join(' '),
  });
};

const contractOfferText = (offer: ContractOfferV3): string =>
  [
    offer.clubName,
    `层级 ${offer.clubTier}`,
    `年薪 ${offer.salaryPerYear.toLocaleString('zh-CN')} 游戏币/年`,
    `${offer.contractYears} 年`,
    roleLabel(offer.squadRole),
    offer.promise.kind === 'playing-time'
      ? `出场承诺 ${Math.round(offer.promise.minimumShare * 100)}%`
      : offer.promise.kind === 'position-guarantee'
        ? '承诺培养对应位置'
        : '无特殊承诺',
    offer.offerKind === 'loan' ? '租借 合同仍归母队 赛季末自动回归' : '永久转会',
    offer.releaseClauseNote,
  ].join(' ');

const recordContractConfirmation = (offer: ContractOfferV3, trace: ExperienceTrace): void => {
  if (!trace) return;
  const loan = offer.offerKind === 'loan';
  trace.push({
    kind: 'contract',
    surface: 'contract',
    requiredText: [
      '签署确认',
      loan
        ? `确认与 ${offer.clubName} 签署租借 ${offer.contractYears} 年合同？合同仍归母队，赛季末自动回归。`
        : `确认与 ${offer.clubName} 签署 ${offer.contractYears} 年合同？签署是不可撤销的重大决定。`,
      loan ? '确认签署租借' : '确认签署',
      '再考虑一下',
    ].join(' '),
  });
};

type RetirementInteraction = 'youth' | 'professional' | 'market-exit';

const recordRetirement = (
  trace: ExperienceTrace,
  interaction: RetirementInteraction = 'professional',
): void => {
  if (!trace) return;
  trace.push({
    kind: 'retirement',
    surface: 'retirement',
    requiredText: interaction === 'youth' ? '结束青训生涯' : '宣布退役',
  });
  trace.push({
    kind: 'retirement',
    surface: 'retirement',
    requiredText:
      interaction === 'youth'
        ? '结束后将不能继续这段青训生涯，并会生成生涯回顾。确认结束并查看回顾 暂不结束'
        : interaction === 'market-exit'
          ? '退役是不可逆的决定。确定要结束球员生涯吗？确认离开职业足坛 继续寻找机会'
          : '退役是不可逆的决定。确定要结束球员生涯吗？确认退役 继续职业生涯',
  });
};

/**
 * 版本化确定性毕业策略（policy v1）：
 * 毕业资格达标即设定均衡倾向；有出场承诺要约时签薪资最高者，
 * 否则签层级 ≤5 的最高薪要约；两者皆无则拒绝全部要约并继续青训。
 */
const playLifecycle = (
  completed: CareerSaveV5Like,
  content: ReturnType<typeof getYouthContent>,
  trace: ExperienceTrace,
  careerTrace: CareerTraceDraft | null = null,
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
    transferCount: 0,
    retireAge: null,
    retiredReputation: 0,
    overseasSpent: false,
    experiencedCountries: [],
    hadCaps: false,
    capCount: 0,
    cupAppearances: 0,
    cupHonours: 0,
    promotions: 0,
    relegations: 0,
    proSeasonsPlayed: 0,
    promiseKept: false,
    lastCause: 'none',
    starterReached: false,
    totalMinutes: 0,
    leagueAppearances: 0,
    severeInjuries: 0,
    freeAgent: false,
    permanentMarketRequests: 0,
    permanentMarketSignings: 0,
    loanMarketRequests: 0,
    loanSignings: 0,
    loanReturns: 0,
    loanSeasonAppearances: 0,
    loanHistoryCount: 0,
    activeLoanAtEnd: false,
    loanContractStable: true,
    overseasTransferCount: 0,
  };
  for (let season = 1; ; season += 1) {
    if (!save.season.completed) throw new Error('生命周期要求进入休赛期的存档已完成赛季');
    const entered = enterOffseason(save, content.academies);
    save = entered.save;
    if (!save.offseason) throw new Error('休赛期状态缺失');
    const finishYouth = (): LifecycleOutcome => {
      if (!trace) {
        return {
          ...outcome,
          seasonsPlayed,
          rejectedOfferSeasons,
          retiredReputation: save.player.reputation,
        };
      }
      if (save.careerPhase === 'free-agent') {
        recordRetirement(trace, 'market-exit');
        save = endProfessionalCareer(
          save,
          save.season.endDate,
          'market-exit',
        ) as unknown as CareerSaveV5Like;
      } else {
        recordRetirement(trace, 'youth');
        save = endYouthCareer(save as unknown as CareerSaveV7Like) as unknown as CareerSaveV5Like;
      }
      return {
        ...outcome,
        seasonsPlayed,
        rejectedOfferSeasons,
        retiredReputation: save.player.reputation,
      };
    };
    if (save.offseason.graduationEligible) {
      const priorities = ['playing-time', 'development', 'salary'] as const;
      const priority = priorities[save.randomState.seed % priorities.length]!;
      const withPrefs = submitAgentPreferences(save, {
        leagueTierBias: 'balanced',
        priority,
      });
      const withOffers = generateContractOffers(withPrefs, content);
      const offers = withOffers.pendingOffers;
      recordContractInteraction(offers, '职业合同报价', trace);
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
      const ambitionFloor = abilityCeiling + (save.randomState.seed % 3 === 0 ? 1 : 0);
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
        recordContractConfirmation(best, trace);
        const signed = signContract(withOffers, best.id);
        const pro = playProfessionalLife(signed, content, 20, trace, careerTrace);
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
          overseasSpent: pro.overseasSpent,
          experiencedCountries: pro.experiencedCountries,
          transferCount: pro.transferCount,
          retireAge: pro.retireAge,
          retiredReputation: pro.retiredReputation,
          hadCaps: pro.hadCaps,
          capCount: pro.capCount,
          cupAppearances: pro.cupAppearances,
          cupHonours: pro.cupHonours,
          promotions: pro.promotions,
          relegations: pro.relegations,
          permanentMarketRequests: pro.permanentMarketRequests,
          permanentMarketSignings: pro.permanentMarketSignings,
          loanMarketRequests: pro.loanMarketRequests,
          loanSignings: pro.loanSignings,
          loanReturns: pro.loanReturns,
          loanSeasonAppearances: pro.loanSeasonAppearances,
          loanHistoryCount: pro.loanHistoryCount,
          activeLoanAtEnd: pro.activeLoanAtEnd,
          loanContractStable: pro.loanContractStable,
          overseasTransferCount: pro.overseasTransferCount,
        };
      }
    }
    if ((!trace && season === 3) || !canContinueYouthSeason(save)) return finishYouth();
    save = completeNextSeason(save, content, trace, careerTrace);
    seasonsPlayed += 1;
  }
  return { ...outcome, seasonsPlayed, rejectedOfferSeasons };
};

/** 开启并完整模拟下个赛季，返回结算后的存档。 */
const completeNextSeason = (
  offseasonSave: CareerSaveV5Like,
  content: ReturnType<typeof getYouthContent>,
  trace: ExperienceTrace,
  careerTrace: CareerTraceDraft | null = null,
): CareerSaveV5Like => {
  const save = advanceYouthSeasonForExperience(
    advanceToNextSeason(offseasonSave, content),
    content.academies,
    content.events,
    trace,
    careerTrace,
  );
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
 * 全生涯生命周期（policy v1）：
 * 优先续约；到期后自由球员要约择一签署（含留洋可能）；
 * 记录承诺兑现、转会次数、国家队与退役年龄，直到退役或 proSeasons 季上限。
 */
const playProfessionalLife = (
  signed: CareerSaveV5Like,
  content: ReturnType<typeof getYouthContent>,
  proSeasons: number,
  trace: ExperienceTrace,
  careerTrace: CareerTraceDraft | null = null,
): {
  seasonsPlayed: number;
  promiseKept: boolean;
  lastCause: string;
  starterReached: boolean;
  totalMinutes: number;
  leagueAppearances: number;
  severeInjuries: number;
  freeAgent: boolean;
  transferCount: number;
  retireAge: number | null;
  retiredReputation: number;
  hadCaps: boolean;
  capCount: number;
  cupAppearances: number;
  cupHonours: number;
  promotions: number;
  relegations: number;
  overseasSpent: boolean;
  experiencedCountries: Country[];
  permanentMarketRequests: number;
  permanentMarketSignings: number;
  loanMarketRequests: number;
  loanSignings: number;
  loanReturns: number;
  loanSeasonAppearances: number;
  loanHistoryCount: number;
  activeLoanAtEnd: boolean;
  loanContractStable: boolean;
  overseasTransferCount: number;
} => {
  let save = signed;
  const professionalClubs = [...content.clubs, ...(content.overseasClubs ?? [])];
  let seasonsPlayed = 0;
  let promiseKept = false;
  let lastCause = 'none';
  let starterReached = false;
  let totalMinutes = 0;
  let leagueAppearances = 0;
  let severeInjuries = 0;
  let freeAgent = false;
  let transferCount = 0;
  let retireAge: number | null = null;
  let hadCaps = false;
  let capCount = 0;
  let cupAppearances = 0;
  let cupHonours = 0;
  let promotions = 0;
  let relegations = 0;
  let overseasSpent = signed.overseasSince !== null;
  const experiencedCountries = new Set<Country>();
  const countryByClubId = new Map(
    professionalClubs.map((club) => [club.id, inferLegacyClubCountry(club)]),
  );
  const recordClubCountry = (clubId: string | undefined): void => {
    const country = clubId ? countryByClubId.get(clubId) : undefined;
    if (country) experiencedCountries.add(country);
  };
  let permanentMarketRequests = 0;
  let permanentMarketSignings = 0;
  let loanMarketRequests = 0;
  let loanSignings = 0;
  let loanReturns = 0;
  let loanSeasonAppearances = 0;
  let loanContractStable = true;
  let overseasTransferCount = 0;
  let freeAgentWindows = 0;
  const retirementAgeTarget = 29 + (signed.randomState.seed % 3);

  while (seasonsPlayed < proSeasons && save.careerPhase !== 'retired') {
    if (save.careerPhase === 'free-agent') {
      freeAgent = true;
      if (save.player.age >= 30 && save.player.age >= retirementAgeTarget) {
        recordRetirement(trace);
        save = retireUse(save, save.proSeason?.endDate ?? '2040-06-30');
        continue;
      }
      if (save.pendingOffers.length === 0) {
        save = generateFreeAgentOffers(save, content);
        freeAgentWindows += 1;
      }
      if (save.pendingOffers.length > 0) {
        recordContractInteraction(save.pendingOffers, '自由球员报价', trace);
        transferCount += 1;
        const overseasOffer = save.pendingOffers.find(({ overseas }) => overseas);
        const target =
          overseasOffer ??
          save.pendingOffers.reduce((left, right) =>
            right.clubTier > left.clubTier ? right : left,
          );
        recordContractConfirmation(target, trace);
        save = signTransfer(save, target.id);
        if (target.overseas) overseasTransferCount += 1;
        overseasSpent = overseasSpent || save.overseasSince !== null;
        freeAgentWindows = 0;
        continue;
      }
      if (save.player.age >= 30) {
        recordRetirement(trace);
        save = retireUse(save, save.proSeason?.endDate ?? '2040-06-30');
        continue;
      }
      if (freeAgentWindows >= 3) break;
      continue;
    }
    const phase = save.careerPhase;
    if (phase !== 'professional-contract' && phase !== 'pro-offseason') {
      break;
    }
    if (phase === 'pro-offseason') {
      if (save.player.age >= 30 && save.player.age >= retirementAgeTarget) {
        if (save.pendingOffers.length > 0) {
          recordContractInteraction(save.pendingOffers, '续约选择', trace);
          save = declineRenewalUse(save);
        } else {
          recordRetirement(trace);
          save = retireUse(save, save.proSeason?.endDate ?? '2040-06-30');
        }
        continue;
      }
      if (save.pendingOffers[0]?.id.startsWith('renewal-')) {
        recordContractInteraction(save.pendingOffers, '续约选择', trace);
        const contractEndYear = Number(save.proSeason?.endDate.slice(0, 4) ?? 0);
        const shouldStay = (contractEndYear + save.player.age) % 3 !== 0;
        if (!shouldStay) {
          save = declineRenewalUse(save);
          continue;
        }
        save = acceptRenewal(save);
      }
      const marketPath = (signed.randomState.seed + save.player.age) % 10;
      const loanPathAvailable = marketPath <= 2;
      if (loanPathAvailable) {
        loanMarketRequests += 1;
        const loanMarket = requestCareerMarket(save, content, 'loan');
        if (loanMarket.pendingOffers.length > 0) {
          recordContractInteraction(loanMarket.pendingOffers, '租借市场报价', trace);
          recordContractConfirmation(loanMarket.pendingOffers[0]!, trace);
          loanSignings += 1;
          save = signMarketOffer(loanMarket, loanMarket.pendingOffers[0]!.id);
          continue;
        }
        recordContractInteraction(loanMarket.pendingOffers, '租借市场', trace);
      }
      if (marketPath === 3) {
        permanentMarketRequests += 1;
        const permanentMarket = requestCareerMarket(save, content, 'permanent');
        if (permanentMarket.pendingOffers.length > 0) {
          recordContractInteraction(permanentMarket.pendingOffers, '永久转会报价', trace);
          recordContractConfirmation(permanentMarket.pendingOffers[0]!, trace);
          permanentMarketSignings += 1;
          transferCount += 1;
          if (permanentMarket.pendingOffers[0]!.overseas) overseasTransferCount += 1;
          save = signMarketOffer(permanentMarket, permanentMarket.pendingOffers[0]!.id);
          overseasSpent = overseasSpent || save.overseasSince !== null;
          continue;
        }
        recordContractInteraction(permanentMarket.pendingOffers, '永久转会市场', trace);
        save = permanentMarket;
      }
    }
    const loanForSeason = save.activeLoan;
    save = startProfessionalSeason(save, professionalClubs);
    recordClubCountry(save.proSeason?.clubId);
    overseasSpent = overseasSpent || save.overseasSince !== null;
    save = advanceProfessionalSeasonForExperience(
      save,
      professionalClubs,
      content.events,
      trace,
      careerTrace,
    );
    if (!save.proSeason!.completed) throw new Error('职业赛季未在保护步数内完成');
    const settled = completeProfessionalSeason(save);
    save = settled.save;
    if (loanForSeason) {
      const loanEntry = save.loanHistory.at(-1);
      if (!loanEntry || loanEntry.seasonId !== loanForSeason.seasonId) {
        throw new Error('租借赛季 ' + loanForSeason.seasonId + ' 未写入租借履历');
      }
      loanReturns += 1;
      loanSeasonAppearances += loanEntry.appearances;
      loanContractStable =
        loanContractStable && save.contract?.clubId === loanForSeason.parentClubId;
    }
    cupAppearances += save.proSeasonStats.cupAppearances ?? 0;
    const honours = save.seasonHistory.at(-1)?.honours ?? [];
    cupHonours += honours.filter(({ kind }) => kind === 'cup-champion').length;
    promotions += honours.filter(({ kind }) => kind === 'promotion').length;
    relegations += honours.filter(({ kind }) => kind === 'relegation').length;
    if (save.story.pendingEvent?.storyId === 'national-team-debut') {
      const choiceId =
        (save.randomState.seed + save.player.age) % 2 === 0
          ? 'accept-national-team'
          : 'decline-national-team';
      const nationalTeamEvent = save.story.pendingEvent;
      recordEventChoice(nationalTeamEvent, trace);
      const nationalTeamDecision = submitNationalTeamDecision(save, choiceId);
      recordCareerChoice(
        careerTrace,
        nationalTeamEvent.eventId,
        choiceId,
        nationalTeamDecision.story.pendingFeedback?.resultTitle ??
          nationalTeamDecision.story.pendingFeedback?.outcome?.label ??
          null,
      );
      if (nationalTeamDecision.story.pendingFeedback) {
        recordFeedback(nationalTeamDecision.story.pendingFeedback, content.events, trace);
      }
      save = clearEventFeedback(nationalTeamDecision);
    }
    seasonsPlayed += 1;
    totalMinutes += save.proSeasonStats.minutes;
    leagueAppearances += save.proSeasonStats.leagueAppearances;
    const review = settled.review;
    if (review) {
      promiseKept = promiseKept || review.review.status === 'kept';
      lastCause = review.review.cause;
    }
    if (save.nationalTeam?.capped) {
      hadCaps = true;
      capCount = save.nationalTeam.caps;
    }
    const ownPlayed = save.proSeason!.fixtures.filter(
      ({ status, homeClubId, awayClubId }) =>
        status === 'played' &&
        (homeClubId === save.proSeason!.clubId || awayClubId === save.proSeason!.clubId),
    ).length;
    if (save.proSeasonStats.minutes / Math.max(1, ownPlayed * 90) >= 0.5) {
      starterReached = true;
    }
    if (save.pendingOffers.length > 0) {
      if (save.player.age >= 30 && save.player.age >= retirementAgeTarget) {
        recordContractInteraction(save.pendingOffers, '续约选择', trace);
        save = declineRenewalUse(save);
        continue;
      }
      const contractEndYear = Number(save.proSeason?.endDate.slice(0, 4) ?? 0);
      // 到期合同约半数续留、半数进入市场，避免批量政策把转会和留洋压得过低。
      const shouldStay = (contractEndYear + save.player.age) % 3 !== 0;
      if (shouldStay) {
        recordContractInteraction(save.pendingOffers, '续约选择', trace);
        save = acceptRenewal(save);
        continue;
      }
      // 合同到期：拒绝续约，下一轮进入自由球员市场。
      recordContractInteraction(save.pendingOffers, '续约选择', trace);
      save = declineRenewalUse(save);
      continue;
    }
    if (save.player.age >= 30 && save.player.age >= retirementAgeTarget) {
      recordRetirement(trace);
      save = retireUse(save, save.proSeason?.endDate ?? '2040-06-30');
      continue;
    }
    // 合同未到期：直接留队
  }
  if (
    save.careerPhase === 'pro-offseason' &&
    save.player.age >= 30 &&
    save.player.age >= retirementAgeTarget
  ) {
    recordRetirement(trace);
    save = retireUse(save, save.proSeason?.endDate ?? '2040-06-30');
  }
  freeAgent = save.careerPhase === 'free-agent';
  if (save.careerPhase === 'retired') retireAge = save.player.age;
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
    overseasSpent,
    experiencedCountries: [...experiencedCountries].sort(),
    transferCount,
    retireAge,
    retiredReputation: save.player.reputation,
    hadCaps,
    capCount,
    cupAppearances,
    cupHonours,
    promotions,
    relegations,
    permanentMarketRequests,
    permanentMarketSignings,
    loanMarketRequests,
    loanSignings,
    loanReturns,
    loanSeasonAppearances,
    loanHistoryCount: save.loanHistory.length,
    activeLoanAtEnd: Boolean(save.activeLoan),
    loanContractStable,
    overseasTransferCount,
  };
};

const workerPort = parentPort;
if (
  !isMainThread &&
  workerPort &&
  (workerData as Partial<YouthBalanceWorkerData> | undefined)?.kind === 'youth-balance'
) {
  const data = workerData as YouthBalanceWorkerData;
  try {
    const report = runYouthSeasonsInternal(data.runs, data.seedStart, {
      skipWorldAnalysis: true,
      onProgress: ({ completed, seed }) => {
        workerPort.postMessage({ type: 'progress', completed, seed });
      },
    });
    workerPort.postMessage({ type: 'result', metrics: report.metrics });
  } catch (error) {
    workerPort.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

const isMain =
  isMainThread && process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  void (async () => {
    const readArg = (name: string, fallback: string) => {
      const index = process.argv.indexOf(name);
      if (index < 0) return fallback;
      return process.argv[index + 1] ?? fallback;
    };
    const measureDivergence = process.argv.includes('--measure-divergence');
    const runs = Number(readArg('--runs', measureDivergence ? '12' : '1000'));
    const seedStart = Number(readArg('--seed-start', '1'));
    const output = resolve(readArg('--output', 'artifacts/youth-balance.json'));
    const collectExperience = process.argv.includes('--experience');
    const progressStep = Math.max(1, Math.floor(runs / 100));
    let lastProgress = 0;
    const onProgress = ({ completed, total }: YouthBalanceProgress): void => {
      if (completed !== total && completed - lastProgress < progressStep) return;
      lastProgress = completed;
      process.stderr.write(`[balance] ${completed}/${total} completed\n`);
    };
    const report =
      collectExperience || measureDivergence
        ? runYouthSeasons(runs, seedStart, {
            collectExperience,
            measureDivergence,
            onProgress,
          })
        : await runYouthSeasonsParallel(runs, seedStart, { onProgress });
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report.summary, null, 2));
    if (report.divergence) {
      console.log(JSON.stringify({ divergence: report.divergence }, null, 2));
    }
  })();
}
