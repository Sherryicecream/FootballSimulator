# Training Feedback Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints. Every behavior change starts with a failing regression test.

**Goal:** 将现有训练计划、月度健康/成长结算和比赛事实组织成可解释、可保存、可回看的训练反馈闭环，并统一青年与职业阶段的训练展示。

**Architecture:** 在 contracts 中增加结构化训练周事实、月报训练反馈和最近月报字段；simulation 的唯一周模拟入口写入实际训练/总负荷，并提供纯确定性的反馈构建器；application 在青年/职业月度结算时组装并保存月报，web 只渲染保存的数据。训练公式、比赛结果、伤病概率和随机序列保持不变。

**Tech Stack:** TypeScript monorepo、Zod、Vitest、React、Playwright、pnpm、现有确定性随机源与设计系统。

## Global Constraints

- `spec.md` 是长期产品基准，`docs/ROADMAP.md` 是唯一进度入口；本模块设计基线为 `docs/superpowers/specs/2026-09-03-training-feedback-loop-design.md`。
- 浏览器继续使用 v3 月度职业流程，不重新引入玩家侧周推进或快进动作。
- `packages/simulation` 必须保持确定性且无外部运行时依赖；内容和种子显式传入。
- `packages/application` 拥有月度结算、暂停/恢复和最近月报持久化；UI 不复制训练、健康、比赛或成长规则。
- 新字段必须使用严格 schema，并为旧 v1–v5 存档提供兼容默认值；缺失历史训练证据时不得猜测。
- 不修改 `careerPhase`、`monthlyAdvance` 的转移规则、比赛结果、健康模型和随机序列推进方式。
- 月报显示的是实际结算结果；训练与比赛的联系使用谨慎、可验证的表达，不宣称单一因素造成比赛结果。
- 专业阶段继续遵守 v4/v5 现有存档与 `proSeason` 赛季状态约束，联赛和杯赛事实按现有过滤规则读取。

---

### Task 1: Extend training and monthly-report contracts

**Files:**
- Modify: `packages/contracts/src/youth-season.ts`
- Modify: `packages/contracts/src/save-migration.ts`
- Test: `packages/contracts/tests/youth-season-v2.test.ts`
- Test: `packages/contracts/tests/save-migration.test.ts`

**Interfaces:**
- Produces `TrainingFocusSchema`, `TrainingIntensitySchema`, `TrainingWeekContextSchema`, `TrainingFeedbackSchema`, and `MonthlyReportSchema.trainingFeedback`.
- Produces a nullable `lastMonthlyReport` field on the shared career save schema so v3/v4/v5 saves inherit the same compatible field.

- [ ] **Step 1: Write failing schema tests**

Add tests that assert a valid training week context and feedback parse, reject unknown keys, and allow an old monthly report/save without the new optional fields. Assert a migrated historical save receives `lastMonthlyReport: null`.

- [ ] **Step 2: Run the focused contract tests**

Run: `pnpm test:unit -- packages/contracts/tests/youth-season-v2.test.ts packages/contracts/tests/save-migration.test.ts`

Expected: FAIL because the new schemas and save field do not exist.

- [ ] **Step 3: Implement the minimum contracts**

Extract reusable focus/intensity enums from `TrainingPlanSchema`. Add strict `TrainingWeekContextSchema` with `focus`, `intensity`, `trainingLoad` (`0..100`) and `totalLoad` (`0..150`). Add strict `TrainingFeedbackSchema` containing the plan, completed weeks, training/total load aggregates, fitness/fatigue before-after-delta objects, attribute changes, health status/details, match appearance/minute/rating summary, a bounded semantic match status, conclusion, and next-step text. Make `MonthlyReportSchema.trainingFeedback` optional and add `lastMonthlyReport: MonthlyReportSchema.nullable().default(null)` to the shared v2 save schema. Keep old reports and saves valid.

- [ ] **Step 4: Run the focused contract tests again**

Run: `pnpm test:unit -- packages/contracts/tests/youth-season-v2.test.ts packages/contracts/tests/save-migration.test.ts`

Expected: PASS, including strict-object rejection and old-save migration cases.

