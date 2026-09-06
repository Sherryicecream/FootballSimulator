# 海外联赛区域分组实施计划（M11 模块 1）

> **For agentic workers:** TDD。设计以 `docs/superpowers/specs/2026-09-06-overseas-region-leagues-design.md` 为准。

**目标：** 留洋联赛按 europe/asia 分组；补齐亚洲俱乐部内容使层级 4–8 可成军；存档 schema 与比赛公式不变。

## 工作包 1：内容

1. `packages/content/tests`（youth-content 或 clubs）先补失败用例：亚洲俱乐部按"同层 ±1 层补足 ≥4 队"规则覆盖层级 4–8。
2. `packages/content/src/clubs.ts` 新增 8 家亚洲俱乐部（层级 8×2、7×1、6×1、5×2、4×2），全部 `overseasRegion: 'asia'`。

## 工作包 2：应用层

1. `packages/application/tests/use-cases/pro-flow.test.ts` 先补失败用例：亚洲俱乐部开赛 → 联赛俱乐部全部 `overseasRegion === 'asia'`；欧洲俱乐部 → 全部 `europe`；`competitionId` 为 `pro-overseas-{region}-tier-N`。
2. `pro-flow.ts` 的 `eligibleClubs` 过滤加区域一致条件；`competitionId` 细化。

## 工作包 3：门禁与文档

1. `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e` 全绿。
2. `pnpm balance:youth -- --runs 1000`：世界级 1–5%、国家队 15–30%、完成率 100% 等既有断言全部保持。
3. 更新 `docs/ROADMAP.md`；完成后归档本计划。
