# 生涯扩展实施计划

> **For agentic workers:** 按工作包批量推进，每个工作包遵守 TDD。设计机制以 `docs/superpowers/specs/2026-08-30-career-expansion-design.md` 为准。

**目标：** 把职业期延展为完整生涯：自由球员转会、留洋海外、国家队征召、年龄巅峰与衰退，最终退役并生成生涯回顾，完成 MVP 生涯闭环；以全生涯批量模拟验收。

## 全局约束

- 阶段机（free-agent 激活、retired 终态）转移只经 application 用例。
- 同种子同操作产生相同状态；转会同种子完全一致。
- 退役属永久性重大操作，需一次简短确认；38 岁强制退役。
- 生涯回顾必须可对账（逐季来自 seasonHistory/clubHistory/totals）。
- 每个工作包完成时项目可运行、门禁全绿。

## 工作包 1：v5 存档、年龄曲线与自由球员转会

- contracts：`CareerPhaseSchema` 增加 retired；v5 Schema（clubHistory/nationalTeam/totals/overseasSince/freeAgentSeasons/retiredOn）与 v4→v5 迁移；账本新增 transfer-signed/national-debut/retirement；ClubProfile 增加 overseas 标记。
- simulation：`age-curve.ts`（周成长乘数 + 月度衰退）；`offer-generation.ts` 支持海外薪资系数与无保底开关；`transfer-offers.ts`（自由球员要约池：海外门槛 adaptability ≥55）。
- application：`generate-transfer-offers`（市场降温：连续无签约天花板 −1）、`sign-transfer`（写入新合同 + clubHistory 收口 + overseasSince）；`complete-professional-season` 累计 totals 并 upsert clubHistory。
- web：自由球员要约面板（复用要约卡片）、市场冷淡与退役提示。
- 测试：v5 迁移、年龄乘数与衰退、转会确定性、市场降温、用例阶段校验。

- [x] 1.1 v5 契约与迁移测试先行
- [x] 1.2 年龄曲线（成长乘数 + 衰退）测试先行
- [x] 1.3 转会要约与签约用例
- [x] 1.4 UI 与门禁，提交 `feat: add free agency transfers and age curves`

## 工作包 2：海外适应与国家队

- content：海外俱乐部表（12 家，层级 4–8，overseas: true）并入校验。
- simulation：`national-team.ts`（资格评估 + caps/进球抽样）；海外适应（每周士气损耗随适应力与年数衰减）与声望加成（×1.2）接入职业周转移。
- application：国家队资格评估并入赛季结算；首征召生成待决事件（接受/婉拒）。
- web：仪表盘国家队卡片；待决事件复用事件面板。
- 测试：资格边界、caps 分布、适应衰减、声望加成、首征召事件。

- [x] 2.1 海外内容与适应机制
- [x] 2.2 国家队资格与累计
- [x] 2.3 UI 与门禁，提交 `feat: add overseas clubs and national team`

## 工作包 3：退役、生涯回顾与全生涯平衡

- simulation：`career-review.ts`（总览/时间线/履历/六级点评，确定性）。
- application：`retire`（30+ 可选、38 强制确认逻辑）；阶段路由收尾。
- web：退役确认、生涯回顾页。
- tools/balance：全生涯批量（毕业 → 职业期至退役，上限 20 季）：生涯长度、转会次数、留洋占比、caps、退役年龄、回顾生成率。
- 校准范围：生涯长度中位 8–14 季；平均转会 0.5–2.5；留洋占比 10–30%（按已毕业职业球员）；有国家队出场 25–50%（按全部生涯样本）；退役年龄中位 30–34；回顾生成 100%。
- 文档：ROADMAP M7 已完成 + 实际指标；AGENTS 补充；完整门禁 + 1,000 次批量。

- [x] 3.1 退役与回顾测试先行
- [x] 3.2 UI 与 E2E
- [x] 3.3 批量校准与范围测试
- [x] 3.4 文档收尾并提交 `feat: complete career expansion milestone`

## 完成定义

