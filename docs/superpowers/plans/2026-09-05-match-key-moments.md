# 重要比赛交互关键时刻实施计划（M10 模块 8）

> **For agentic workers:** 按工作包推进，TDD。设计以 `docs/superpowers/specs/2026-09-05-match-key-moments-design.md` 为准。

**目标：** 重要比赛（职业国内杯 1/4 决赛起、对手强度 ≥80 的联赛；青训对手强度 ≥75）在球员出场后产生一个位置专属交互关键时刻；复用事件系统打断、提交与反馈；不改比赛结果公式与随机序列语义。

## 工作包 1：simulation（`career/match-moment.ts`）

1. `packages/simulation/tests/career/match-moment.test.ts` 先红：
   - `isImportantMatchContext(context, competitionId?)`：职业杯 1/4 起为真；联赛 `opponentStrength >= 80` 为真；青训门槛 `>= 75`；未出场为假。
   - `createMatchMoment(save, matchFact)`：按位置返回 3 个意图选项（含完整三档 resolution），`storyId: 'match-moment'`，携带比分与胜负语气一致的文案基线；非重要/未出场返回 null。
   - `shouldCreateMatchMoment(save, weekFacts)`：本周有重要比赛、球员出场、无既有关键时刻账本/待决。
2. 实现注册表与判定，导出自 `src/index.ts`。

## 工作包 2：application

1. `packages/application/tests/use-cases/match-moment.test.ts` 先红：
   - 构造重要比赛周（直接注入账本事实或高强对手赛程），`advanceCareerMonth`/`advanceProMonth` 返回 `awaiting-decision` 且 `event.storyId === 'match-moment'`。
   - 提交选择后：反馈持久化、状态效果生效、账本新增时刻事实；同种子完全一致。
   - 普通比赛周不打断；重入不重复生成。
2. 青训与职业月度推进循环加入生成检查（事件抽取之前）。

## 工作包 3：web

1. `apps/web/tests/event-choice/MatchMomentScene.test.tsx` 先红：`storyId === 'match-moment'` 的待决事件与反馈使用 `match` 场景条与文案标识。
2. `EventChoicePanel`/`EventFeedbackPanel` 按需覆盖 sceneKind。

## 工作包 4：门禁与文档

1. `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e` 全绿。
2. `pnpm balance:youth -- --runs 1000` 对比模块 6 基线（完成率 100%、毕业率 60.9%、承诺兑现率 97.37%）。
3. 更新 `docs/ROADMAP.md`；完成后归档本计划。
