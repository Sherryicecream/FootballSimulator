# 国家队大赛窗口实施计划（M11 模块 2）

> **For agentic workers:** TDD。设计以 `docs/superpowers/specs/2026-09-06-national-tournaments-design.md` 为准。

**目标：** 已入选国家队的球员在亚洲杯/世界杯 summers 经历抽象大赛；caps/goals/荣誉/声望/账本一体化；存档兼容、确定性保持。

## 工作包 1：契约 + simulation

1. `packages/contracts/tests`：SeasonHonourSchema 接受 `asian-cup-champion`、`world-cup-champion`、`world-cup-runner-up`（先红）。
2. `packages/simulation/tests/career/national-tournament.test.ts` 先红：资格门槛、非大赛年、确定性、结构合法、种子搜索可夺冠。
3. 实现 `career/national-tournament.ts`（`isTournamentYear`、`simulateSummerTournament`），导出自 index。

## 工作包 2：application + review

1. `packages/application/tests`（pro-flow）先红：大赛年结算出现大赛账本事实、caps 增长、当季荣誉含大赛 kind；非大赛年不变。
2. `completeProfessionalSeason` 接入；`career-review.ts` 荣誉权重与传奇计数纳入大赛 kind。

## 工作包 3：门禁与文档

1. 全量门禁 + `pnpm balance:youth -- --runs 1000`（世界级 1–5%、国家队 15–30% 等断言保持）。
2. 更新 `docs/ROADMAP.md`；完成后归档本计划。
