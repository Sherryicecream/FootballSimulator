# Dynamic Event Responses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints. Every behavior change starts with a failing regression test.

**Goal:** 将高频青训事件从统一的“现场结果”反馈升级为可解释的“结果标题 → 结果类型 → 场景叙述 → 人物回应 → 变化记录 → 后续影响”闭环，并让成功、部分成功、失败三种能力判定在保存后仍能稳定回放。

**Architecture:** packages/simulation 继续由 resolveChoiceOutcome 唯一负责能力判定，由 buildEventFeedback 唯一组装结果展示数据；packages/application 仅负责写入现有 pending feedback、处理旧存档缺失字段并保持暂停/恢复语义；apps/web 只渲染保存后的 EventFeedback，不读取隐藏能力、不重算结果。首批内容复用现有确定性判定，不新增随机源、周推进或独立判定规则。

**Tech Stack:** TypeScript monorepo、Zod、Vitest、React、Playwright、pnpm、现有确定性随机源与设计系统。

## Global Constraints

- spec.md 是长期产品基准；本模块设计基线为 docs/superpowers/specs/2026-09-04-dynamic-event-responses-design.md；docs/ROADMAP.md 是唯一进度入口。
- 浏览器继续使用 v3 月度流程，不添加周推进、快进或新的玩家侧时间操作。
- packages/simulation 必须保持确定性且无外部运行时依赖；内容和种子显式传入，反馈构建不得推进 randomState。
- packages/application 拥有事件结算、保存、暂停、恢复和读档兼容；UI 不复制能力判定、效果应用、关系变化或后续事件条件。
- 新生成的结构化反馈必须写入 resultTitle 和 resultTone；两个字段在契约中保持可选，以兼容旧 pending feedback、旧月报和历史存档。
- 不改写现有选择判定公式、效果应用、比赛/健康模型、故事记忆、冷却、阶段机或随机序列推进方式。内容升级使用现有 ChoiceResolution 入口。
- 结果文案只能解释已结算的结果；没有量化变化时必须明确写成“影响尚未显现”一类事实，不伪造状态变化。
- 真实 AI provider 不在本模块范围内；未来 AI 只能作为已验证作者文案的可选润色层，不能参与判定或生成数值事实。

---

### Task 1: Extend result presentation contracts and strict content validation

**Files:**
- Modify: packages/contracts/src/event.ts
- Modify: packages/contracts/src/youth-season.ts
- Modify: packages/content/src/validation/validate-content.ts
- Test: packages/contracts/tests/event.test.ts
- Test: packages/contracts/tests/event-narrative-variants.test.ts
- Test: packages/contracts/tests/youth-season-v2.test.ts
- Test: packages/content/tests/events/choice-resolution-validation.test.ts

**Interfaces:**
- Produce EventFeedbackResultToneSchema and EventFeedbackResultTone with success, partial, failure, and neutral.
- Add optional resultTitle to EventChoiceNarrativeVariantSchema and EventChoiceSchema, with a bounded human-readable title length.
- Add optional resultTitle and resultTone to strict EventFeedbackSchema; old saves without either field remain valid.
- Validate new result titles and authored response/follow-up text for replacement characters, validate participant response roles against event.participantRoles, and enforce complete three-outcome copy for the ten selected events while leaving non-selected legacy events compatible.

- [ ] **Step 1: Write failing contract and validator tests**

Add schema cases that parse a variant with resultTitle, a choice-level resultTitle, and feedback with each allowed tone; reject an unknown tone and an unknown strict-object field. Add a legacy feedback fixture without the two fields and assert it still parses. Extend content validation tests with a selected event missing an outcome response/follow-up and a response using a role not declared by the event; both must fail with event/choice identifiers. Add a positive assertion that the current content bundle passes.

- [ ] **Step 2: Run the focused tests and confirm the red baseline**

Run:

~~~text
pnpm test:unit -- packages/contracts/tests/event.test.ts packages/contracts/tests/event-narrative-variants.test.ts packages/contracts/tests/youth-season-v2.test.ts packages/content/tests/events/choice-resolution-validation.test.ts
~~~

Expected result: FAIL because the new fields and selected-event validation rules do not exist.

- [ ] **Step 3: Implement the minimum contracts and validator rules**

Export one tone enum without creating duplicate unions. Add optional result title fields with finite lengths and keep strict-object behavior. In validateEvents, apply the complete-copy requirement only to the explicit ten-event allowlist from the design spec; require resolution.outcomes.success, partial, and failure to each contain label, response, and followUp. Check every authored responses[].speakerRole against the event’s declared participantRoles. Include resultTitle, choice-level response/follow-up, outcome response/follow-up, and outcome participant text in the replacement-character scan. Preserve existing next-event reference and effect-key validation.

- [ ] **Step 4: Run the focused tests again**

Run the same pnpm test:unit command. Expected result: PASS for strict parsing, legacy compatibility, validator negative cases, and the current content bundle.

- [ ] **Step 5: Commit the contract checkpoint**

Run:

~~~text
git add packages/contracts/src/event.ts packages/contracts/src/youth-season.ts packages/content/src/validation/validate-content.ts packages/contracts/tests/event.test.ts packages/contracts/tests/event-narrative-variants.test.ts packages/contracts/tests/youth-season-v2.test.ts packages/content/tests/events/choice-resolution-validation.test.ts
git commit -m "feat: add dynamic event result contracts"
~~~

### Task 2: Build deterministic result titles, tones, and branch-specific feedback

**Files:**
- Modify: packages/simulation/src/events/event-feedback.ts
- Test: packages/simulation/tests/events/narrative-variants.test.ts
- Test: packages/simulation/tests/events/choice-resolution.test.ts
- Test: packages/application/tests/use-cases/choice-outcome-resolution.test.ts

**Interfaces:**
- Keep buildEventFeedback(before, after, event, choice, outcome?) as the only feedback assembly entry point.
- Derive resultTitle and resultTone from the saved outcome and selected authored narrative without adding a simulation rule.
- Select outcome-level narrative variants when the resolved outcome contains them, otherwise select choice-level variants; persist the selected index exactly as today.

- [ ] **Step 1: Write failing deterministic feedback tests**

Extend narrative-variant tests with resultTitle and assert the selected variant title is stable. Add simulation/application cases for success, partial, failure, and legacy paths: structured outcomes persist their authored title with variant title before outcome label; tone matches the resolved outcome; a choice-level title works for a legacy choice; and the final fallback is a neutral compatibility title rather than “现场结果”. Assert participant responses and follow-up come from the same outcome branch, repeated calls are deep-equal, and neither input save random state changes.

- [ ] **Step 2: Run the focused tests and confirm the red baseline**

Run:

~~~text
pnpm test:unit -- packages/simulation/tests/events/narrative-variants.test.ts packages/simulation/tests/events/choice-resolution.test.ts packages/application/tests/use-cases/choice-outcome-resolution.test.ts
~~~

Expected result: FAIL because result presentation fields and outcome-level variant selection are not implemented.

- [ ] **Step 3: Implement presentation derivation without changing settlement rules**

In event-feedback.ts, choose narrative data from outcome.narrativeVariants ?? choice.narrativeVariants and use one selected group for response, participant responses, follow-up, and optional resultTitle. Derive the title in the approved order: selected variant resultTitle, resolved outcome summary label, choice resultTitle, then the fixed neutral compatibility title “事件暂告一段落”. Derive tone from outcome.outcome for structured outcomes and neutral for legacy paths. Always emit both fields from new feedback while retaining current response/follow-up/default-participant fallbacks. Do not change resolveChoiceOutcome, effects, score thresholds, hash seed, or random cursor behavior.

