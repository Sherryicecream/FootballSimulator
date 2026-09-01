import {
  NarrativePolishOutputSchema,
  NarrativePolishRequestSchema,
  type NarrativePolishRequest,
} from '@football/contracts';
import { buildNarrativePolishRequest } from './prompts/narrative-polish';
import {
  fallbackNarrativeDraft,
  UnsafeNarrativeOutputError,
  validateNarrativePolishOutput,
} from './validation/narrative';
import type {
  NarrativeAdapterResult,
  NarrativeFallbackReason,
  NarrativeProvider,
} from './providers/types';

const DEFAULT_TIMEOUT_MS = 800;
const TIMEOUT = Symbol('narrative-provider-timeout');

export interface NarrativeAdapterOptions {
  timeoutMs?: number;
}

export const createSafeNarrativeAdapter = (
  provider?: NarrativeProvider,
  options: NarrativeAdapterOptions = {},
): { polish: (request: NarrativePolishRequest) => Promise<NarrativeAdapterResult> } => {
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

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

export { buildNarrativePolishRequest, NARRATIVE_PROMPT_VERSION } from './prompts/narrative-polish';
export { createDeterministicMockProvider } from './providers/mock';
export { getLocalNarrativeHealth } from './server/health';
export type {
  NarrativeAdapterResult,
  NarrativeFallbackReason,
  NarrativeProvider,
} from './providers/types';
