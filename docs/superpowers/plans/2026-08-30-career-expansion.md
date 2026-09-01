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
- [x] Step 3: Preserve authored response, participant responses, and follow-up fields in legacy event snapshots and older saved pending events; add dedicated response and follow-up copy to both national-team debut choices.
- [x] Step 4: Run focused regression tests, global unit/architecture tests, typecheck, lint, format, build, and E2E.

实际结果：修复前回归测试分别因国家队首召缺少回应、legacy 快照丢失字段和旧待决存档未补全文案而失败；修复后 4 个相关测试文件 39/39 通过，全局 81 个测试文件 418/418、架构 10/10、生产构建和桌面/移动端 E2E 16/16 通过。数值效果和随机序列未改变，继续使用 `artifacts/youth-balance-module3.json` 作为当前平衡基线。

#### Task 2：把用户选择接入可追踪后续链（已完成）

- [x] Step 1: Write the failing tests
- [x] Step 2: Run the tests to verify they fail
- [x] Step 3: Add an explicit misunderstanding follow-up with match-fact gating, coach/teammate participation, relationship-only effects, authored responses, and authored follow-up copy; persist optional `nextEventIds` in feedback and show only the next scene clue in the feedback page.
- [x] Step 4: Hydrate `storyId`, `nextEventIds`, and feedback next-scene metadata for older pending event/feedback saves.
- [x] Step 5: Run focused regression tests, global unit/architecture tests, typecheck, lint, format, build, E2E, and the 1,000-season balance command.

实际结果：用户选择现在形成“即时回应 → 后续影响 → 下一幕线索 → 满足比赛事实后再次触发”的可回放链条；普通无后续事件不显示空占位，反馈页不承担完整剧情图鉴。全局 81 个测试文件、419 个测试和架构 10/10 通过，E2E 16/16 通过，1,000 赛季报告写入 `artifacts/youth-balance-module4.json`。新增内容效果仅作用于事件参与人物的信任/尊重关系，放弃率回到 1.1%，未改变月度节奏、核心数值模拟或随机序列。

#### 跨模块修复：青训年龄边界（已完成）

- [x] Step 1: 追踪年龄派生、休赛期评估和下赛季入口，确认 20 岁青训来自入口无年龄上限，而不是出生日期计算错误。
- [x] Step 2: 先添加并验证失败回归测试：20 岁不得开启青训、19 岁进入最后职业窗口、拒绝最后报价进入自由市场。
- [x] Step 3: 在 simulation 设定 19 岁最后青训窗口；application 保护阶段转移、兼容旧休赛期存档，并把最终赛季方向记录为 `professional-market`。
- [x] Step 4: 前端隐藏不可用的“开始下赛季”，将最终窗口和首份合同拒绝后的状态展示为职业市场；运行全量门禁与 1,000 季平衡检查。

实际结果：青训从 16 岁起步，19 岁为最后完整赛季，下一赛季若将满 20 岁会被阶段机拒绝；19 岁未完全达标者仍可进入低层级职业市场，拒绝报价后进入自由球员流程。全量测试 81 个文件、424 个用例，架构检查 10/10，E2E 16/16；1,000 季完成率 100%，毕业签约率 61%，拒签率 28%，职业承诺兑现率 93.4%，退役年龄中位 30。

#### Task 3：内容驱动的确定性对话变体（已完成）

- [x] Step 1: Write the failing regression tests
- [x] Step 2: Run the tests to verify they fail
- [x] Step 3: 将对话变体限制为内容包显式提供的候选文本，由生涯种子、事件 ID 和选择 ID 稳定选择；变体只承载主回应、参与人物回应和后续影响，不改变事件效果或随机游标。
- [x] Step 4: 持久化 `narrativeVariantIndex`，并在旧事件/反馈存档恢复时保留已选文本；旧内容无变体时继续使用原有单一文案回退。
- [x] Step 5: 为“训练场上的误会 / 澄清误会”加入两组完整内容变体，并扩展内容质量校验覆盖变体文案。
- [x] Step 6: local-AI 只作为可选叙事层边界，不能写入比赛结果、属性、关系或阶段机；本任务不接入核心运行时，无服务时始终使用确定性内容回退。
- [x] Step 7: 运行聚焦回归、全量门禁、E2E 和 1,000 赛季平衡命令。

实际结果：同一种子、同一事件和同一选择始终得到同一组完整对话；反馈索引与实际文案可序列化、可重放，读档不会被当前内容包的单一回应覆盖。聚焦回归 4 个测试文件、5 个用例通过；全量 `pnpm test` 为 85 个测试文件、429 个用例，架构检查 10/10，`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build` 和 `pnpm test:e2e`（16/16）均通过；1,000 赛季平衡报告写入 `artifacts/youth-balance-module4-task3.json`，完成率 100%、决策中位 10、重伤率 0.7%、职业承诺兑现率 93.4%、退役年龄中位 30。

### M8 完成定义

1. 事件反馈不再只是选择记录，而是玩家可见、可确认、可追溯的即时叙事结果。
2. 月度流程有明确节奏与转折，同时保持 v3 月度边界和保存确定性。
3. 核心页面具备统一、可读、可识别的足球场景视觉系统。
4. 事件内容具备人物回应和后续链条，批量模拟与 E2E 门禁保持通过。

## M9 后续体验模块（2026-09-01 起）

> 按用户批准的顺序执行；每个模块单独验证、汇报并提交保存点。模块不跨越阶段机边界，也不恢复玩家侧周推进。