1. 玩家可从 M6 终态经自由球员转会（含留洋）继续生涯，累计国家队出场，最终退役并查看生涯回顾。
2. 转会、国家队累计、衰退与回顾可解释、可回放、同种子一致。
3. v4 存档可迁移；v5 严格校验；退役为终态。
4. 全生涯批量无崩溃且分布在校准范围内。
5. 全部门禁通过；MVP 生涯闭环（16 岁 → 退役回顾）完整可玩。

## 后续工作包：M8 体验升级（2026-08-31 起）

> M7 生涯闭环完成后，按用户批准的体验升级顺序执行。模块之间依次完成，每个模块完成后先汇报并提供可运行版本。

### 模块 1：事件选择后的即时反馈（已完成）

- 事件选择后持久化现场结果、参与人物回应、状态/关系变化与后续影响。
- 反馈展示由 web 负责，事件效果和反馈数据由 simulation/application 负责；自动事件不打断玩家。
- 反馈确认是单独的一步，刷新后可恢复，未确认时不能推进月份或职业期。
- 使用确定性内容与现有种子，不引入 simulation 外部运行时依赖。
- 门禁：75 个测试文件、401 个测试、架构 10/10、16 个桌面/移动端 E2E、类型/Lint/格式/构建及 1,000 赛季平衡命令通过；内容覆盖测试确保所有玩家主动选择都有专属结果与后续影响。

### 模块 2：生涯节奏与事件密度（已完成）

- 保持 v3 月度玩家流程，不恢复周推进或快进按钮。
- 月报增加由账本事实生成的四段式节奏：训练、比赛、事件/关系和月度结算；根据当月锚点显示稳定、上扬、转折或预警，并给出下一步关注。
- 已开启故事线的后续事件触发机会从 34% 小幅提高到 40%，普通事件保持 34%；仍保留每月最多 2 个互动事件和原有冷却规则。
- 先用回归测试锁定当前月度结算、事件冷却、存档恢复和确定性，再调整可解释的节奏常量。
- 使用 1,000 赛季统计验证决策密度、比赛密度、重大事件间隔和完成率，避免单纯加速导致模拟失真；本模块完成率 100%、决策中位 10、P90 为 13、放弃率 1.1%、严重伤病率 0.8%。
- 门禁：77 个测试文件、405 个测试、架构检查 10/10、16 个桌面/移动端 E2E、类型/Lint/格式/构建及 1,000 赛季平衡命令通过。

### 模块 3：视觉与场景表现（已完成）

目标：在不改变 simulation/application 行为的前提下，将月度仪表盘、事件选择和事件反馈统一为深色球场工作台；所有图标和场景都保留可读文字，并在移动端保持单列可用。

固定接口：

- FootballGlyph({ name, label, size })：name 使用 training | match | locker-room | recovery | fitness | fatigue | morale | form | coach-trust | relationship | warning，label 作为无障碍名称，装饰性图标使用 aria-hidden。
- StatusBadge({ glyph, label, value, tone })：tone 使用 positive | neutral | caution | danger，数值由页面已有展示数据传入。
- SceneBanner({ kind, eyebrow, title, detail })：kind 使用 training | match | locker-room | recovery | neutral，组件不读取存档、账本或随机源。

#### Task 1：视觉令牌与足球语义原语

Files:

- Modify: apps/web/src/design-system/tokens.css
- Create: apps/web/src/design-system/FootballGlyph.tsx
- Create: apps/web/src/design-system/StatusBadge.tsx
- Create: apps/web/tests/design-system/FootballVisualPrimitives.test.tsx
- Modify: apps/web/src/app/app.css

- [x] Step 1: Write the failing tests

测试 FootballGlyph 为比赛和训练输出带 aria-label 的 SVG，测试 StatusBadge 同时显示文字、数值和状态类名；测试相同组件不依赖外部图标包。

- [x] Step 2: Run the tests to verify they fail

Run: pnpm exec vitest run apps/web/tests/design-system/FootballVisualPrimitives.test.tsx
Expected: FAIL because FootballGlyph and StatusBadge do not exist.

- [x] Step 3: Implement the minimal primitives