- [ ] **Step 4: Run the focused tests again**

Run the same focused command. Expected result: PASS, including distinct success/partial/failure titles or copy, deterministic variant selection, legacy fallback, and unchanged randomness.

- [ ] **Step 5: Commit the simulation checkpoint**

Run:

~~~text
git add packages/simulation/src/events/event-feedback.ts packages/simulation/tests/events/narrative-variants.test.ts packages/simulation/tests/events/choice-resolution.test.ts packages/application/tests/use-cases/choice-outcome-resolution.test.ts
git commit -m "feat: build dynamic event result feedback"
~~~

### Task 3: Author the first ten event result branches

**Files:**
- Modify: packages/content/src/events/youth-events.ts
- Modify: packages/content/src/events/one-off-events.ts
- Modify: packages/content/src/events/story-events.ts
- Test: packages/content/tests/events/choice-resolution.test.ts
- Test: packages/content/tests/events/choice-resolution-validation.test.ts

**Interfaces:**
- Upgrade these exact events: misunderstanding-clarification, misunderstanding-repair, costly-match-mistake, technical-plateau, recovery-session-warning, return-to-full-training, position-race-opening, position-race-review, coach-trust-opening, and coach-trust-test.
- Every choice in these events has resolution.outcomes.success, partial, and failure; each branch has a distinct label, scene-specific response, relevant declared-person responses, and followUp.
- Reuse the existing static choice effect as the partial-success baseline where that keeps balance understandable; success and failure make only narrow authored deviations using already allowed effect keys. No outcome adds hidden story state or new event conditions.

- [ ] **Step 1: Write failing content coverage tests**

Create an explicit ten-event coverage table and assert every choice has all three outcome fields, three distinct labels, non-empty branch response/follow-up text, and participant roles limited to the event declaration. Assert existing story links remain and recovery-session-warning remains automatic with one choice. Add a fixture-level test that different seeded/current-ability inputs can expose different branch summaries without changing event IDs or next-event links.

- [ ] **Step 2: Run the focused content tests and confirm the red baseline**

Run:

~~~text
pnpm test:unit -- packages/content/tests/events/choice-resolution.test.ts packages/content/tests/events/choice-resolution-validation.test.ts
~~~

Expected result: FAIL because the other selected events are incomplete.

- [ ] **Step 3: Author complete, realistic branch copy and conservative effects**

Add resolutions using the existing ability vocabulary and difficulty range. Use communication/decision attributes for misunderstanding and coach-trust scenes, composure/decision for match-error review, determination and relevant technical attributes for the plateau, fitness/stamina for recovery and return-to-training, and off-the-ball/decision/determination for position competition. Ground each result in its location: training branches mention the next drill or observation, match branches mention video or the next match, relationship branches mention trust/respect or the next interaction, and health branches mention load progression or recurrence risk. For automatic recovery, author the neutral single-choice branch for ledger/future presentation even though the current application does not pause the player. Keep all next-event IDs, story IDs, cooldowns, and participant declarations unchanged.

- [ ] **Step 4: Run the focused content tests again**

Run the same focused command. Expected result: PASS for validator coverage, branch completeness, role safety, story-link preservation, and ability-dependent branch selection.

- [ ] **Step 5: Commit the content checkpoint**

Run:

~~~text
git add packages/content/src/events/youth-events.ts packages/content/src/events/one-off-events.ts packages/content/src/events/story-events.ts packages/content/tests/events/choice-resolution.test.ts packages/content/tests/events/choice-resolution-validation.test.ts
git commit -m "content: author dynamic youth event outcomes"
~~~

### Task 4: Preserve result presentation through application hydration and save/reload

**Files:**
- Modify: packages/application/src/use-cases/create-youth-career-v2.ts
- Test: packages/application/tests/use-cases/choice-outcome-resolution.test.ts
- Test: packages/application/tests/use-cases/youth-career-headless-flow.test.ts
- Test: packages/contracts/tests/save-migration.test.ts