- [ ] **Step 5: Commit the contract checkpoint**

Run: `git add packages/contracts/src/youth-season.ts packages/contracts/src/save-migration.ts packages/contracts/tests/youth-season-v2.test.ts packages/contracts/tests/save-migration.test.ts && git commit -m "feat: add training feedback contracts"`

### Task 2: Record structured weekly training evidence

**Files:**
- Modify: `packages/simulation/src/career/simulate-youth-week.ts`
- Modify: `packages/simulation/src/career/professional-week.ts`
- Test: `packages/simulation/tests/career/simulate-youth-week.test.ts`
- Test: `packages/application/tests/use-cases/pro-flow.test.ts`

**Interfaces:**
- Consumes the new `TrainingWeekContext` contract.
- Produces `trainingContext` on every new `training` ledger fact. `trainingLoad` is the training contribution; `totalLoad` is the existing health-settlement load for that week.

- [ ] **Step 1: Write failing simulation/application assertions**

Extend the existing youth-week test to assert the training fact includes the current plan, the calculated training contribution, and the exact total load used by health. Extend an existing professional-week/pro-flow case to assert the same shape for a league/cup week without changing match facts.

- [ ] **Step 2: Run the focused tests**

Run: `pnpm test:unit -- packages/simulation/tests/career/simulate-youth-week.test.ts packages/application/tests/use-cases/pro-flow.test.ts`

Expected: FAIL because training facts currently only contain summary text.

- [ ] **Step 3: Add structured context without changing formulas**

Keep the existing `load` calculations byte-for-byte in behavior. Pass the base training contribution and computed total load into the fact factory, then add `trainingContext` while retaining the existing human-readable summary for legacy presentation.

- [ ] **Step 4: Run the focused tests again**

Run: `pnpm test:unit -- packages/simulation/tests/career/simulate-youth-week.test.ts packages/application/tests/use-cases/pro-flow.test.ts`

Expected: PASS and deterministic repeated transitions remain equal.

- [ ] **Step 5: Commit the evidence checkpoint**

Run: `git add packages/simulation/src/career/simulate-youth-week.ts packages/simulation/src/career/professional-week.ts packages/simulation/tests/career/simulate-youth-week.test.ts packages/application/tests/use-cases/pro-flow.test.ts && git commit -m "feat: record structured weekly training evidence"`

### Task 3: Build deterministic training feedback

**Files:**
- Create: `packages/simulation/src/career/training-feedback.ts`
- Modify: `packages/simulation/src/index.ts`
- Test: `packages/simulation/tests/career/training-feedback.test.ts`

**Interfaces:**
- Produces `buildTrainingFeedback(input): TrainingFeedback | null`.
- `input` contains `plan`, month `facts`, `startHealth`, `endHealth`, and settled `attributeChanges`.

- [ ] **Step 1: Write failing pure-function tests**

Cover: a month with four structured training facts and positive matches; a fatigue-limited month; an active/recovered injury month; no appearances; and a legacy fact list with no `trainingContext`. Assert exact load aggregates, state deltas, match aggregates, semantic status, and that identical input returns deep-equal output.

- [ ] **Step 2: Run the focused simulation test**

Run: `pnpm test:unit -- packages/simulation/tests/career/training-feedback.test.ts`

Expected: FAIL because `buildTrainingFeedback` is not exported.

- [ ] **Step 3: Implement the pure feedback builder**

Filter `training`/`pro-match` facts by their structured contexts. Sum `trainingLoad` and `totalLoad`, calculate average training load, derive before/after health deltas from the supplied states, and aggregate only match contexts actually present. Mark legacy/no-context input as `null`. Determine semantic status using saved facts and thresholds only: no appearance, injury-limited, fatigue-limited, positive when average rating is at least `7`, otherwise steady. Generate bounded Chinese conclusion/next-step strings from these semantic facts; do not call randomness or inspect hidden player fields.

- [ ] **Step 4: Run the focused simulation test again**

Run: `pnpm test:unit -- packages/simulation/tests/career/training-feedback.test.ts`

Expected: PASS, including deterministic output and no mutation of input arrays.