在 tokens.css 增加深色画布、球场绿、荧光黄、琥珀、危险红、标题/正文层级和焦点环令牌；使用内联 SVG path 实现固定语义图标，StatusBadge 只渲染传入的 value 与 tone。

- [x] Step 4: Run the tests to verify they pass

Run: pnpm exec vitest run apps/web/tests/design-system/FootballVisualPrimitives.test.tsx
Expected: PASS with no accessibility assertion failures.

- [x] Step 5: Commit the completed task

Run: git add apps/web/src/design-system/tokens.css apps/web/src/design-system/FootballGlyph.tsx apps/web/src/design-system/StatusBadge.tsx apps/web/tests/design-system/FootballVisualPrimitives.test.tsx apps/web/src/app/app.css
Run: git commit -m "feat: add football visual primitives"

#### Task 2：场景条与展示数据适配

Files:

- Create: apps/web/src/design-system/SceneBanner.tsx
- Create: apps/web/tests/design-system/SceneBanner.test.tsx
- Modify: apps/web/src/career-dashboard/career-presentation.ts
- Modify: apps/web/src/app/app.css

Interfaces:

- SceneBanner consumes { kind, eyebrow, title, detail } and renders aria-label="足球场景：{title}"。
- career-presentation.ts exports sceneKindForBeat(kind: MonthlyBeat['kind']): SceneKind and sceneKindForTheme(theme: YouthEventTheme | undefined): SceneKind; these are presentation mappings only and do not inspect save state.

- [x] Step 1: Write the failing tests

覆盖 match → match、training → training、health → recovery、relationship → locker-room、未知/缺失输入 → neutral，并断言场景装饰为 aria-hidden="true"、标题仍可见。

- [x] Step 2: Run the tests to verify they fail

Run: pnpm exec vitest run apps/web/tests/design-system/SceneBanner.test.tsx
Expected: FAIL because SceneBanner and the presentation mappings are missing.

- [x] Step 3: Implement the scene banner and mappings

实现四种 CSS/SVG 场景构图：训练锥桶、比赛球场线、更衣室储物柜、恢复呼吸线；不加载图片、不调用网络服务；未知值使用中性球场网格。

- [x] Step 4: Run the tests to verify they pass

Run: pnpm exec vitest run apps/web/tests/design-system/SceneBanner.test.tsx
Expected: PASS for all scene mappings and accessibility labels.

- [x] Step 5: Commit the completed task

Run: git add apps/web/src/design-system/SceneBanner.tsx apps/web/tests/design-system/SceneBanner.test.tsx apps/web/src/career-dashboard/career-presentation.ts apps/web/src/app/app.css
Run: git commit -m "feat: add football career scene banners"

#### Task 3：青训与职业仪表盘视觉升级

Files:

- Modify: apps/web/src/career-dashboard/CareerDashboard.tsx
- Modify: apps/web/src/career-dashboard/ProDashboard.tsx
- Modify: apps/web/src/career-dashboard/ProOffseasonPanel.tsx
- Create: apps/web/tests/career-dashboard/CareerDashboardVisuals.test.tsx
- Modify: apps/web/tests/career-dashboard/ProDashboard.test.tsx
- Modify: apps/web/src/app/app.css

Interfaces:

- 仪表盘将已有 report.momentum.beats 和 save 的展示字段传给 SceneBanner、FootballGlyph、StatusBadge；不新增组件内的数值计算。
- 当前状态区至少渲染 fitness、fatigue、morale、form、coachEvaluation 五个带语义图标的徽章。

- [x] Step 1: Write the failing tests

渲染青训和职业仪表盘，断言存在足球场景区域、五个状态徽章、突出显示的球员标题，并断言伤病同时出现文字与危险状态，而不是只改变颜色。

- [x] Step 2: Run the tests to verify they fail

Run: pnpm exec vitest run apps/web/tests/career-dashboard/CareerDashboardVisuals.test.tsx apps/web/tests/career-dashboard/ProDashboard.test.tsx
Expected: FAIL because current dashboard cards have no semantic glyph/badge markup.

