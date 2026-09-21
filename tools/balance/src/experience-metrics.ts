export type ExperienceInteractionKind =
  'node-advance' | 'decision' | 'feedback' | 'contract' | 'retirement';

export type ExperienceSurface =
  'node-advance' | 'event-choice' | 'event-feedback' | 'contract' | 'retirement';

export interface ExperienceTraceEntry {
  kind: ExperienceInteractionKind;
  requiredText: string;
  surface?: ExperienceSurface;
}

export interface ExperienceSummary {
  actionCount: number;
  decisionCount: number;
  nodeAdvanceCount: number;
  requiredCharacters: number;
}

export type ExperienceLength = 'short' | 'long';

export interface ExperiencePath {
  careerSeasons: number;
  trace: readonly ExperienceTraceEntry[];
}

export interface ExperienceSurfaceSummary {
  surface: ExperienceSurface;
  actionCount: number;
  requiredCharacters: number;
}

export interface ExperienceBudgetGroup {
  sampleCount: number;
  actionCountMedian: number;
  actionCountP90: number;
  decisionCountMedian: number;
  decisionCountP90: number;
  nodeAdvanceCountMedian: number;
  nodeAdvanceCountP90: number;
  requiredCharactersMedian: number;
  requiredCharactersP90: number;
  heaviestSurface: ExperienceSurface | null;
  surfaceBurden: ExperienceSurfaceSummary[];
}

export interface ExperienceBudgetReport {
  sampleCount: number;
  lengthGroups: Record<ExperienceLength, ExperienceBudgetGroup>;
}

export const summarizeExperience = (trace: readonly ExperienceTraceEntry[]): ExperienceSummary => ({
  actionCount: trace.length,
  decisionCount: trace.filter(({ kind }) => kind === 'decision').length,
  nodeAdvanceCount: trace.filter(({ kind }) => kind === 'node-advance').length,
  requiredCharacters: trace.reduce(
    (total, { requiredText }) => total + Array.from(requiredText).length,
    0,
  ),
});

export const classifyExperienceLength = (careerSeasons: number): ExperienceLength =>
  careerSeasons <= 4 ? 'short' : 'long';

export const summarizeExperienceBatch = (
  paths: readonly ExperiencePath[],
): ExperienceBudgetReport => {
  const groups: Record<ExperienceLength, ExperiencePath[]> = { short: [], long: [] };
  for (const path of paths) groups[classifyExperienceLength(path.careerSeasons)].push(path);

  return {
    sampleCount: paths.length,
    lengthGroups: {
      short: summarizeGroup(groups.short),
      long: summarizeGroup(groups.long),
    },
  };
};

const summarizeGroup = (paths: readonly ExperiencePath[]): ExperienceBudgetGroup => {
  const summaries = paths.map(({ trace }) => summarizeExperience(trace));
  const surfaceBurden = summarizeSurfaces(paths.flatMap(({ trace }) => trace));
  return {
    sampleCount: paths.length,
    actionCountMedian: percentile(
      summaries.map(({ actionCount }) => actionCount),
      0.5,
    ),
    actionCountP90: percentile(
      summaries.map(({ actionCount }) => actionCount),
      0.9,
    ),
    decisionCountMedian: percentile(
      summaries.map(({ decisionCount }) => decisionCount),
      0.5,
    ),
    decisionCountP90: percentile(
      summaries.map(({ decisionCount }) => decisionCount),
      0.9,
    ),
    nodeAdvanceCountMedian: percentile(
      summaries.map(({ nodeAdvanceCount }) => nodeAdvanceCount),
      0.5,
    ),
    nodeAdvanceCountP90: percentile(
      summaries.map(({ nodeAdvanceCount }) => nodeAdvanceCount),
      0.9,
    ),
    requiredCharactersMedian: percentile(
      summaries.map(({ requiredCharacters }) => requiredCharacters),
      0.5,
    ),
    requiredCharactersP90: percentile(
      summaries.map(({ requiredCharacters }) => requiredCharacters),
      0.9,
    ),
    heaviestSurface: surfaceBurden[0]?.surface ?? null,
    surfaceBurden,
  };
};

const summarizeSurfaces = (trace: readonly ExperienceTraceEntry[]): ExperienceSurfaceSummary[] => {
  const totals = new Map<ExperienceSurface, ExperienceSurfaceSummary>();
  for (const entry of trace) {
    const surface = entry.surface ?? defaultSurface(entry.kind);
    const current = totals.get(surface) ?? {
      surface,
      actionCount: 0,
      requiredCharacters: 0,
    };
    current.actionCount += 1;
    current.requiredCharacters += Array.from(entry.requiredText).length;
    totals.set(surface, current);
  }
  return [...totals.values()].sort(
    (left, right) =>
      right.requiredCharacters - left.requiredCharacters || right.actionCount - left.actionCount,
  );
};

const defaultSurface = (kind: ExperienceInteractionKind): ExperienceSurface => {
  if (kind === 'decision') return 'event-choice';
  if (kind === 'feedback') return 'event-feedback';
  return kind;
};

const percentile = (values: readonly number[], fraction: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))]!;
};