**Interfaces:**
- Newly resolved events persist resultTitle and resultTone inside story.pendingFeedback through the existing resolveCareerEvent path.
- Old pending events are hydrated with newly authored choice-level resultTitle before resolution; old pending feedback is not re-resolved or retroactively assigned a guessed result.
- v3/v4/v5 save parsing and createYouthCareerV2 continue to accept pending feedback without either new field.

- [ ] **Step 1: Write failing persistence and compatibility tests**

Extend the application outcome test to assert all three structured tones and titles survive resolveCareerEvent. Add a hydration fixture where a pending event predates the authored choice title and assert the choice gains only that presentation field before submission. Add a legacy pending feedback fixture without resultTitle/resultTone, parse and restore it through save migration, and assert no outcome/effect is invented. Assert resolving the same pending event after save/reload does not duplicate ledger or relationship effects.

- [ ] **Step 2: Run the focused application/contract tests and confirm the red baseline**

Run:

~~~text
pnpm test:unit -- packages/application/tests/use-cases/choice-outcome-resolution.test.ts packages/application/tests/use-cases/youth-career-headless-flow.test.ts packages/contracts/tests/save-migration.test.ts
~~~

Expected result: FAIL for the new persisted fields and pending-event hydration assertion.

- [ ] **Step 3: Wire only the existing hydration boundary**

In hydratePendingEvent, merge authored.resultTitle into the corresponding choice with the existing response, follow-up, narrative variant, and next-event fields. Keep hydratePendingFeedback conservative: preserve saved response, result title, tone, outcome, and changes; retain only its existing safe choice-text/legacy-copy hydration behavior. Do not add a second resolveChoiceOutcome call and do not mutate careerPhase, monthlyAdvance, or ledger entries outside the current use case.

- [ ] **Step 4: Run the focused tests again**

Run the same focused command. Expected result: PASS for persistence, reload, no duplicate effects, and old-save compatibility.

- [ ] **Step 5: Commit the application checkpoint**

Run:

~~~text
git add packages/application/src/use-cases/create-youth-career-v2.ts packages/application/tests/use-cases/choice-outcome-resolution.test.ts packages/application/tests/use-cases/youth-career-headless-flow.test.ts packages/contracts/tests/save-migration.test.ts
git commit -m "feat: preserve event results across saves"
~~~

### Task 5: Render result title and tone as an accessible feedback card

**Files:**
- Modify: apps/web/src/event-choice/EventFeedbackPanel.tsx
- Modify: apps/web/src/app/app.css
- Test: apps/web/tests/event-choice/EventFeedbackPanel.test.tsx
- Test: apps/web/tests/event-choice/EventOutcomeFeedback.test.tsx
- Test: apps/web/tests/e2e/youth-season.spec.ts

**Interfaces:**
- Consume only EventFeedback.resultTitle, EventFeedback.resultTone, and already persisted response/outcome/change fields.
- Show a concrete result title and visible result-type text for success, partial, failure, and neutral compatibility feedback; never use “现场结果” as the main result heading for new feedback.
- Use text labels and tone classes together so color is supplementary, and keep desktop/mobile layout within the existing no-horizontal-overflow contract.

- [ ] **Step 1: Write failing component and browser assertions**

Add component fixtures for success, partial, failure, neutral, and legacy feedback. Assert concrete title, Chinese result-type label, response, dialogue, changes, and follow-up are visible; assert tone classes; assert a legacy object without the new fields shows a non-empty compatibility title and does not crash. Update the E2E feedback helper to assert the result card and result-type text instead of the literal “现场结果”, and cover at least two result types with deterministic fixtures or a controlled route.

- [ ] **Step 2: Run the focused web tests and confirm the red baseline**

Run:

~~~text
pnpm test:unit -- apps/web/tests/event-choice/EventFeedbackPanel.test.tsx apps/web/tests/event-choice/EventOutcomeFeedback.test.tsx
~~~

