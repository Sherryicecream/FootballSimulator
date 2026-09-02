# 选择结果判定引擎实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让剧情选择根据球员当前能力、状态和可复现的有限波动产生成功、部分成功或失败结果，并把原因、影响和反馈完整保存给玩家。

**Architecture:** contracts/content 只定义可校验的判定配置和结果文案；simulation 提供纯的确定性判定函数；application 负责调用判定、应用结果、写入账本和生成反馈；web 只显示应用层返回的数据。旧事件没有判定配置时继续使用静态效果，旧存档通过可选字段默认值兼容。

**Tech Stack:** TypeScript、Zod、Vitest、React、现有 `@football/contracts` / `@football/simulation` / `@football/application` workspace packages。

## Global Constraints

- `spec.md` 是长期产品基线，`docs/ROADMAP.md` 是唯一进度入口；本模块设计基线为 `docs/superpowers/specs/2026-09-02-choice-outcome-resolution-design.md`。
- 浏览器继续使用 v3 月度职业流程，不重新引入玩家侧周推进或快进按钮。
- `packages/simulation` 必须保持确定性且无外部运行时依赖；内容和种子显式传入。
- 规则只在 simulation/application 实现，UI 不重算难度、随机或效果。
- 旧 `EventChoice`、旧 pending event、旧 feedback 和旧存档必须继续可加载。
- 选择判定不得推进 career `randomState.sequencePosition`，不能改变既有比赛/训练随机序列。
- 每个可提交的工作包完成后独立测试、独立提交，避免大范围未保存改动。

---

### Task 1: 定义判定契约和内容校验

**Files:**
- Modify: `packages/contracts/src/event.ts`
- Modify: `packages/contracts/src/youth-season.ts`
- Modify: `packages/contracts/tests/event.test.ts`
- Modify: `packages/content/src/validation/validate-content.ts`
- Modify: `packages/content/tests/events/youth-events.test.ts`

**Interfaces:**
- `EventChoiceSchema` 增加可选 `resolution`。
- `resolution` 使用现有可见能力键（如 `decision`、`composure`、`passing`）作为主能力，包含 `difficulty`、可选 `volatility`、有限状态修正和 `outcomes.success/partial/failure`。
- 每个 outcome 复用现有 `effects`、`delayEffects`、`response`、`responses`、`followUp`、`nextEventIds`、`narrativeVariants` 能力，并增加必填结果标签。
- `EventFeedbackSchema` 增加可选的 outcome 摘要字段，旧反馈不要求该字段。

- [ ] **Step 1: Write the failing test**

```ts
it('accepts an authored three-branch choice resolution', () => {
  const choice = EventChoiceSchema.parse({
    id: 'clarify',
    text: '当面澄清误会',
    riskLabel: 'medium',
    effects: {},
    resolution: {
      attribute: 'decision',
      difficulty: 60,
      volatility: 8,
      outcomes: {
        success: { label: '沟通奏效', effects: { coachTrust: 3 } },
        partial: { label: '误会缓和', effects: { coachTrust: 1 } },
        failure: { label: '解释被误解', effects: { coachTrust: -3 } },
      },
    },
  });

  expect(choice.resolution?.outcomes.failure.label).toBe('解释被误解');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run packages/contracts/tests/event.test.ts`

Expected: FAIL because `EventChoiceSchema` currently rejects/omits `resolution`.

- [ ] **Step 3: Implement the minimal contract**

在 `event.ts` 增加判定配置 schema；能力键从 `PlayerAttributes` 的技术/身体/精神分组中选取，状态键限制为现有事件用例可读取的 `morale`、`form`、`confidence`、`fitness`、`fatigue`、`coachTrust`。结果效果继续走现有效果白名单，不新增隐式状态字段。

- [ ] **Step 4: Add invalid-content regression cases**

为负难度、超过允许范围的 volatility、缺少 partial outcome 和未知 attribute 增加拒绝用例；保留不含 `resolution` 的旧事件通过用例。

- [ ] **Step 5: Run focused tests**

Run: `pnpm exec vitest run packages/contracts/tests/event.test.ts packages/content/tests/events/youth-events.test.ts`

Expected: PASS for valid and legacy content, with invalid resolution data rejected.

- [ ] **Step 6: Commit the contract slice**

Run: `git add packages/contracts/src/event.ts packages/contracts/src/youth-season.ts packages/contracts/tests/event.test.ts packages/content/src/validation/validate-content.ts packages/content/tests/events/youth-events.test.ts`

