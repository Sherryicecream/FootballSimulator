import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
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
} from '../validation/narrative';
import type { NarrativeAdapterResult } from '../providers/types';
import { getLocalNarrativeHealth } from './health';

export interface NarrativeServerAdapter {
  polish: (request: NarrativePolishRequest) => Promise<NarrativeAdapterResult>;
  summarize?: (request: CareerSummaryRequest) => Promise<NarrativeAdapterResult>;
  narrateMilestone?: (request: MilestoneNarrationRequest) => Promise<NarrativeAdapterResult>;
}

export interface NarrativeServerOptions {
  adapter: NarrativeServerAdapter;
  provider?: { configured: boolean; model: string | null } | undefined;
  cacheLimit?: number | undefined;
  requestByteLimit?: number | undefined;
}

const DEFAULT_CACHE_LIMIT = 500;
const DEFAULT_REQUEST_BYTE_LIMIT = 64 * 1024;

/** 本地叙事 HTTP 服务：缓存按事件实例内容与 prompt 版本（canonical JSON 摘要）生效。 */
export const createNarrativeServer = (options: NarrativeServerOptions): Server => {
  const cache = new Map<string, NarrativeAdapterResult>();
  const cacheLimit = options.cacheLimit ?? DEFAULT_CACHE_LIMIT;
  const byteLimit = options.requestByteLimit ?? DEFAULT_REQUEST_BYTE_LIMIT;

  const server = createServer((request, response) => {
    void handle(request, response).catch(() => {
      if (!response.headersSent) response.statusCode = 500;
      response.end(JSON.stringify({ error: 'internal-error' }));
    });
  });

  const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const url = request.url ?? '';
    if (request.method === 'GET' && (url === '/health' || url === '/health/')) {
      respondJson(response, 200, {
        ...getLocalNarrativeHealth(),
        provider: {
          configured: options.provider?.configured ?? false,
          model: options.provider?.model ?? null,
        },
      });
      return;
    }
    if (request.method !== 'POST' || url !== '/v1/narrative-polish') {
      respondJson(response, 405, { error: 'method-not-allowed' });
      return;
    }
    const body = await readBody(request, byteLimit);
    if (body === null) {
      respondJson(response, 413, { error: 'request-too-large' });
      return;
    }
    let parsedRequest: NarrativePolishRequest | CareerSummaryRequest | MilestoneNarrationRequest;
    try {
      const raw = JSON.parse(body);
      parsedRequest =
        raw?.kind === 'career-summary'
          ? CareerSummaryRequestSchema.parse(raw)
          : raw?.kind === 'milestone'
            ? MilestoneNarrationRequestSchema.parse(raw)
            : NarrativePolishRequestSchema.parse(raw);
    } catch {
      respondJson(response, 400, { error: 'invalid-request' });
      return;
    }
    const key = createHash('sha256').update(canonicalStringify(parsedRequest)).digest('hex');
    const cached = cache.get(key);
    if (cached) {
      respondJson(response, 200, cached);
      return;
    }
    const result =
      parsedRequest.kind === 'career-summary'
        ? options.adapter.summarize
          ? await options.adapter.summarize(parsedRequest)
          : {
              source: 'fallback' as const,
              reason: 'disabled' as const,
              draft: {
                summary:
                  '本地生涯总结服务未启用，页面将继续使用本地确定性总结，不会改变任何存档事实。'.repeat(
                    4,
                  ),
              },
            }
        : parsedRequest.kind === 'milestone'
          ? options.adapter.narrateMilestone
            ? await options.adapter.narrateMilestone(parsedRequest)
            : {
                source: 'fallback' as const,
                reason: 'disabled' as const,
                draft: fallbackMilestoneNarration(parsedRequest),
              }
          : await options.adapter.polish(parsedRequest);
    const safeResult = validateAdapterResult(parsedRequest, result);
    // 只缓存通过服务端 schema/事实校验的 provider 结果。
    if (safeResult.source === 'provider') {
      cache.set(key, safeResult);
      if (cache.size > cacheLimit) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
    }
    respondJson(response, 200, safeResult);
  };

  return server;
};

const validateAdapterResult = (
  request: NarrativePolishRequest | CareerSummaryRequest | MilestoneNarrationRequest,
  result: NarrativeAdapterResult,
): NarrativeAdapterResult => {
  if (result.source !== 'provider') return result;
  try {
    if (request.kind === 'career-summary') {
      const output = CareerSummaryOutputSchema.parse(result.draft);
      return {
        source: 'provider',
        reason: 'provider',
        draft: validateCareerSummaryOutput(request, output),
      };
    }
    if (request.kind === 'milestone') {
      const output = MilestoneNarrationOutputSchema.parse(result.draft);
      return {
        source: 'provider',
        reason: 'provider',
        draft: validateMilestoneNarrationOutput(request, output),
      };
    }
    const output = NarrativePolishOutputSchema.parse(result.draft);
    return {
      source: 'provider',
      reason: 'provider',
      draft: validateNarrativePolishOutput(request, output),
    };
  } catch (error) {
    const reason = error instanceof UnsafeNarrativeOutputError ? 'unsafe-output' : 'invalid-output';
    if (request.kind === 'career-summary') {
      return { source: 'fallback', reason, draft: fallbackCareerSummary(request) };
    }
    if (request.kind === 'milestone') {
      return { source: 'fallback', reason, draft: fallbackMilestoneNarration(request) };
    }
    return { source: 'fallback', reason, draft: fallbackNarrativeDraft(request) };
  }
};

const respondJson = (response: ServerResponse, status: number, payload: unknown): void => {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const readBody = (request: IncomingMessage, byteLimit: number): Promise<string | null> =>
  new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    request.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > byteLimit) {
        resolve(null);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    request.on('error', () => resolve(null));
  });

const canonicalStringify = (value: unknown): string => {
  if (Array.isArray(value)) return '[' + value.map(canonicalStringify).join(',') + ']';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return (
      '{' + entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalStringify(v)}`).join(',') + '}'
    );
  }
  return JSON.stringify(value) ?? 'null';
};