- [x] Step 3: Implement the dashboard presentation

将当前状态、球员档案、训练计划、属性和最近记录整理为统一卡片皮肤；在月报顶部使用最高优先级 MonthlyBeat 生成场景条，在无月报或旧存档时使用 neutral；为职业积分榜、国家队和承诺卡复用同一标题/徽章层级。

- [x] Step 4: Run the tests to verify they pass

Run: pnpm exec vitest run apps/web/tests/career-dashboard/CareerDashboardVisuals.test.tsx apps/web/tests/career-dashboard/ProDashboard.test.tsx
Expected: PASS with the existing dashboard behavior unchanged.

- [x] Step 5: Commit the completed task

Run: git add apps/web/src/career-dashboard/CareerDashboard.tsx apps/web/src/career-dashboard/ProDashboard.tsx apps/web/src/career-dashboard/ProOffseasonPanel.tsx apps/web/tests/career-dashboard/CareerDashboardVisuals.test.tsx apps/web/tests/career-dashboard/ProDashboard.test.tsx apps/web/src/app/app.css
Run: git commit -m "feat: style career dashboards as football workspaces"

#### Task 4：事件选择与反馈页面视觉升级

Files:

- Modify: apps/web/src/event-choice/EventChoicePanel.tsx
- Modify: apps/web/src/event-choice/EventFeedbackPanel.tsx
- Modify: apps/web/src/app/App.tsx
- Modify: apps/web/tests/event-choice/EventFeedbackPanel.test.tsx
- Create: apps/web/tests/event-choice/EventChoiceVisuals.test.tsx
- Modify: apps/web/src/app/app.css

- [x] Step 1: Write the failing tests

断言事件选择页有事件场景、风险徽章和键盘可操作的选择按钮；断言反馈页有现场结果、人物回应、变化记录、后续影响四个区域的高对比标题，并且保留已有的确认按钮行为。

- [x] Step 2: Run the tests to verify they fail

Run: pnpm exec vitest run apps/web/tests/event-choice/EventChoiceVisuals.test.tsx apps/web/tests/event-choice/EventFeedbackPanel.test.tsx
Expected: FAIL because the current choice page uses inline styles and has no shared scene/risk presentation.

- [x] Step 3: Implement shared event presentation

移除事件选择页的核心内联样式，改为统一 class；App 根据 pendingEvent.eventId 从已有 content events 找到主题后，将 sceneKind 作为展示参数传给选择页和反馈页，事件组件本身不读取内容包；使用 FootballGlyph 与风险文字强化低/中/高风险；反馈页复用标题、场景和变化徽章，但不改变 onContinue、暂停或存档行为。

- [x] Step 4: Run the tests to verify they pass

Run: pnpm exec vitest run apps/web/tests/event-choice/EventChoiceVisuals.test.tsx apps/web/tests/event-choice/EventFeedbackPanel.test.tsx
Expected: PASS with existing response, participant and follow-up assertions intact.

- [x] Step 5: Commit the completed task

Run: git add apps/web/src/app/App.tsx apps/web/src/event-choice/EventChoicePanel.tsx apps/web/src/event-choice/EventFeedbackPanel.tsx apps/web/tests/event-choice/EventChoiceVisuals.test.tsx apps/web/tests/event-choice/EventFeedbackPanel.test.tsx apps/web/src/app/app.css
Run: git commit -m "feat: add scene-led event choice presentation"

#### Task 5：响应式与浏览器验收

Files:

- Modify: apps/web/tests/e2e/youth-season.spec.ts
- Modify: apps/web/tests/e2e/professional-season.spec.ts
- Modify: apps/web/tests/e2e/bootstrap-career.spec.ts
- Modify: apps/web/src/app/app.css

- [x] Step 1: Write the failing E2E assertions

在青年和职业月报流程中断言 足球场景、本月节奏、状态徽章和事件风险徽章可见；在移动端断言 document.documentElement.scrollWidth <= window.innerWidth，并检查事件选择和反馈页的关键标题不被裁切。

- [x] Step 2: Run the focused E2E tests to verify they fail