Run: `git commit -m "feat: define authored choice outcome branches"`

### Task 2: Implement the pure deterministic resolver

**Files:**
- Create: `packages/simulation/src/events/choice-resolution.ts`
- Create: `packages/simulation/tests/events/choice-resolution.test.ts`
- Modify: `packages/simulation/src/index.ts`

**Interfaces:**
- Export `resolveChoiceOutcome(input)` from `@football/simulation`.
- Input explicitly includes `save: CareerSaveV2Like`, `choice: EventChoice`, `eventId: string`, and `seed: number`.
- Return includes `outcome: 'success' | 'partial' | 'failure' | 'legacy'`, `score`, `target`, `attributeValue`, `stateModifier`, `variance`, `label`, `reason`, and the selected outcome definition when configured.

- [ ] **Step 1: Write the failing tests**

```ts
it('is stable for the same save, event, choice and seed', () => {
  const first = resolveChoiceOutcome({ save, choice, eventId: 'event-1', seed: 42 });
  const second = resolveChoiceOutcome({ save, choice, eventId: 'event-1', seed: 42 });

  expect(second).toEqual(first);
  expect(save.randomState).toEqual({ seed: 42, sequencePosition: 5 });
});

it('makes stronger decision ability improve the score', () => {
  const strong = resolveChoiceOutcome({ save: withDecision(80), choice, eventId: 'event-1', seed: 42 });
  const weak = resolveChoiceOutcome({ save: withDecision(35), choice, eventId: 'event-1', seed: 42 });

  expect(strong.score).toBeGreaterThan(weak.score);
});

it('keeps legacy choices on the static-effect path', () => {
  expect(resolveChoiceOutcome({ save, choice: legacyChoice, eventId: 'event-1', seed: 42 }).outcome).toBe('legacy');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run packages/simulation/tests/events/choice-resolution.test.ts`

Expected: FAIL because the resolver and export do not exist.

- [ ] **Step 3: Implement the minimal resolver**

从保存的球员属性读取主能力；按配置读取当前状态修正；使用 `seed + careerId + eventId + choiceId` 的稳定哈希生成受 `volatility` 限制的整数波动；根据 difficulty 的成功/部分成功区间返回三档结果。不得使用会推进存档随机游标的 RNG。

- [ ] **Step 4: Add boundary and compatibility tests**

验证分数被限制在合法范围、波动不超过配置、同一 seed 的结果不受调用顺序影响、不同选择 ID 能得到不同确定性波动，以及旧选择返回 legacy 且不携带 outcome 效果。

- [ ] **Step 5: Run the simulation tests**

Run: `pnpm exec vitest run packages/simulation/tests/events/choice-resolution.test.ts`

Expected: PASS with the input save unchanged.

- [ ] **Step 6: Commit the simulation slice**

Run: `git add packages/simulation/src/events/choice-resolution.ts packages/simulation/tests/events/choice-resolution.test.ts packages/simulation/src/index.ts`

Run: `git commit -m "feat: add deterministic choice outcome resolver"`

### Task 3: Connect application resolution and ledger persistence

**Files:**
- Modify: `packages/application/src/use-cases/resolve-career-event.ts`
- Modify: `packages/application/src/use-cases/submit-event-choice.ts`
- Modify: `packages/application/tests/use-cases/submit-career-decision.test.ts`
- Modify: `packages/application/tests/use-cases/submit-event-choice.test.ts`

**Interfaces:**
- `resolveCareerEvent` calls the simulation resolver before applying state, relationship, and delayed effects.
- Configured choices use only the selected outcome's effects and narrative fields; legacy choices use the existing choice-level fields.
- Ledger and feedback carry the same persisted outcome summary so a replay can explain the result without rerolling.

- [ ] **Step 1: Write the failing integration tests**

