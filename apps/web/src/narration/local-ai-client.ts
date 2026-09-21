import {
  buildCareerSummaryRequest,
  buildMilestoneNarrationRequest,
  CareerSummaryOutputSchema,
  MilestoneNarrationOutputSchema,
  type CareerSummaryFacts,
  type CareerSummaryMode,
  type CareerSummaryOutput,
  type MilestoneInput,
  type MilestoneNarrationRequest,
  type MilestoneNarrationOutput,
  NarrativePolishOutputSchema,
  type NarrativePolishOutput,
  type NarrativePolishRequest,
  type CareerSummaryRequest,
} from '@football/contracts';
import { detectFactualContradiction } from '@football/application';

export interface LocalNarrativeClient {
  polish: (request: NarrativePolishRequest) => Promise<NarrativePolishOutput | null>;
  summarize: (request: CareerSummaryRequest) => Promise<CareerSummaryOutput | null>;
  narrateMilestone?: (
    request: MilestoneNarrationRequest,
  ) => Promise<MilestoneNarrationOutput | null>;
}

export interface LocalNarrativeClientOptions {
  endpoint: string;
  timeoutMs?: number | undefined;
  fetchImpl?: typeof fetch | undefined;
}

const DEFAULT_TIMEOUT_MS = 5000;

export const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<Response | null> => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(
      () => {
        controller?.abort();
        resolve(null);
      },
      Math.max(1, timeoutMs),
    );
  });
  try {
    const request = fetchImpl(url, {
      ...options,
      ...(controller ? { signal: controller.signal } : {}),
    });
    return await Promise.race([request, timeout]);
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

const canonicalStringify = (value: unknown): string => {
  if (Array.isArray(value)) return '[' + value.map(canonicalStringify).join(',') + ']';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return (
      '{' +
      entries.map(([key, item]) => JSON.stringify(key) + ':' + canonicalStringify(item)).join(',') +
      '}'
    );
  }
  return JSON.stringify(value) ?? 'null';
};

const sha256 = async (value: string): Promise<string> => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof TextEncoder === 'undefined') throw new Error('web-crypto-unavailable');
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const createCareerSummaryRequest = async (
  facts: CareerSummaryFacts,
  mode: CareerSummaryMode,
): Promise<CareerSummaryRequest> =>
  buildCareerSummaryRequest({
    facts,
    mode,
    canonicalFactsHash: await sha256(canonicalStringify(facts)),
  });

export const createMilestoneNarrationRequest = async (
  input: MilestoneInput,
): Promise<MilestoneNarrationRequest> =>
  buildMilestoneNarrationRequest({
    input,
    canonicalFactsHash: await sha256(canonicalStringify(input)),
  });

/** 本地叙事服务客户端：任何失败都静默返回 null，由调用方保持作者原文。 */
export const createLocalNarrativeClient = (
  options: LocalNarrativeClientOptions,
): LocalNarrativeClient => {
  const doFetch = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const endpoint = options.endpoint.endsWith('/')
    ? options.endpoint.slice(0, -1)
    : options.endpoint;
  const summaryCache = new Map<string, Promise<CareerSummaryOutput | null>>();
  const milestoneCache = new Map<string, Promise<MilestoneNarrationOutput | null>>();
  const summarize = (request: CareerSummaryRequest): Promise<CareerSummaryOutput | null> => {
    const cacheKey = request.canonicalFactsHash + ':' + request.mode;
    const cached = summaryCache.get(cacheKey);
    if (cached) return cached;
    const task = (async () => {
      try {
        const response = await fetchWithTimeout(
          endpoint + '/v1/narrative-polish',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(request),
          },
          timeoutMs,
          doFetch,
        );
        if (!response?.ok) return null;
        const payload = (await response.json()) as { source?: string; draft?: unknown };
        if (payload.source !== 'provider' || !payload.draft) return null;
        const parsed = CareerSummaryOutputSchema.safeParse(payload.draft);
        if (!parsed.success) return null;
        if (request.mode === 'short' && parsed.data.summary.length > 250) return null;
        if (request.mode === 'long' && parsed.data.summary.length < 400) return null;
        if (detectFactualContradiction(parsed.data.summary, request.facts).length > 0) return null;
        return parsed.data;
      } catch {
        return null;
      }
    })().then((result) => {
      if (result === null) summaryCache.delete(cacheKey);
      return result;
    });
    summaryCache.set(cacheKey, task);
    return task;
  };
  const narrateMilestone = (
    request: MilestoneNarrationRequest,
  ): Promise<MilestoneNarrationOutput | null> => {
    const cacheKey = request.kind + ':' + request.promptVersion + ':' + request.canonicalFactsHash;
    const cached = milestoneCache.get(cacheKey);
    if (cached) return cached;
    const task = (async () => {
      try {
        const response = await fetchWithTimeout(
          endpoint + '/v1/narrative-polish',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(request),
          },
          timeoutMs,
          doFetch,
        );
        if (!response?.ok) return null;
        const payload = (await response.json()) as { source?: string; draft?: unknown };
        if (payload.source !== 'provider' || !payload.draft) return null;
        const parsed = MilestoneNarrationOutputSchema.safeParse(payload.draft);
        if (
          parsed.success &&
          detectFactualContradiction(parsed.data.narrative, request.input).length > 0
        ) {
          return null;
        }
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    })().then((result) => {
      if (result === null) milestoneCache.delete(cacheKey);
      return result;
    });
    milestoneCache.set(cacheKey, task);
    return task;
  };
  return {
    polish: async (request) => {
      try {
        const response = await fetchWithTimeout(
          endpoint + '/v1/narrative-polish',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(request),
          },
          timeoutMs,
          doFetch,
        );
        if (!response?.ok) return null;
        const payload = (await response.json()) as {
          source?: string;
          draft?: unknown;
        };
        if (payload.source !== 'provider' || !payload.draft) return null;
        const parsed = NarrativePolishOutputSchema.safeParse(payload.draft);
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
    summarize,
    narrateMilestone,
  };
};

/** 从构建期环境变量创建客户端；未配置端点时返回 null（零请求、零行为差异）。 */
export const createLocalNarrativeClientFromEnv = (
  env: Record<string, string | undefined>,
  fetchImpl?: typeof fetch,
): LocalNarrativeClient | null => {
  const endpoint = env.VITE_LOCAL_AI_ENDPOINT?.trim();
  if (!endpoint) return null;
  return createLocalNarrativeClient({ endpoint, ...(fetchImpl ? { fetchImpl } : {}) });
};