Run: pnpm exec playwright test apps/web/tests/e2e/youth-season.spec.ts apps/web/tests/e2e/professional-season.spec.ts --project=desktop
Expected: FAIL on at least one missing visual landmark before the page styles are integrated.

- [x] Step 3: Implement responsive layout corrections

桌面端保留主内容/侧栏层级，移动端在 max-width: 760px 下切换单列布局；为场景条、徽章、选择按钮和长中文标题设置可换行规则；所有装饰 SVG 不参与布局宽度。

- [x] Step 4: Run the complete browser suite

Run: pnpm test:e2e
Expected: 16 desktop/mobile tests pass with no horizontal overflow.

- [x] Step 5: Commit the completed task

Run: git add apps/web/tests/e2e/youth-season.spec.ts apps/web/tests/e2e/professional-season.spec.ts apps/web/tests/e2e/bootstrap-career.spec.ts apps/web/src/app/app.css
Run: git commit -m "test: verify responsive football visual flow"

#### Task 6：模块 3 门禁与文档收尾

Files:

- Modify: docs/ROADMAP.md
- Modify: docs/superpowers/plans/2026-08-30-career-expansion.md
- Generated: artifacts/youth-balance-module3.json

- [x] Step 1: Run the complete validation commands

Run: pnpm test
Run: pnpm typecheck
Run: pnpm lint
Run: pnpm format:check
Run: pnpm build
Run: pnpm test:e2e
Run: pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/youth-balance-module3.json
Expected: every command exits with code 0; the balance summary stays within the existing module 2 ranges.

- [x] Step 2: Update the progress records

将 docs/ROADMAP.md 的当前阶段改为“模块 3 已完成、模块 4 待执行”，并在活动计划记录实际测试文件数、E2E 数量、构建结果和 1,000 赛季报告路径；不修改 spec.md 的长期规则。

- [x] Step 3: Commit the module documentation

Run: git add docs/ROADMAP.md docs/superpowers/plans/2026-08-30-career-expansion.md
Run: git commit -m "docs: complete visual experience milestone"

实际结果：`pnpm test` 通过（81 个测试文件、415 个测试，含架构 10/10）；`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build` 和 `pnpm test:e2e` 通过（16/16）；`pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/youth-balance-module3.json` 通过，报告保留模块 2 的决策密度、事件上限、伤病与职业期分布范围。

### 模块 4：内容丰富度与 AI 生动性（执行中）

#### Task 1：让专属反馈真正到达事件实例（已完成）

- [x] Step 1: Write the failing tests
- [x] Step 2: Run the tests to verify they fail
- [x] Step 3: Preserve authored response, participant responses, and follow-up fields in legacy event snapshots; add dedicated response and follow-up copy to both national-team debut choices.
- [x] Step 4: Run focused regression tests, global unit/architecture tests, typecheck, lint, format, build, and E2E.

实际结果：修复前回归测试分别因国家队首召缺少回应、legacy 快照丢失字段而失败；修复后 3 个相关测试文件 37/37 通过，全局 81 个测试文件 417/417、架构 10/10、生产构建和桌面/移动端 E2E 16/16 通过。数值效果和随机序列未改变，继续使用 `artifacts/youth-balance-module3.json` 作为当前平衡基线。

- 将事件从孤立图鉴扩展为“选择 → 即时回应 → 后续影响 → 再次触发”的可追踪链条。
- 增加有参与者、有事实依据、有关系变化的事件组合；对话变体必须由内容和种子显式提供，保持可回放与可测试。
- 再评估本地 AI/生成式内容的接入边界，不能让核心 simulation 依赖外部服务或产生不可复现的比赛结果。

### M8 完成定义

1. 事件反馈不再只是选择记录，而是玩家可见、可确认、可追溯的即时叙事结果。
2. 月度流程有明确节奏与转折，同时保持 v3 月度边界和保存确定性。
3. 核心页面具备统一、可读、可识别的足球场景视觉系统。
4. 事件内容具备人物回应和后续链条，批量模拟与 E2E 门禁保持通过。