构造同一事件/选择的高决策力和低决策力存档，断言结果标签、应用状态变化、pending feedback 摘要和账本摘要随结果分支变化；使用相同输入重复调用时断言完整结果一致；保留旧测试对静态 effects 的断言。

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run packages/application/tests/use-cases/submit-career-decision.test.ts packages/application/tests/use-cases/submit-event-choice.test.ts`

Expected: FAIL because the application currently always applies `choice.effects` and never stores an outcome.

- [ ] **Step 3: Implement the application integration**

把 resolver 的 selected effects 映射到现有 `currentState`、`health`、`clubContext` 和参与者关系；把 outcome summary 追加到 `CareerLedgerEntryV2` 或其兼容字段；将 outcome 传入 feedback builder。阶段机、月度游标、pending event 清理行为保持不变。

- [ ] **Step 4: Run focused integration tests**

Run: `pnpm exec vitest run packages/application/tests/use-cases/submit-career-decision.test.ts packages/application/tests/use-cases/submit-event-choice.test.ts`

Expected: PASS with legacy tests unchanged and new result persistence assertions green.

- [ ] **Step 5: Commit the application slice**

Run: `git add packages/application/src/use-cases/resolve-career-event.ts packages/application/src/use-cases/submit-event-choice.ts packages/application/tests/use-cases/submit-career-decision.test.ts packages/application/tests/use-cases/submit-event-choice.test.ts`

Run: `git commit -m "feat: persist resolved choice outcomes"`

### Task 4: Add authored content and visible feedback

**Files:**
- Modify: `packages/simulation/src/events/event-feedback.ts`
- Modify: `packages/content/src/events/branching-story-events.ts`
- Modify: `packages/content/src/events/story-events.ts`
- Modify: `apps/web/src/event-choice/EventFeedbackPanel.tsx`
- Create: `apps/web/tests/event-choice/EventOutcomeFeedback.test.tsx`
- Modify: `apps/web/src/app/app.css`

- [ ] **Step 1: Write the failing UI tests**

构造 success、partial、failure 三种 feedback，断言页面展示结果标签、判定原因、作者回应、状态/关系变化和后续提示；断言结果使用不同语义 class；旧 feedback 仍展示现有区域和确认按钮。

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run apps/web/tests/event-choice/EventOutcomeFeedback.test.tsx`

Expected: FAIL because the feedback contract and panel have no outcome presentation.

- [ ] **Step 3: Add the first authored event coverage**

先为“训练场上的误会 / 澄清误会”配置三档回应：沟通奏效、误会缓和、解释被误解；每档只影响事件参与人物和现有状态字段，不添加无依据的全局效果。

- [ ] **Step 4: Implement the presentation**

在反馈页增加“结果”“为什么”“实际影响”“下一步”四个可读区域；使用现有 FootballGlyph/StatusBadge 语义系统，保留文字、键盘可操作性和响应式布局。组件只读取 feedback 字段，不读取 save 属性或随机源。

- [ ] **Step 5: Run focused UI tests**

Run: `pnpm exec vitest run apps/web/tests/event-choice/EventOutcomeFeedback.test.tsx apps/web/tests/event-choice/EventFeedbackPanel.test.tsx`

Expected: PASS with old feedback interactions intact.

- [ ] **Step 6: Commit the presentation slice**

Run: `git add packages/simulation/src/events/event-feedback.ts packages/content/src/events/branching-story-events.ts packages/content/src/events/story-events.ts apps/web/src/event-choice/EventFeedbackPanel.tsx apps/web/tests/event-choice/EventOutcomeFeedback.test.tsx apps/web/src/app/app.css`

Run: `git commit -m "feat: show explainable choice outcomes"`

### Task 5: Full validation and module checkpoint

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-09-02-choice-outcome-resolution.md`
- Generated: `artifacts/youth-balance-m10-choice-outcomes.json`

- [ ] **Step 1: Run the required validation**

Run: `pnpm test`

Run: `pnpm typecheck`

Run: `pnpm lint`

Run: `pnpm format:check`

Run: `pnpm build`

Run: `pnpm test:e2e`

Run: `pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/youth-balance-m10-choice-outcomes.json`

Expected: all commands pass; monthly event density, injury rate, career completion, and deterministic replay remain within the established baseline.

- [ ] **Step 2: Run the module self-review**

确认高能力不是 100% 必胜、低能力不是 100% 必败；结果效果没有作用于未参与人物；旧存档能加载；同一输入不会重抽；UI 没有第二套判定公式；随机游标、比赛和训练结果没有被选择判定改变。

- [ ] **Step 3: Update progress records**

在 `docs/ROADMAP.md` 记录模块状态、实际测试数量、E2E 结果、平衡报告路径和首批覆盖事件；在本计划勾选完成项；不修改 `spec.md` 的长期基线。

- [ ] **Step 4: Commit the module checkpoint**

Run: `git add docs/ROADMAP.md docs/superpowers/plans/2026-09-02-choice-outcome-resolution.md artifacts/youth-balance-m10-choice-outcomes.json`

Run: `git commit -m "docs: close choice outcome module"`
