export interface CareerChoiceTrace {
  eventId: string;
  familyId: string | null;
  choiceId: string;
  consequence: string | null;
}

export interface CareerTrajectoryTrace {
  careerSeasons: number;
  proSeasonsPlayed: number;
  transferCount: number;
  overseasSpent: boolean;
  hadCaps: boolean;
  cupHonours: number;
  promotions: number;
  relegations: number;
}

export interface RetirementEvaluationTrace {
  retireAge: number | null;
  retiredReputation: number;
  earlyRetirement: boolean;
}

export interface CareerTrace {
  seed?: number;
  storyFamilies: readonly string[];
  storyNodes?: Readonly<Record<string, readonly string[]>>;
  importantChoices?: readonly CareerChoiceTrace[];
  mainResolutions: readonly string[];
  trajectory?: CareerTrajectoryTrace;
  retirement?: RetirementEvaluationTrace;
}

export interface CareerTraceDraft {
  seed?: number;
  storyFamilies: string[];
  storyNodes: Record<string, string[]>;
  importantChoices: CareerChoiceTrace[];
  mainResolutions: string[];
  trajectory?: CareerTrajectoryTrace;
  retirement?: RetirementEvaluationTrace;
}

export interface DivergencePair {
  leftRun: number;
  rightRun: number;
  familyOverlapRate: number;
  familyDivergenceRate: number;
  mainStoryOverlapRate: number;
}

export interface RepeatedStoryFamily {
  familyId: string;
  appearanceCount: number;
  appearanceRate: number;
  pairwiseRepeatRate: number;
  exceedsWarningLine: boolean;
}

export interface StoryDivergenceReport {
  sampleCount: number;
  traces: readonly CareerTrace[];
  familyOverlapRate: number;
  mainStoryRepeatRate: number;
  uniqueTrajectories: number;
  pairwise: readonly DivergencePair[];
  repeatedStoryFamilies: readonly RepeatedStoryFamily[];
}

export const createCareerTrace = (seed?: number): CareerTraceDraft => ({
  ...(seed === undefined ? {} : { seed }),
  storyFamilies: [],
  storyNodes: {},
  importantChoices: [],
  mainResolutions: [],
});

export const recordCareerChoice = (
  trace: CareerTraceDraft | null,
  eventId: string,
  choiceId: string,
  consequence: string | null = null,
): void => {
  if (!trace) return;
  const familyId = familyIdFromEventId(eventId);
  trace.importantChoices.push({ eventId, familyId, choiceId, consequence });
  if (!familyId) return;

  if (!trace.storyFamilies.includes(familyId)) trace.storyFamilies.push(familyId);
  const nodes = trace.storyNodes[familyId] ?? [];
  if (!nodes.includes(eventId)) nodes.push(eventId);
  trace.storyNodes[familyId] = nodes;
  if (eventId.endsWith('-node-3')) {
    trace.mainResolutions.push(`${eventId}:${choiceId}:${consequence ?? 'unrecorded'}`);
  }
};

export const completeCareerTrace = (
  trace: CareerTraceDraft | null,
  outcome: CareerTrajectoryTrace & RetirementEvaluationTrace,
): void => {
  if (!trace) return;
  trace.trajectory = {
    careerSeasons: outcome.careerSeasons,
    proSeasonsPlayed: outcome.proSeasonsPlayed,
    transferCount: outcome.transferCount,
    overseasSpent: outcome.overseasSpent,
    hadCaps: outcome.hadCaps,
    cupHonours: outcome.cupHonours,
    promotions: outcome.promotions,
    relegations: outcome.relegations,
  };
  trace.retirement = {
    retireAge: outcome.retireAge,
    retiredReputation: outcome.retiredReputation,
    earlyRetirement: outcome.earlyRetirement,
  };
};

export const measureDivergence = (
  runs: readonly CareerTrace[],
): Pick<
  StoryDivergenceReport,
  'familyOverlapRate' | 'mainStoryRepeatRate' | 'uniqueTrajectories'
