import { buildCareerSummaryPrompt, buildMilestonePrompt } from '@football/contracts';
import type { NarrativeProvider } from './types';

export interface OpenAiCompatibleProviderConfig {
  /** OpenAI 兼容根地址（如 http://127.0.0.1:11434/v1），末尾斜杠可有可无。 */
  endpoint: string;
  model: string;
  apiKey?: string | undefined;
}

const NARRATIVE_SYSTEM_PROMPT = [
  '你是足球生涯模拟器的叙事润色助手。',
  '你只能润色用户提供的中文文案，使其更有现场感和人物语气。',
  '禁止添加新的人物、比赛、荣誉、数字、日期或地点；禁止改变事实、因果与语气指向。',
  'participantResponses 的 personId 与人物对应关系必须原样保留，不得增删。',
  '只输出一个 JSON 对象，字段为：{"response": string, "participantResponses": [{"personId": string, "text": string}], "followUp": string}，不要输出任何其他文字。',
].join('\n');

const SUMMARY_SYSTEM_PROMPT = [
  '你是足球生涯模拟器的总结助手。',
  '你只能根据用户提供的结构化事实包组织中文总结，禁止添加不存在的荣誉、国家队经历、人物、数字、日期或比赛结果。',
  '只输出一个 JSON 对象，字段为：{"summary": string}，不要输出任何其他文字。',
].join('\n');

const MILESTONE_SYSTEM_PROMPT = [
  '你是足球生涯模拟器的关键节点评价助手。',
  '你只能根据输入事实包写 150-250 字中文“为什么这是你的故事”，禁止添加不存在的荣誉、数字、比赛、人物、日期、伤病因果或转会金额。',
  '荣誉、关键生涯数据和独特比赛数据只能引用输入中明确提供的项目；没有提供的事实必须保持空白。',
  '只输出一个 JSON 对象，字段为：{"narrative": string}，不要输出任何其他文字。',
].join('\n');

export const createOpenAiCompatibleProvider = (
  config: OpenAiCompatibleProviderConfig,
): NarrativeProvider => {
  const base = config.endpoint.endsWith('/') ? config.endpoint : config.endpoint + '/';
  const url = new URL('chat/completions', base);
  return {
    generate: async (request) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0,
          stream: false,
          messages: [
            {
              role: 'system',
              content:
                request.kind === 'career-summary'
                  ? SUMMARY_SYSTEM_PROMPT
                  : request.kind === 'milestone'
                    ? MILESTONE_SYSTEM_PROMPT
                    : NARRATIVE_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content:
                request.kind === 'milestone'
                  ? buildMilestonePrompt(request.input)
                  : request.kind === 'career-summary'
                    ? buildCareerSummaryPrompt(request.facts, request.mode)
                    : JSON.stringify(request),
            },
          ],
        }),
      });
      if (!response.ok) throw new Error(`provider HTTP ${response.status}`);
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.length === 0) {
        throw new Error('provider 响应缺少内容');
      }
      return parseAssistantContent(content);
    },
  };
};

const parseAssistantContent = (content: string): unknown => {
  const stripped = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  if (!stripped) return null;
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(stripped.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

export interface OpenAiCompatibleEnvConfig extends OpenAiCompatibleProviderConfig {
  timeoutMs?: number | undefined;
}

/** 从环境变量读取 provider 配置；缺少端点或模型时视为未配置（返回 null）。 */
export const openAiCompatibleConfigFromEnv = (
  env: Record<string, string | undefined>,
): OpenAiCompatibleEnvConfig | null => {
  const endpoint = env.FOOTBALL_AI_ENDPOINT?.trim();
  const model = env.FOOTBALL_AI_MODEL?.trim();
  if (!endpoint || !model) return null;
  const timeoutRaw = env.FOOTBALL_AI_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutRaw ? Number(timeoutRaw) : undefined;
  const apiKey = env.FOOTBALL_AI_API_KEY?.trim();
  return {
    endpoint,
    model,
    apiKey: apiKey ? apiKey : undefined,
    timeoutMs: timeoutMs !== undefined && Number.isFinite(timeoutMs) ? timeoutMs : undefined,
  };
};