Expected result: FAIL because the panel still renders the fixed “现场结果” kicker and has no result-tone presentation.

- [ ] **Step 3: Implement presentation-only result rendering**

Add a presentation map for success, partial, failure, and neutral labels. Resolve missing fields only through compatibility fallback: resultTitle, then persisted outcome.label, then 事件暂告一段落; resultTone, then persisted outcome.outcome, then neutral. Render result type, title, and response in the result card, apply a semantic modifier class, and retain the existing outcome explanation card, dialogue, change records, next-event clues, and continue action. Add CSS for four modifiers using existing variables/contrast, with no behavior logic or numeric calculations in React.

- [ ] **Step 4: Run focused web tests and the targeted E2E again**

Run:

~~~text
pnpm test:unit -- apps/web/tests/event-choice/EventFeedbackPanel.test.tsx apps/web/tests/event-choice/EventOutcomeFeedback.test.tsx
pnpm test:e2e -- apps/web/tests/e2e/youth-season.spec.ts
~~~

Expected result: PASS on desktop/mobile feedback rendering, legacy fallback, concrete result titles, and no horizontal overflow.

- [ ] **Step 5: Commit the web checkpoint**

Run:

~~~text
git add apps/web/src/event-choice/EventFeedbackPanel.tsx apps/web/src/app/app.css apps/web/tests/event-choice/EventFeedbackPanel.test.tsx apps/web/tests/event-choice/EventOutcomeFeedback.test.tsx apps/web/tests/e2e/youth-season.spec.ts
git commit -m "feat: show dynamic event result cards"
~~~

### Task 6: Run complete gates, balance check, and record the module

**Files:**
- Modify: docs/ROADMAP.md
- Generated report: artifacts/youth-balance-m10-dynamic-event-responses.json

**Interfaces:**
- Consume the existing monthly browser flow and saved result feedback contract.
- Produce an evidence-backed roadmap entry with actual test counts, E2E result, balance report path, and an explicit statement that the module did not add a second rules engine or change random-sequence semantics.

- [ ] **Step 1: Run the complete required verification gates**

Run in this order:

~~~text
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test:e2e
pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/youth-balance-m10-dynamic-event-responses.json
~~~

Record actual test counts and balance metrics from command output; do not claim completion from a partial run. Include completion rate, fixture/decision distributions, severe injury rate, graduation rate, professional promise rate, transfer/retirement metrics, and story theme coverage, and confirm no unexpected core-distribution change caused by this content/presentation layer.

- [ ] **Step 2: Perform the final review and update the roadmap**

Review the diff for UI rule duplication, accidental weekly controls, new random calls, unbounded content text, participant-role mismatches, unresolved story links, legacy-save regressions, and incomplete result branches. Append one concise M10 module entry to docs/ROADMAP.md with exact verification evidence, the balance artifact path, and the next boundary: broader authored coverage or a separately designed AI polish layer.

- [ ] **Step 3: Commit the verified module checkpoint**

Run:

~~~text
git add docs/ROADMAP.md artifacts/youth-balance-m10-dynamic-event-responses.json
git commit -m "docs: record dynamic event response module"
~~~

After this checkpoint, inspect git status --short --branch and leave the worktree clean. Keep the local development server on port 5174 available for manual review.

## Definition of Done

- The ten selected events have complete, role-safe, three-outcome authored feedback branches.
- A player can see a concrete result title and result type after a choice; structured branch copy, participant responses, state/relationship changes, and follow-up remain aligned.
- New result fields survive application save/reload; old feedback and old saves without them remain valid and are not retroactively guessed.
- The UI remains presentation-only, the v3 monthly flow is unchanged, and the simulation remains deterministic with no new random cursor movement.
- All required verification gates and the 1,000-season balance command have passed, with evidence recorded in docs/ROADMAP.md.
