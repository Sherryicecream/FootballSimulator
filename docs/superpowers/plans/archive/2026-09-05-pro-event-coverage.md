# 职业期事件覆盖扩展实施计划（M10 模块 6）

> **For agentic workers:** 按工作包顺序推进，每个工作包遵守 TDD（先写失败回归测试）。设计机制以 `docs/superpowers/specs/2026-09-05-pro-event-coverage-design.md` 为准。

**目标：** 把 `asia-career`、`europe-career`、`national-team` 三个空分类从 0 到有补齐（17 个作者化事件 + 4 家日韩海外俱乐部），让留洋与国家队阶段的职业月份拥有专属事件内容；青训期行为、月度边界、随机序列语义与存档 schema 保持不变。

## 全局约束

- 新机制全部为可选增量：既有事件、既有存档、青训期推进的行为与结果不变。
- 阶段机、比赛公式、要约公式不改动；`simulation` 不新增外部依赖。
- 事件文本通过内容校验（无替换符、无真实品牌、回应角色已声明）。
- 效果幅度保持小（±1~3），不得引入新的效果键。

## 工作包 1：契约层

1. 在 `packages/contracts/tests/event.test.ts` 先写失败用例：`EventConditionSchema` 接受 `requireOverseas`、`overseasRegions`、`requireNationalTeam`、`minCaps`；`requireFactType` 接受 `'pro-match'`。
2. 在 `packages/contracts/tests/club.test.ts` 先写失败用例：`ClubProfileSchema` 接受可选 `overseasRegion: 'europe' | 'asia'`。
3. 修改 `packages/contracts/src/event.ts`、`packages/contracts/src/clubs.ts` 使测试通过。

## 工作包 2：模拟层

1. 在 `packages/simulation/tests/events/youth-event-selector.test.ts` 先写失败用例：
   - `requireOverseas`：`overseasSince` 非空才合格。
   - `overseasRegions: ['asia']`：仅当 context 提供亚洲海外俱乐部时合格；欧洲俱乐部/无 context 不合格。
   - `requireNationalTeam` / `minCaps`：按 `nationalTeam.capped` / `caps` 评估。
   - 既有事件（如 `misunderstanding-clarification`）在新过滤路径下资格不变。
2. 修改 `packages/simulation/src/events/event-selector.ts`（过滤逻辑与输入类型）与 `packages/simulation/src/career/event-integration.ts`（`pickYouthEventForWeek` 可选 context 参数）使测试通过。

## 工作包 3：内容层

1. 在 `packages/content/tests/events/youth-events.test.ts` 先写失败用例：`asia-career`、`europe-career`、`national-team` 三分类各有事件；新事件通过 `validateYouthContent`；新增日韩俱乐部在 `overseasClubs` 中且带 `overseasRegion: 'asia'`。
2. `packages/content/src/clubs.ts`：新增 4 家日韩俱乐部（层级 6–8、`overseasRegion: 'asia'`），既有海外俱乐部补标 `'europe'`。
3. 新建 `packages/content/src/events/asia-career-events.ts`、`europe-career-events.ts`、`national-team-events.ts`，共 17 个事件（6/6/5），其中 6 个带三档 authored resolution；在 `youth-events.ts` 合并入事件池。
4. 内容校验与测试通过。

## 工作包 4：应用层

1. 在 `packages/application/tests` 先写失败用例：构造留洋亚洲俱乐部的职业存档，`advanceProMonth` 在若干种子下能命中 `asia-career` 事件（等待决策）；同一存档不命中 `europe-career` 事件。
2. 修改 `advanceProMonth`：以 `activeLoan.loanClubId ?? contract.clubId` 找到当前俱乐部，作为 `pickYouthEventForWeek` 的 context 传入。
3. 青训月度推进与既有测试保持不变。

## 工作包 5：门禁与文档

1. `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e` 全绿。
2. `pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/youth-balance-m10-pro-event-coverage.json`：完成率 100%、每月最多 2 决策、重伤率 ≤1%、毕业率/承诺兑现率相对基线（60.9% / 96.72%）偏移可解释。
3. 更新 `docs/ROADMAP.md` 模块状态；保留本计划为唯一活动计划，完成后归档。
