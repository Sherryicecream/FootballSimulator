import {
  CareerSummaryOutputSchema,
  CareerSummaryRequestSchema,
  MilestoneNarrationOutputSchema,
  MilestoneNarrationRequestSchema,
  NarrativePolishOutputSchema,
  NarrativePolishRequestSchema,
  type CareerSummaryRequest,
  type MilestoneNarrationRequest,
  type NarrativePolishRequest,
} from '@football/contracts';
import {
  fallbackCareerSummary,
  fallbackMilestoneNarration,
  fallbackNarrativeDraft,
  UnsafeNarrativeOutputError,
  validateCareerSummaryOutput,
  validateMilestoneNarrationOutput,
  validateNarrativePolishOutput,
} from './validation/narrative';
import type {
  NarrativeAdapterResult,
  NarrativeFallbackReason,
  NarrativeMilestoneAdapterResult,
  NarrativeProvider,
  NarrativeSummaryAdapterResult,
} from './providers/types';

const DEFAULT_TIMEOUT_MS = 800;
const TIMEOUT = Symbol('narrative-provider-timeout');

export interface NarrativeAdapterOptions {
  timeoutMs?: number;
}

export const createSafeNarrativeAdapter = (
  provider?: NarrativeProvider,
  options: NarrativeAdapterOptions = {},
): {
  polish: (request: NarrativePolishRequest) => Promise<NarrativeAdapterResult>;
  summarize: (request: CareerSummaryRequest) => Promise<NarrativeSummaryAdapterResult>;
  narrateMilestone: (
    request: MilestoneNarrationRequest,
  ) => Promise<NarrativeMilestoneAdapterResult>;
} => {
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const summarize = async (
    request: CareerSummaryRequest,
  ): Promise<NarrativeSummaryAdapterResult> => {
    const safeRequest = CareerSummaryRequestSchema.parse(request);
    if (!provider) return summaryFallbackResult(safeRequest, 'disabled');

    let candidate: unknown;
    try {
      candidate = await withTimeout(() => provider.generate(safeRequest), timeoutMs);
    } catch (error) {
      return summaryFallbackResult(safeRequest, error === TIMEOUT ? 'timeout' : 'provider-error');
    }

    const parsed = CareerSummaryOutputSchema.safeParse(candidate);
    if (!parsed.success) return summaryFallbackResult(safeRequest, 'invalid-output');
    try {
      return {
        source: 'provider',
        reason: 'provider',
        draft: validateCareerSummaryOutput(safeRequest, parsed.data),
      };
    } catch (error) {
      if (error instanceof UnsafeNarrativeOutputError) {
        return summaryFallbackResult(safeRequest, 'unsafe-output');
      }
      return summaryFallbackResult(safeRequest, 'invalid-output');
    }
  };

  const narrateMilestone = async (
    request: MilestoneNarrationRequest,
  ): Promise<NarrativeMilestoneAdapterResult> => {
    const safeRequest = MilestoneNarrationRequestSchema.parse(request);
    if (!provider) return milestoneFallbackResult(safeRequest, 'disabled');

    let candidate: unknown;
    try {
      candidate = await withTimeout(() => provider.generate(safeRequest), timeoutMs);
    } catch (error) {
      return milestoneFallbackResult(safeRequest, error === TIMEOUT ? 'timeout' : 'provider-error');
    }

    const parsed = MilestoneNarrationOutputSchema.safeParse(candidate);
    if (!parsed.success) return milestoneFallbackResult(safeRequest, 'invalid-output');
    try {
      return {
        source: 'provider',
        reason: 'provider',
        draft: validateMilestoneNarrationOutput(safeRequest, parsed.data),
      };
    } catch (error) {
      if (error instanceof UnsafeNarrativeOutputError) {
        return milestoneFallbackResult(safeRequest, 'unsafe-output');
      }
      return milestoneFallbackResult(safeRequest, 'invalid-output');
    }
  };

  return {
    polish: async (request) => {
      const safeRequest = NarrativePolishRequestSchema.parse(request);
      if (!provider) return fallbackResult(safeRequest, 'disabled');

      let candidate: unknown;
      try {
        candidate = await withTimeout(() => provider.generate(safeRequest), timeoutMs);
      } catch (error) {
        return fallbackResult(safeRequest, error === TIMEOUT ? 'timeout' : 'provider-error');
      }

      const parsed = NarrativePolishOutputSchema.safeParse(candidate);
      if (!parsed.success) return fallbackResult(safeRequest, 'invalid-output');
      try {
        return {
          source: 'provider',
          reason: 'provider',
          draft: validateNarrativePolishOutput(safeRequest, parsed.data),
        };
      } catch (error) {
        if (error instanceof UnsafeNarrativeOutputError) {
          return fallbackResult(safeRequest, 'unsafe-output');
        }
        return fallbackResult(safeRequest, 'invalid-output');
      }
    },
    summarize,
    narrateMilestone,
  };
};

const fallbackResult = (
  request: NarrativePolishRequest,
  reason: NarrativeFallbackReason,
): NarrativeAdapterResult => ({
  source: 'fallback',
  reason,
  draft: fallbackNarrativeDraft(request),
});

const summaryFallbackResult = (
  request: CareerSummaryRequest,
  reason: NarrativeFallbackReason,
): NarrativeSummaryAdapterResult => ({
  source: 'fallback',
  reason,
  draft: fallbackCareerSummary(request),
});

const milestoneFallbackResult = (
  request: MilestoneNarrationRequest,
  reason: NarrativeFallbackReason,
): NarrativeMilestoneAdapterResult => ({
  source: 'fallback',
  reason,
  draft: fallbackMilestoneNarration(request),
});

const withTimeout = async <T>(task: () => Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => reject(TIMEOUT), timeoutMs);
      void Promise.resolve().then(task).then(resolve, reject);
    });
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

export {
  buildCareerSummaryRequest,
  buildMilestoneNarrationRequest,
  buildNarrativePolishRequest,
  CAREER_SUMMARY_PROMPT_VERSION,
  NARRATIVE_PROMPT_VERSION,
} from '@football/contracts';
export { createDeterministicMockProvider } from './providers/mock';
export { getLocalNarrativeHealth } from './server/health';
export type {
  NarrativeAdapterResult,
  NarrativeFallbackReason,
  NarrativeMilestoneAdapterResult,
  NarrativeProvider,
} from './providers/types';
