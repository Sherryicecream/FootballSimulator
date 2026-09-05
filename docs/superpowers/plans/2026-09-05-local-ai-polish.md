# 受控 AI 润色层实施计划（M10 模块 7）

> **For agentic workers:** 按工作包顺序推进，TDD。设计以 `docs/superpowers/specs/2026-09-05-local-ai-polish-design.md` 为准。

**目标：** local-ai 具备真实 OpenAI 兼容 provider 与 HTTP 服务（缓存 + 健康 + 严格回退），web 具备可选叙事客户端（显示层润色、静默回退）；AI 关闭/故障时游戏行为与现状完全一致。零新增 npm 依赖。

## 工作包 1：Provider

1. `apps/local-ai/tests/openai-compatible-provider.test.ts` 先红：
   - 构造 stub 上游 HTTP 服务，验证成功 JSON、```json 围栏、HTTP 500、非 JSON 内容分别得到合法输出 / provider-error / provider-error。
   - 超时用例映射为 timeout（经安全适配器）。
2. `apps/local-ai/src/providers/openai-compatible.ts`：`createOpenAiCompatibleProvider`，system prompt 版本化，`temperature: 0`，错误全抛。

## 工作包 2：HTTP 服务

1. `apps/local-ai/tests/narrative-server.test.ts` 先红：
   - `createNarrativeServer` 监听端口 0；`GET /health` 返回服务/prompt/provider 信息；`POST /v1/narrative-polish` 返回适配器结果；同一请求第二次命中缓存（上游 stub 计数不变）；坏 JSON 400、错误方法 405、超限 413。
2. `apps/local-ai/src/server/narrative-server.ts` + `main.ts`；`package.json` 增加 `start` 脚本（register-loader + `FOOTBALL_AI_PORT`）。

## 工作包 3：Web 客户端与接线

1. `apps/web/tests/narration/local-ai-client.test.tsx` 先红：成功/非 2xx/超时/schema 失败分别返回草稿/null；未配置端点时不产生请求。
2. `apps/web/src/narration/local-ai-client.ts`；`EventFeedbackPanel` 接线：显示层替换、personId 映射、失败静默回退；`VITE_LOCAL_AI_ENDPOINT` 未设置时零请求、行为不变。

## 工作包 4：门禁与文档

1. `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e` 全绿。
2. `pnpm balance:youth -- --runs 1000` 确认完成率 100% 与决策边界不变（本模块不改模拟规则）。
3. 更新 `docs/ROADMAP.md`；完成后归档本计划。
