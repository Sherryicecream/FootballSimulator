# 受控 AI 润色层接入设计（M10 模块 7）

> 状态：按 ROADMAP 声明的下一步边界执行。
>
> 日期：2026-09-05
>
> 长期产品基准：`spec.md` §17 AI 叙事。
>
> 前置：M9 模块 4 已交付最小叙事事实包、版本化 prompt、严格输出 schema、安全适配器与确定性回退；边界为"真实模型 provider 尚未接入"。

## 1. 目标

把 `apps/local-ai` 从"仅有确定性 mock 的适配器库"补全为可运行、可关闭的本地叙事服务：真实 OpenAI 兼容 provider、HTTP 服务、按事件实例与提示版本的缓存，以及 web 端可选客户端；AI 不可用时整个游戏行为与今天完全一致（作者原文直接展示）。

## 2. 边界

- AI 只润色 `NarrativePolishRequest` 允许的文本字段；不新增比赛、人物、数字事实（既有 `validateNarrativePolishOutput` 强制）。
- 密钥与端点只存在于本地服务配置/环境变量，不进入网页代码与生涯存档。
- 不引入任何新 npm 依赖：HTTP 用 `node:http`，请求用全局 `fetch`，缓存用内存 Map。
- 离线或未配置时：web 不发起请求、不显示任何 AI 状态噪音。

## 3. 设计

### 3.1 Provider（OpenAI 兼容）

- `createOpenAiCompatibleProvider(config)` 实现 `NarrativeProvider`：
  - `POST {endpoint}/chat/completions`，`model`、`messages`（system = 版本化润色指令 + 严格 JSON 输出要求；user = 请求 JSON）、`temperature: 0`、`stream: false`。
  - 响应解析：取 `choices[0].message.content`，剥离 ```json 围栏后 `JSON.parse`，交给既有安全适配器做 schema 校验与内容安全校验。
  - 网络/HTTP/解析错误全部抛出，由安全适配器映射为 `provider-error` / `timeout` / `invalid-output` 回退。
- 配置：`FOOTBALL_AI_ENDPOINT`、`FOOTBALL_AI_MODEL`、`FOOTBALL_AI_API_KEY`（可选）、`FOOTBALL_AI_TIMEOUT_MS`（服务端默认 8000，远超适配器默认，因本地推理更慢）；缺配置 → provider 为 `disabled`。

### 3.2 HTTP 服务（node:http）

- `createNarrativeServer({ adapter, cache })` 返回 `http.Server`：
  - `GET /health` → 服务名、prompt 版本、provider 是否配置、模型名。
  - `POST /v1/narrative-polish` → 请求体走 `NarrativePolishRequestSchema`；命中缓存直接返回；未命中经安全适配器后缓存并返回 `{ source, reason?, draft }`。
  - 非法 JSON/方法 → 400/405；请求体超限 → 413；任何处理错误不崩进程。
- 缓存：canonical 请求 JSON 的 SHA-256 为键（覆盖事件实例内容 + prompt 版本），内存 Map 上限 500 条 FIFO。
- `startNarrativeServer({ port })`：读取 `FOOTBALL_AI_PORT`（默认 8787），监听本地回环；`package.json` 增加 `start` 脚本，复用 `tools/balance/register-loader.mjs` 运行 TypeScript。

### 3.3 Web 客户端（可选、显示层）

- `apps/web/src/narration/local-ai-client.ts`：`createLocalNarrativeClient({ endpoint, fetchImpl?, timeoutMs })`；`polish(request)` 成功返回 provider 草稿，任何网络/超时/非 2xx/schema 失败返回 `null`。
- 接线：`EventFeedbackPanel` 渲染事件反馈时，若客户端已配置则对当前反馈文案发起润色请求，provider 草稿仅在**显示层**替换文本（personId 对齐的 participantResponses 映射），不写入存档、不参与机械判定；未配置或失败时保持现状。
- 端点来自构建期 `VITE_LOCAL_AI_ENDPOINT`；未设置时不创建客户端、零请求。

## 4. 测试与验收

- local-ai：provider 映射用例（成功/围栏 JSON/HTTP 500/超时）；服务集成用例（端口 0 启动、真实回环请求、缓存第二次不再触达上游 stub、坏请求 400/405）；健康端点。
- web：客户端成功/失败/超时返回 null；面板接线在无客户端时行为不变。
- 既有门禁全绿；本模块不改模拟规则，无需新的平衡验收（运行一次 1,000 季确认完成率 100% 与决策边界不变即可）。

## 5. 工作包

1. 契约无改动；provider（TDD）。
2. HTTP 服务 + 缓存 + 健康（TDD）。
3. web 客户端与面板接线（TDD）。
4. 门禁、ROADMAP、文档收尾。