- [ ] **Step 5: Commit the feedback builder checkpoint**

Run: `git add packages/simulation/src/career/training-feedback.ts packages/simulation/src/index.ts packages/simulation/tests/career/training-feedback.test.ts && git commit -m "feat: build deterministic training feedback"`

### Task 4: Attach feedback to youth and professional month reports

**Files:**
- Modify: `packages/application/src/use-cases/advance-career-month.ts`
- Modify: `packages/application/src/use-cases/pro-flow.ts`
- Modify: `packages/application/src/use-cases/start-next-season.ts`
- Modify: `packages/application/src/use-cases/start-professional-season.ts` or the existing professional season start use case file
- Modify: `packages/application/src/use-cases/complete-youth-season.ts` only if schema normalization requires it
- Test: `packages/application/tests/use-cases/advance-career-month-v2.test.ts`
- Test: `packages/application/tests/use-cases/pro-flow.test.ts`
- Test: `packages/application/tests/use-cases/youth-offseason.test.ts`

**Interfaces:**
- Consumes `buildTrainingFeedback`, current month facts, the pre-month health snapshot, and settled attribute changes.
- Produces `report.trainingFeedback` and `save.lastMonthlyReport` for both youth and professional monthly completion paths.

- [ ] **Step 1: Write failing monthly-flow tests**

Assert youth and professional month outcomes contain training feedback with the expected actual loads and match totals. Assert interrupted month resume does not duplicate training facts or feedback. Assert `lastMonthlyReport` equals the returned report and starting a new season resets it to `null`.

- [ ] **Step 2: Run the focused application tests**

Run: `pnpm test:unit -- packages/application/tests/use-cases/advance-career-month-v2.test.ts packages/application/tests/use-cases/pro-flow.test.ts packages/application/tests/use-cases/youth-offseason.test.ts`

Expected: FAIL because month reports and saves do not carry training feedback.

- [ ] **Step 3: Assemble reports at the application boundary**

Capture the pre-month health before the weekly loop. After settlement, call the pure builder with report facts and final health. Set `lastMonthlyReport` in the returned save at the same moment the report becomes ready. Preserve it through event pauses, season completion and professional offseason; clear it only when a new season starts. Do not recalculate any simulation rule in the use case.

- [ ] **Step 4: Run focused application tests again**

Run: `pnpm test:unit -- packages/application/tests/use-cases/advance-career-month-v2.test.ts packages/application/tests/use-cases/pro-flow.test.ts packages/application/tests/use-cases/youth-offseason.test.ts`

Expected: PASS with no duplicate ledger IDs and unchanged existing match/health assertions.

- [ ] **Step 5: Commit the application checkpoint**

Run: `git add packages/application/src packages/application/tests/use-cases/advance-career-month-v2.test.ts packages/application/tests/use-cases/pro-flow.test.ts packages/application/tests/use-cases/youth-offseason.test.ts && git commit -m "feat: persist monthly training feedback"`

### Task 5: Restore and render the feedback in the web dashboard

