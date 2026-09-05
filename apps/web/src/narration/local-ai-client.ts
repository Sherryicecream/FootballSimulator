import {
  NarrativePolishOutputSchema,
  type NarrativePolishOutput,
  type NarrativePolishRequest,
} from '@football/contracts';

export interface LocalNarrativeClient {
  polish: (request: NarrativePolishRequest) => Promise<NarrativePolishOutput | null>;
}

export interface LocalNarrativeClientOptions {
  endpoint: string;
  timeoutMs?: number | undefined;
  fetchImpl?: typeof fetch | undefined;
}

const DEFAULT_TIMEOUT_MS = 1500;

/** 本地叙事服务客户端：任何失败都静默返回 null，由调用方保持作者原文。 */
export const createLocalNarrativeClient = (
  options: LocalNarrativeClientOptions,
): LocalNarrativeClient => {
  const doFetch = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const endpoint = options.endpoint.endsWith('/')
    ? options.endpoint.slice(0, -1)
    : options.endpoint;
  return {
    polish: async (request) => {
      try {
        // jsdom 等测试环境可能缺少 AbortSignal.timeout；缺失时退化为无超时请求。
        const signal =
          typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
            ? AbortSignal.timeout(timeoutMs)
            : undefined;
        const response = await doFetch(`${endpoint}/v1/narrative-polish`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
          ...(signal ? { signal } : {}),
        });
        if (!response.ok) return null;
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