### 模块 1：结构化故事图谱与内容扩展（已完成）

- 以现有 `storyId`/`nextEvents` 为兼容基础，增加选项级 `nextEventIds`，让不同选择能够进入不同的下一幕。
- 新增“入选边缘”三节点路径和“伤后回归”三节点路径，共 6 个事件；所有节点具备人物、条件、回应和后续影响。
- 内容校验覆盖选项级断链；旧 pending event/feedback 存档会补齐分支元数据。
- 门禁：87 个测试文件、432 个用例、架构 10/10、E2E 16/16、typecheck/lint/format/build 通过。
- 平衡：`artifacts/youth-balance-module1.json`；完成率 100%、决策中位 10、P90 13、每月最多 2 个决策、重伤率 0.7%、主题覆盖率 100%。
- 提交保存点：`e39f9c7`（M8 基线）之后，模块设计先以 `f98793d` 保存；模块代码与本节文档待本次提交保存。

### 模块 2：故事链与事件图谱的连续反馈（待执行）

### 模块 2：故事链与事件图谱的连续反馈（已完成）

#### Task 1：生成可解释的故事进度快照

- [x] Step 1: 先添加合同层、模拟层和前端层失败回归测试。
- [x] Step 2: 在 simulation 聚合故事节点、完成状态、当前游标和最近选择，不推进事件也不复制触发规则。
- [x] Step 3: 将快照接入青训与职业月报，并在两个仪表盘展示最近选择、当前线索、等待条件和进度条。
- [x] Step 4: 运行专项测试、全量门禁、E2E 和 1,000 赛季平衡命令。

实际结果：新增 3 个专项测试文件、4 个测试通过；全量 pnpm test 为 90 个测试文件、436 个测试，架构检查 10/10；typecheck、lint、format、build 和 E2E 16/16 通过。故事状态仍由已有 save 字段和内容事件定义解释，未新增模拟状态源，未改变同月互动事件上限、冷却、事实条件或随机序列。

平衡：artifacts/youth-balance-module2.json；完成率 100%、决策中位 10、P90 13、每月最多 2 个决策、重伤率 0.7%、主题覆盖率 100%。

### 模块 3：比赛日节奏与可玩性增强（已完成）

- [x] 先添加合同、模拟、应用和 UI 的失败回归测试。
- [x] 为青年和职业比赛事实写入对手强度、主客场、出场、分钟、评分、进球和助攻上下文。
- [x] 从持久化账本事实生成确定性的比赛日回放，兼容旧账本缺少上下文的情况。
- [x] 将赛前判断、赛后反馈、比分和对手难度接入青年与职业月报，并在仪表盘展示。
- [x] 运行全量门禁和 1,000 赛季平衡检查，确认不改变比赛结果与月度推进边界。

实际结果：新增 MatchdayMoment 与 MatchContext 契约；比赛日回放按对手强度显示“可拿分 / 势均力敌 / 高强度”，并把赛前预期、球队结果、球员出场与个人贡献放在同一张月报卡片中。老账本仍可由摘要生成中性回退，刷新和中断后可从账本重建。

门禁结果：pnpm test 通过（93 个测试文件、441 个测试，架构 10/10）；pnpm typecheck、pnpm lint、pnpm format:check、pnpm build 通过；pnpm test:e2e 通过（16/16）；pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/youth-balance-module3.json 通过，完成率 100%、比赛中位 22、决策中位 10、重伤率 0.7%、毕业率 60.9%、职业承诺兑现率 93.4%。

### 模块 4：安全的本地 AI 叙事层（已完成）

- [x] 定义最小叙事事实包和版本化 prompt，AI 输入不包含存档、随机源、属性或阶段机。
- [x] 使用严格输出 schema，只允许回应、人物对白和后续文案；未知字段直接拒绝。
- [x] 实现 provider、deterministic mock、超时、异常、非法 schema、参与人物变更和新增数字事实的安全回退。
- [x] 保留作者原文为离线默认路径，AI 输出不写入账本、存档或机械状态。
- [x] 将 local-ai 纳入 root 测试发现范围，并完成全量门禁和 1,000 赛季平衡检查。

实际结果：安全适配器只对已确定的文字草稿做可选润色；成功时返回 provider 文案，任何失败或越权输出返回原作者文案并标注原因。当前没有真实模型 provider，后续接入时仍必须通过同一 adapter。

门禁结果：pnpm test 通过（95 个测试文件、450 个测试，架构 10/10）；pnpm typecheck、pnpm lint、pnpm format:check、pnpm build 通过；pnpm test:e2e 通过（16/16）；pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/youth-balance-module4.json 通过，核心模拟分布与模块 3 完全一致。

### 模块 5：视觉沉浸与场景表现（执行中）

- 在现有深色球场工作台上补充训练、比赛、更衣室、恢复和市场场景；优先使用可控 SVG/本地资源。
- 通过桌面/移动端 E2E 验证可读性、键盘操作和无横向溢出。

### 模块 6：全生涯回放与长期目标（待执行）

- 将故事选择、关键比赛、关系转折和阶段节点写入可对账的生涯时间线。
- 回放只读取账本、赛季历史和故事事实，验证读档一致与退役终态。

### 模块 7：综合平衡与发布前验收（待执行）

- 汇总全生涯、故事链、比赛节奏、AI 回退和视觉 E2E 结果。
- 运行所有门禁与批量命令，保留每个模块提交点，再由用户决定合并或继续调参。