**Files:**
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/career-dashboard/CareerDashboard.tsx`
- Create: `apps/web/src/career-dashboard/TrainingFeedbackPanel.tsx`
- Modify: `apps/web/src/app/app.css`
- Delete: `apps/web/src/career-dashboard/TrainingSettings.tsx` only after reference/test audit confirms it is unused
- Test: `apps/web/tests/career-dashboard/CareerDashboard.test.tsx`
- Test: `apps/web/tests/career-dashboard/CareerDashboardVisuals.test.tsx`
- Create or modify: `apps/web/tests/career-dashboard/TrainingFeedbackPanel.test.tsx`

**Interfaces:**
- Consumes `MonthlyReport.trainingFeedback` and `save.lastMonthlyReport` only.
- Produces a single training-plan control in `CareerDashboard` and a presentation-only `TrainingFeedbackPanel` with accessible semantic icons and text/value labels.

- [ ] **Step 1: Write failing component tests**

Add a fixture with training feedback and assert the panel renders plan, load, attribute changes, fitness/fatigue deltas, health status, and match connection. Assert a missing feedback field keeps the old monthly report visible without an empty or crashing panel. Assert the dashboard exposes only one interactive training focus/intensity control pair.

- [ ] **Step 2: Run the focused web tests**

Run: `pnpm test:unit -- apps/web/tests/career-dashboard/CareerDashboard.test.tsx apps/web/tests/career-dashboard/CareerDashboardVisuals.test.tsx apps/web/tests/career-dashboard/TrainingFeedbackPanel.test.tsx`

Expected: FAIL because the panel and restore wiring do not exist.

- [ ] **Step 3: Implement presentation-only feedback UI**

Create a focused panel that maps semantic enums to Chinese labels and uses existing CSS variables/classes. Render numeric values alongside every load bar and state delta; use color plus text/icon semantics; do not calculate totals, thresholds, or causal claims in React. Keep the existing monthly momentum, story, and matchday panels below/alongside it. Remove the unused duplicate `TrainingSettings` component only if the reference audit remains empty.

- [ ] **Step 4: Restore the latest report on load**

When `loadCareer` returns a valid save, initialize the page report from `restored.lastMonthlyReport` while preserving existing phase routing. When a new season starts, accept the application-cleared value and clear the in-memory report as today. Keep current report state synchronized with the saved report after monthly completion.

- [ ] **Step 5: Run focused web tests again**

Run: `pnpm test:unit -- apps/web/tests/career-dashboard/CareerDashboard.test.tsx apps/web/tests/career-dashboard/CareerDashboardVisuals.test.tsx apps/web/tests/career-dashboard/TrainingFeedbackPanel.test.tsx`

Expected: PASS on desktop/mobile render assertions, legacy report fallback, and single-control checks.

- [ ] **Step 6: Commit the web checkpoint**

Run: `git add apps/web/src apps/web/tests/career-dashboard && git commit -m "feat: show training feedback in monthly dashboard"`

### Task 6: Verify the end-to-end monthly loop

**Files:**
- Modify: `apps/web/tests/e2e/youth-season.spec.ts`
- Modify: `docs/ROADMAP.md`
- Create: `artifacts/youth-balance-m10-training-feedback.json` generated by the balance command

**Interfaces:**
- Consumes the saved report contract and current monthly browser flow.
- Produces a checked-in balance artifact and a roadmap entry documenting the completed module and unchanged simulation baseline.

- [ ] **Step 1: Write the failing E2E assertions**

Extend the existing monthly youth flow to reach a report, verify “训练回顾” plus load/state/match values, reload the page, and verify the same month report remains visible. Change the plan, advance another month, and verify the displayed focus/intensity reflects the new month’s actual structured facts.

- [ ] **Step 2: Run the focused E2E test**

Run: `pnpm test:e2e -- apps/web/tests/e2e/youth-season.spec.ts`

Expected: FAIL until persistence and the panel are wired.

- [ ] **Step 3: Fix only integration defects found by E2E**

Keep the browser on monthly actions; do not add weekly selectors or fast-forward controls. Ensure the local save slot is written before reload assertions.

- [ ] **Step 4: Run the focused E2E test again**

Run: `pnpm test:e2e -- apps/web/tests/e2e/youth-season.spec.ts`

Expected: PASS on the existing desktop and mobile projects.

- [ ] **Step 5: Run the complete required gates**

Run in order: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test:e2e`, then `pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/youth-balance-m10-training-feedback.json`.

Expected: all commands pass; balance completion remains `100%`, and match/decision/injury/graduation/contract metrics stay within an explainable range of `artifacts/youth-balance-m10-transfer-loan.json`.

- [ ] **Step 6: Update the roadmap after evidence exists**

Append the module completion, exact gate counts, balance artifact path, and an explicit note that simulation outcomes/random sequence were unchanged. Do not edit `spec.md` for a presentation/report-only extension unless an actual long-term product rule changed.

- [ ] **Step 7: Commit the verified module checkpoint**

Run: `git add apps/web/tests/e2e/youth-season.spec.ts docs/ROADMAP.md artifacts/youth-balance-m10-training-feedback.json && git commit -m "feat: complete training feedback loop"`
