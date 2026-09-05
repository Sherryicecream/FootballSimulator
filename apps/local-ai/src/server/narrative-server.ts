import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { NarrativePolishRequestSchema, type NarrativePolishRequest } from '@football/contracts';
import type { NarrativeAdapterResult } from '../providers/types';
import { getLocalNarrativeHealth } from './health';

export interface NarrativeServerAdapter {
  polish: (request: NarrativePolishRequest) => Promise<NarrativeAdapterResult>;
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
    let parsedRequest: NarrativePolishRequest;
    try {
      parsedRequest = NarrativePolishRequestSchema.parse(JSON.parse(body));
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
    const result = await options.adapter.polish(parsedRequest);
    // 只缓存 provider 成功结果：回退可能由暂时性故障造成，缓存会延长错误文案的寿命。
    if (result.source === 'provider') {
      cache.set(key, result);
      if (cache.size > cacheLimit) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
    }
    respondJson(response, 200, result);
  };

  return server;
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