> => {
  const report = buildDivergenceReport(runs);
  return {
    familyOverlapRate: report.familyOverlapRate,
    mainStoryRepeatRate: report.mainStoryRepeatRate,
    uniqueTrajectories: report.uniqueTrajectories,
  };
};

export const buildDivergenceReport = (
  runs: readonly CareerTrace[],
  warningLine = 0.25,
): StoryDivergenceReport => {
  const pairwise: DivergencePair[] = [];
  for (let leftIndex = 0; leftIndex < runs.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < runs.length; rightIndex += 1) {
      const left = runs[leftIndex]!;
      const right = runs[rightIndex]!;
      const familyOverlapRate = jaccard(mainFamilies(left), mainFamilies(right));
      pairwise.push({
        leftRun: leftIndex + 1,
        rightRun: rightIndex + 1,
        familyOverlapRate,
        familyDivergenceRate:
          1 - jaccard(new Set(left.storyFamilies), new Set(right.storyFamilies)),
        mainStoryOverlapRate: familyOverlapRate,
      });
    }
  }
  const pairCount = pairwise.length;
  const allFamilies = new Set(runs.flatMap((run) => [...mainFamilies(run)]));
  const repeatedStoryFamilies = [...allFamilies]
    .map((familyId) => {
      const appearanceCount = runs.filter((run) => mainFamilies(run).has(familyId)).length;
      const pairwiseRepeatCount = pairwise.filter(
        ({ leftRun, rightRun }) =>
          mainFamilies(runs[leftRun - 1]!).has(familyId) &&
          mainFamilies(runs[rightRun - 1]!).has(familyId),
      ).length;
      const pairwiseRepeatRate = pairCount === 0 ? 0 : pairwiseRepeatCount / pairCount;
      return {
        familyId,
        appearanceCount,
        appearanceRate: appearanceCount / Math.max(1, runs.length),
        pairwiseRepeatRate,
        exceedsWarningLine: pairwiseRepeatRate > warningLine,
      } satisfies RepeatedStoryFamily;
    })
    .sort(
      (left, right) =>
        right.pairwiseRepeatRate - left.pairwiseRepeatRate ||
        right.appearanceCount - left.appearanceCount ||
        left.familyId.localeCompare(right.familyId),
    );
  return {
    sampleCount: runs.length,
    traces: runs,
    familyOverlapRate:
      pairCount === 0
        ? 0
        : pairwise.reduce((sum, pair) => sum + pair.familyDivergenceRate, 0) / pairCount,
    mainStoryRepeatRate:
      pairCount === 0
        ? 0
        : pairwise.reduce((sum, pair) => sum + pair.mainStoryOverlapRate, 0) / pairCount,
    uniqueTrajectories: new Set(runs.map(trajectorySignature)).size,
    pairwise,
    repeatedStoryFamilies,
  };
};

const familyIdFromEventId = (eventId: string): string | null => {
  const match = /^(.*)-node-[1-9]\d*$/.exec(eventId);
  return match?.[1] ?? null;
};

const mainFamilies = (trace: CareerTrace): Set<string> => {
  const nodes = Object.entries(trace.storyNodes ?? {}).filter(([, nodeIds]) => nodeIds.length >= 3);
  return new Set(nodes.length > 0 ? nodes.map(([familyId]) => familyId) : trace.storyFamilies);
};

const jaccard = (left: ReadonlySet<string>, right: ReadonlySet<string>): number => {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 1;
  const intersection = [...left].filter((value) => right.has(value)).length;
  return intersection / union.size;
};

const trajectorySignature = (trace: CareerTrace): string =>
  JSON.stringify({
    storyFamilies: trace.storyFamilies,
    storyNodes: Object.entries(trace.storyNodes ?? {}).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
    importantChoices: trace.importantChoices ?? [],
    mainResolutions: trace.mainResolutions,
    trajectory: trace.trajectory ?? null,
    retirement: trace.retirement ?? null,
  });
