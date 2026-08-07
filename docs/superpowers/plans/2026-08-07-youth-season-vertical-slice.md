# 完整青训赛季垂直切面实施计划

> **For agentic workers:** 执行时使用 `executing-plans`，按工作包批量推进并在每个工作包结束后审查。不要为每个测试或文件再派遣代理；不要同时执行其他历史设计或计划。每个工作包内部必须遵守 TDD，但只在工作包级维护复选框。

**目标：** 将当前不稳定的逐周青训原型收敛为一个可从 16 岁开始、按月推进、完成整季、可恢复存档且经过 1,000 赛季平衡验证的可信垂直切面。

**架构：** `contracts` 定义稳定的 v2 存档与青训赛季边界，`content` 提供并校验机构、赛事、人物和事件，`simulation` 只实现纯确定性周转移，`application` 编排月度事务，`web` 只渲染和提交意图，`tools/balance` 复用同一应用入口执行批量赛季。逐周调试、月度玩家推进和批量模拟不得拥有三套状态归并逻辑。

**技术栈：** Node.js 24.16+、pnpm 11.9.0、TypeScript、Zod、Vitest、fast-check、React 19、Vite、Testing Library、Playwright。

## 全局约束

- 当前长期规则以根目录 `spec.md` 为准，详细机制以 `docs/superpowers/specs/2026-08-07-youth-season-vertical-slice-design.md` 为准。
- 当前活动状态只在 `docs/ROADMAP.md` 和本计划维护。
- 玩家按月推进，simulation 内部按周结算；事件可以每月为零个、一个或多个。
- 同一种子与同一操作序列必须产生相同机械状态。
- simulation 不得依赖 React、浏览器存储、当前时间、网络或全局 `Math.random()`。
- 俱乐部、人物和赛事使用虚构名称；simulation 中不得硬编码内容名称。
- 普通选择单击生效；事件先保存再展示，选择只能提交一次。
- 属性按月结算；不得使用单一潜力控制全部属性。
- 首赛季被当前机构放弃和获得正式一线队出场都必须保持低概率，不能由单次随机结果决定。
- 每个工作包完成时项目必须可运行，禁止把未完成共享契约提交到稳定分支。
- 不新增运行时依赖，除非现有标准库和依赖无法满足且经过单独批准。
- 不修改远端历史，不强制推送；每个工作包使用一个或少量逻辑完整提交。

## 执行前状态

当前 `master` 已知存在以下未完成工作，执行者不得把它误当成稳定基线：

- `391b180` 提前加入毕业与合同 Schema，但创建、青训选择、存档和测试夹具未同步。
- `packages/simulation/tests/career/age-progression.test.ts` 为未跟踪且无法加载的实验测试。
- 单元测试、类型检查和格式检查当前失败。
- 逐周状态归并只取第一次变化，事件冷却会被普通周清空，批量推进不写完整账本。
- E2E 只检查“推进一周”按钮存在，没有执行推进。

执行时先用 `using-git-worktrees` 创建 `codex/youth-season-slice` 隔离工作区。保留用户现有工作；所有删除仅限本计划明确列出的过期或错误元素。

## 目标文件结构

```text
packages/contracts/src/
├─ player.ts                       # 可见属性、分项潜力和长期特质
├─ youth-season.ts                 # 机构、赛程、阵容、月度游标和赛季状态
├─ health.ts                       # 伤病与恢复契约
├─ event.ts                        # 参与人物、条件、事件事实和选择
├─ career.ts                       # CareerSaveV2 聚合边界
└─ save-migration.ts               # v1 原始数据到 v2 的纯迁移

packages/content/src/
├─ academies.ts                    # 虚构青训机构
├─ youth-competitions.ts           # 赛事与赛程模板
├─ person-archetypes.ts            # 教练、队友和竞争者原型
├─ events/youth-events.ts          # 有真实条件的事件内容
└─ validation/validate-content.ts  # ID、引用、范围、事件链校验

packages/simulation/src/
├─ career/simulate-youth-week.ts   # 唯一周状态转移入口
├─ career/create-youth-season.ts   # 固定赛程和初始阵容
├─ career/development-signals.ts   # 可逆发展信号
├─ player-development/development.ts
├─ health/injury-model.ts
├─ match/youth-match.ts
├─ relationships/relationship-effects.ts
└─ first-team/pathway.ts

packages/application/src/use-cases/
├─ update-training-plan.ts
├─ advance-career-month.ts
├─ submit-career-decision.ts
├─ complete-youth-season.ts
└─ load-career.ts

apps/web/src/career-dashboard/
├─ CareerDashboard.tsx
├─ PlayerOverview.tsx
├─ MonthlyAdvanceControls.tsx
├─ TrainingPlanCard.tsx
├─ SquadStatusCard.tsx
├─ RelationshipPanel.tsx
├─ SeasonTimeline.tsx
├─ MonthlyReport.tsx
└─ SeasonSummary.tsx

tools/balance/src/
├─ run-youth-seasons.ts
├─ youth-season-metrics.ts
└─ report-youth-balance.ts
```

---

### 工作包 1：恢复稳定基线并统一周状态投影

**可独立交付结果：** 当前青训仪表盘仍可运行；所有现有质量门禁恢复绿色；四个已知状态错误具有回归测试。

**文件：**

- 修改：`packages/contracts/src/career.ts`
- 修改：`packages/application/src/use-cases/start-career.ts`
- 修改：`packages/application/src/use-cases/advance-career-week.ts`
- 修改：`packages/application/src/use-cases/batch-advance.ts`
- 修改：`packages/simulation/src/career/weekly-advance.ts`
- 修改：`packages/simulation/src/career/youth-opportunity.ts`
- 修改：`apps/web/src/app/App.tsx`
- 修改：对应 contracts、simulation、application、web 测试夹具
- 删除：`packages/simulation/tests/career/age-progression.test.ts`，后续工作包按新赛季模型重写
- 创建：`packages/application/src/use-cases/project-week-result.ts`
- 创建：`packages/application/tests/use-cases/project-week-result.test.ts`

**接口：**

```ts
export const projectWeekResult = (
  save: CareerSave,
  result: WeeklyAdvanceResult,
  nextRandomPosition: number,
): CareerSave;
```

该函数必须同时负责最终状态、属性变化、冷却、账本和随机位置投影。单周推进和批量推进只能调用它，不能各自复制 `findState()` 和 `applyAttributeChange()`。

- [x] **1.1 建立失败回归测试并确认失败原因**

  覆盖同一周体能多次变化后保存最终值、非事件周保留并递减冷却、批量推进与逐周推进生成同样账本、返回仪表盘不能绕过待处理事件，以及当前所有 CareerSave 夹具通过 Schema。每个测试必须对具体最终状态断言；禁止 `expect(true).toBe(true)` 或找不到样本也放行。

- [x] **1.2 移除未完成的毕业/合同扩张并恢复 v1 一致性**

  只撤销 `391b180` 引入且本切面不使用的合同、毕业、赛季末账本和必填上下文字段；不重写历史，不删除已完成青训功能。删除无法加载的未跟踪年龄实验测试。创建、青训选择、存档和所有测试夹具必须重新产生合法 v1 存档。

- [x] **1.3 实现唯一周结果投影并修复事件流程**

  `projectWeekResult` 使用 simulation 返回的最终状态或同键最后一次变化，而非 `.find()` 的第一次变化；每个自然周都递减冷却；批量推进逐周追加完整账本；事件页不允许清除视图后留下存档中的 `pendingEvent`，必须返回事件或完成选择。

- [x] **1.4 验证并提交稳定基线**

  运行：

  ```powershell
  pnpm test
  pnpm typecheck
  pnpm lint
  pnpm format:check
  pnpm build
  pnpm test:e2e
  ```

  所有命令必须通过。提交建议：`fix: restore a valid deterministic youth loop baseline`。

---

### 工作包 2：建立 v2 领域边界、内容数据和存档迁移

**可独立交付结果：** 能从经过校验的内容创建固定青训赛季 v2 存档；现有 v1 存档可以确定迁移；无效内容在启动前失败。

**文件：**

- 创建：`packages/contracts/src/youth-season.ts`
- 创建：`packages/contracts/src/health.ts`
- 创建：`packages/contracts/src/save-migration.ts`
- 修改：`packages/contracts/src/player.ts`
- 修改：`packages/contracts/src/event.ts`
- 修改：`packages/contracts/src/person.ts`
- 修改：`packages/contracts/src/career.ts`
- 修改：`packages/contracts/src/index.ts`
- 创建：`packages/content/src/academies.ts`
- 创建：`packages/content/src/youth-competitions.ts`
- 创建：`packages/content/src/person-archetypes.ts`
- 创建：`packages/content/src/validation/validate-content.ts`
- 修改：`packages/content/src/index.ts`
- 创建或修改：对应 contracts、content 测试
- 修改：`apps/web/src/persistence/local-storage-save.ts`
- 修改：`apps/web/tests/persistence/local-storage-save.test.ts`

**核心接口：**

```ts
export type MaturationPace = 'early' | 'normal' | 'late';

export interface PlayerDevelopmentProfile {
  attributePotential: PlayerAttributes;
  maturationPace: MaturationPace;
  professionalism: number;
  stability: number;
  pressureResistance: number;
  adaptability: number;
  injuryProneness: number;
}

export type PlayerCareerV2 = Omit<PlayerCareer, 'hiddenTraits'> & {
  development: PlayerDevelopmentProfile;
};

export interface TrainingPlan {
  focus: 'technical' | 'position' | 'physical' | 'tactical' | 'recovery';
  intensity: 'light' | 'normal' | 'intense';
  positionFocus: Position | null;
}

export interface InjuryStatus {
  id: string;
  kind: 'discomfort' | 'minor' | 'moderate' | 'severe';
  bodyArea: string;
  occurredWeek: string;
  expectedRecoveryWeeks: number;
  recoveredWeeks: number;
  recurrenceRisk: number;
}

export interface HealthState {
  fitness: number;
  fatigue: number;
  recentLoad: number;
  activeInjury: InjuryStatus | null;
  previousInjuries: InjuryStatus[];
}

export interface PlayerCurrentState {
  morale: number;
  form: number;
  confidence: number;
}

export interface ScheduledYouthFixture {
  id: string;
  weekKey: string;
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
  status: 'scheduled' | 'played';
  resultId: string | null;
}

export interface SquadMember {
  personId: string;
  primaryPosition: Position;
  currentAbility: number;
  form: number;
  fitness: number;
  developmentPriority: number;
}

export type FirstTeamStage =
  | 'none'
  | 'watchlist'
  | 'training-invite'
  | 'bench-list'
  | 'substitute-appearance'
  | 'starting-appearance';

export interface YouthAcademyProfile {
  id: string;
  name: string;
  regionId: string;
  facilityLevel: number;
  coachingLevel: number;
  competitionLevel: number;
  competitionIntensity: number;
  developmentStyle: string;
  firstTeamLevel: number;
  promotionTendency: number;
  relocationPressure: number;
}

export interface YouthCompetitionDefinition {
  id: string;
  name: string;
  participatingAcademyIds: string[];
  seasonStartMonth: number;
  seasonEndMonth: number;
  targetFixtureCount: { min: number; max: number };
}

export interface PersonArchetype {
  id: string;
  role: 'youth-coach' | 'assistant-coach' | 'teammate' | 'rival';
  personality: string;
  traitRanges: Record<string, { min: number; max: number }>;
}

export interface YouthSeasonState {
  id: string;
  startDate: string;
  endDate: string;
  currentDate: string;
  currentWeek: number;
  currentMonth: string;
  academyId: string;
  fixtures: ScheduledYouthFixture[];
  completed: boolean;
}

export interface YouthClubContext {
  squadMembers: SquadMember[];
  positionDepth: Record<Position, string[]>;
  playerRole: 'fringe' | 'rotation' | 'regular' | 'starter' | 'first-team-radar';
  coachEvaluation: number;
  firstTeamStage: FirstTeamStage;
}

export interface MonthlyAdvanceCursor {
  monthKey: string;
  nextWeekIndex: number;
  totalWeeks: number;
  status: 'idle' | 'advancing' | 'awaiting-decision' | 'report-ready';
}

export interface YouthStoryState {
  activeStorylines: string[];
  completedStoryIds: string[];
  cooldownsByEventId: Record<string, number>;
  pendingDelayedEffects: YouthDelayedEffect[];
}

export interface YouthDelayedEffect {
  id: string;
  sourceEventId: string;
  triggerWeekKey: string;
  effects: Record<string, number>;
  participantIds: string[];
}

export interface YouthContentBundle {
  academies: YouthAcademyProfile[];
  competitions: YouthCompetitionDefinition[];
  people: PersonArchetype[];
  events: EventDefinition[];
}

export interface CareerSaveV2 {
  schemaVersion: 2;
  contentVersion: string;
  careerId: string;
  player: PlayerCareerV2;
  season: YouthSeasonState;
  clubContext: YouthClubContext;
  health: HealthState;
  currentState: PlayerCurrentState;
  trainingPlan: TrainingPlan;
  relationships: RelationshipGraph;
  story: YouthStoryState;
  monthlyAdvance: MonthlyAdvanceCursor;
  ledger: CareerLedgerEntryV2[];
  randomState: RandomState;
}

export const migrateCareerSave = (raw: unknown): CareerSaveV2;
export const validateYouthContent = (content: YouthContentBundle): YouthContentBundle;
```

`YouthAcademyProfile` 必须包含设施、教练、竞争、风格、赛事层级、一线队层级、提拔倾向和异地压力；`YouthSeasonState` 必须包含固定赛程、位置深度、当前月、月内游标和完成状态；`InjuryStatus` 必须表达伤情、严重度、预计恢复周、已恢复周和复发风险。

- [x] **2.1 用契约测试锁定 v2 数据边界**

  测试分项潜力结构、成长节奏、伤病状态、固定赛程、关键人物、位置竞争、月度游标、事件参与者和 CareerSaveV2。验证 v2 不包含正式合同、转会、国家队和完整职业联赛字段。

- [x] **2.2 将机构、赛事、人物和事件引用移入 content 并校验**

  从 simulation 移除硬编码机构和对手名称。内容校验必须拒绝重复 ID、未知地区或机构引用、赛程冲突、越界评分、未知事件效果键、无条件重大事件、断裂故事链和真实俱乐部品牌词。

- [x] **2.3 实现 v1→v2 迁移及浏览器加载策略**

  迁移保留球员身份、属性、青训选择、随机种子和可解释账本；对 v1 无法推导的数据使用确定性默认值或基于原始种子的确定性生成。加载失败返回带原因的结果，不删除原始 localStorage 数据。保存前必须先通过 v2 Schema。

- [x] **2.4 验证并提交领域与内容基线**

  运行 contracts、content、persistence 聚焦测试及完整 `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`。提交建议：`feat: define validated youth season save v2`。

---

### 工作包 3：实现可信的周模拟、月度结算和固定比赛

**可独立交付结果：** 无需网页即可用固定种子完整模拟一个无决策青训赛季；成长、健康、赛程和比赛数据满足不变量。

**文件：**

- 创建：`packages/simulation/src/career/create-youth-season.ts`
- 创建：`packages/simulation/src/career/simulate-youth-week.ts`
- 创建：`packages/simulation/src/player-development/development.ts`
- 创建：`packages/simulation/src/health/injury-model.ts`
- 重写：`packages/simulation/src/match/youth-match.ts`
- 修改：`packages/simulation/src/match/match-engine.ts`
- 修改：`packages/simulation/src/index.ts`
- 创建：对应 simulation 测试和属性测试
- 创建：`packages/application/src/use-cases/update-training-plan.ts`
- 创建：`packages/application/src/use-cases/advance-career-month.ts`
- 修改：`packages/application/src/index.ts`
- 创建：对应 application 测试

**核心接口：**

```ts
export interface YouthWeekInput {
  player: PlayerCareerV2;
  season: YouthSeasonState;
  clubContext: YouthClubContext;
  health: HealthState;
  currentState: PlayerCurrentState;
  trainingPlan: TrainingPlan;
  relationships: RelationshipGraph;
  randomState: RandomState;
}

export interface YouthWeekTransition {
  nextPlayer: PlayerCareerV2;
  nextSeason: YouthSeasonState;
  nextClubContext: YouthClubContext;
  nextHealth: HealthState;
  nextCurrentState: PlayerCurrentState;
  facts: CareerLedgerEntryV2[];
  developmentAccrual: DevelopmentAccrual;
  nextRandomState: RandomState;
}

export type AttributeKey =
  | keyof TechnicalAttributes
  | keyof PhysicalAttributes
  | keyof MentalAttributes;

export type DevelopmentAccrual = Record<AttributeKey, number>;

export interface CareerLedgerEntryV2 {
  id: string;
  weekKey: string;
  type:
    | 'training'
    | 'match'
    | 'health'
    | 'event'
    | 'decision'
    | 'relationship'
    | 'first-team'
    | 'monthly-settlement'
    | 'season-outcome';
  summary: string;
  participantIds: string[];
}

export interface MonthlyReport {
  monthKey: string;
  facts: CareerLedgerEntryV2[];
  attributeChanges: AttributeChange[];
  stateSummary: PlayerCurrentState & Pick<HealthState, 'fitness' | 'fatigue'>;
  matchIds: string[];
}

export const simulateYouthWeek = (input: YouthWeekInput): YouthWeekTransition;

export type AdvanceMonthOutcome =
  | { status: 'awaiting-decision'; save: CareerSaveV2; event: EventInstance }
  | { status: 'month-complete'; save: CareerSaveV2; report: MonthlyReport }
  | { status: 'season-complete'; save: CareerSaveV2; report: MonthlyReport };
```

- [x] **3.1 先写模拟不变量和分布失败测试**

  覆盖固定赛程不重投、同种子一致、逐周与月度最终状态一致、属性只在月末结算、普通单项赛季增长通常 0–2、疲劳不会因短休完全清零、易伤与高疲劳提高伤病率、未出场无评分、玩家进球不超过本队进球、替补分钟合法，以及强队胜率高但弱队存在胜场。

- [x] **3.2 实现唯一周转移与月末成长/健康结算**

  周转移按固定顺序处理赛程、训练负荷、比赛、恢复、健康和发展积累，返回完整 next state；不得向 application 暴露需要再次归并的多条同键增量。月末按分项潜力、年龄、职业素养、环境、比赛时间和健康结算可见属性。

- [x] **3.3 重建固定球队比赛与个人数据归因**

  先用阵容、战术、状态、疲劳和主客场生成球队事件，再从本队事件分配玩家进球、助攻、评分和分钟。位置评价使用位置相关属性和比赛事实；对手来自固定赛程，不按场随机生成匿名实力。

- [x] **3.4 验证并提交无决策整季模拟**

  使用至少 100 个种子运行完整赛季聚焦测试，确认无非法状态、无限循环和日期偏移，再运行完整质量门禁。提交建议：`feat: simulate a consistent youth season by month`。

---

### 工作包 4：接入人物、条件事件、发展轨迹和有限一线队机会

**可独立交付结果：** 头部无界面流程可以处理中断事件、具体人物关系、动态发展信号、一线队阶梯和赛季结算。

**文件：**

- 创建：`packages/simulation/src/career/development-signals.ts`
- 创建：`packages/simulation/src/relationships/relationship-effects.ts`
- 创建：`packages/simulation/src/first-team/pathway.ts`
- 修改：`packages/simulation/src/events/event-selector.ts`
- 修改：`packages/simulation/src/career/event-integration.ts`
- 重写：`packages/content/src/events/youth-events.ts`
- 创建：`packages/application/src/use-cases/submit-career-decision.ts`
- 创建：`packages/application/src/use-cases/complete-youth-season.ts`
- 创建：`packages/application/src/use-cases/load-career.ts`
- 修改：`packages/application/src/index.ts`
- 移除或内联：`packages/application/src/use-cases/batch-advance.ts`
- 创建或修改：对应 content、simulation、application 测试

**核心接口：**

```ts
export type DevelopmentSignal =
  | 'rapid-development'
  | 'first-team-radar'
  | 'steady-progress'
  | 'stalled-development'
  | 'overtraining-risk'
  | 'injury-setback'
  | 'competition-pressure'
  | 'release-risk';

export interface YouthCareerSnapshot {
  player: PlayerCareerV2;
  season: YouthSeasonState;
  clubContext: YouthClubContext;
  health: HealthState;
  currentState: PlayerCurrentState;
  relationships: RelationshipGraph;
  recentFacts: CareerLedgerEntryV2[];
}

export interface FirstTeamPathwayResult {
  previousStage: FirstTeamStage;
  nextStage: FirstTeamStage;
  facts: CareerLedgerEntryV2[];
}

export const deriveDevelopmentSignals = (state: YouthCareerSnapshot): DevelopmentSignal[];
export const advanceFirstTeamPathway = (
  state: YouthCareerSnapshot,
  rng: SeededRandomSource,
): FirstTeamPathwayResult;
export const submitCareerDecision = (
  save: CareerSaveV2,
  eventId: string,
  choiceId: string,
): CareerSaveV2;
```

- [ ] **4.1 用因果测试锁定事件、关系和阶梯行为**

  验证媒体事件需要近期突出比赛，伤病选择需要真实伤情，位置竞争关联同位置人物，家庭、异地生活、学业与偶像事件需要对应人物或生涯事实，冷却按自然周生效，一项选择只影响参与人物，同一选择不能重复提交，一线队阶段不能跳级，单次坏表现不能触发淘汰，发展信号在状态改善后可以消失。

- [ ] **4.2 实现具体人物关系与条件事件队列**

  初始化主教练、助理教练、2–4 名关键队友和至少一名同位置竞争者。事件库同时覆盖教练、队友、竞争者、家庭、异地生活、学业、偶像、媒体、伤病和爆冷比赛后续；所有重大事件必须有事实前置条件。事件实例保存参与人物和事实引用；关系效果分别更新信任、尊重、亲近和具体记忆。月内允许连续多个事件，处理后从持久化的同一月游标继续，已经写入账本的周不得重复模拟。

- [ ] **4.3 实现动态信号、一线队阶梯和赛季结算**

  动态信号由当前快照派生，不写回永久路线标签。一线队机会严格按观察、跟训、名单、替补和极少首发推进。赛季结果从账本、比赛、健康、关系和信号生成；首季放弃必须由持续多项风险构成，并附带校园、低级青训或试训后续状态。年龄必须根据出生日期和当前日期派生或在跨越生日时准确更新，禁止以“赛季结束固定加一”代替日期规则。

- [ ] **4.4 验证并提交完整无界面生涯流程**

  使用固定选择策略模拟至少 100 个有事件赛季；验证可以暂停、选择、恢复、完成并重新加载。运行完整质量门禁。提交建议：`feat: add emergent youth pathways and season outcomes`。

---

### 工作包 5：完成网页闭环、批量平衡和最终验收

**可独立交付结果：** 玩家可以在桌面和手机完成整个青训赛季；1,000 赛季报告满足初始范围；路线图更新为已完成。

**文件：**

- 拆分：`apps/web/src/career-dashboard/CareerDashboard.tsx`
- 创建：目标文件结构中的 dashboard 子组件
- 修改：`apps/web/src/app/App.tsx`
- 修改：`apps/web/src/persistence/local-storage-save.ts`
- 修改：`apps/web/src/event-choice/EventChoicePanel.tsx`
- 创建或修改：对应 web 组件测试
- 重写：`apps/web/tests/e2e/bootstrap-career.spec.ts`
- 创建：`apps/web/tests/e2e/youth-season.spec.ts`
- 创建：`tools/balance/src/run-youth-seasons.ts`
- 创建：`tools/balance/src/youth-season-metrics.ts`
- 创建：`tools/balance/src/report-youth-balance.ts`
- 创建：`tools/balance/tests/youth-season-balance.test.ts`
- 修改：根目录及 balance `package.json` 脚本
- 创建：`AGENTS.md`
- 修改：`docs/ROADMAP.md`

**CLI 接口：**

```powershell
pnpm balance:youth --runs 1000 --seed-start 1 --output artifacts/youth-balance.json
```

报告至少包含比赛数、决策事件数、各属性成长、伤病严重度、缺席周数、出场身份、一线队阶段、放弃结果、比分、胜平负和不同故事组合数量。

- [ ] **5.1 先写真实用户流程测试并确认旧 UI 失败**

  组件和 E2E 覆盖创建、青训选择、训练持续设置、推进一个月、处理中途多个或零事件、查看月报、展开周记录、刷新恢复、继续同月、完成赛季、查看总结，以及损坏或 v1 存档恢复。桌面与移动端都必须实际推进，不只检查按钮存在。

- [ ] **5.2 拆分仪表盘并接入唯一月度用例**

  `CareerDashboard` 只组合子组件。移除玩家可见“推进一周”和“快进到下一事件”；提供“推进到下个月”、训练设置、队内身份、关系、时间线和月报。待处理事件不能被绕过；错误显示恢复操作而非只写控制台。

- [ ] **5.3 实现 1,000 赛季平衡工具并校准**

  工具复用 application 的月度推进和选择提交，用版本化确定性策略完成事件选择。初始校准范围为：所有赛季合法完成；每季 18–26 场；中位数 6–12 个决策事件；普通球员单项成长中位数 0–2，单项增长超过 3 的样本低于 10%；一线队观察名单约占 10%–25%，正式一线队出场约占 1%–5%；被当前机构放弃约占 1%–5%；严重伤病低于 3%；平均每场总进球 2.0–3.5，强弱差距明显时弱队仍有 5%–20% 的取胜样本。以上是首轮工程校准范围，不声称是真实统计结论；首次报告后可以在设计约束内调整。范围集中在平衡配置，报告超界时测试失败并打印样本数、中位数、分位数和极值。

- [ ] **5.4 完成最终质量门禁、文档和提交**

  运行：

  ```powershell
  pnpm test
  pnpm typecheck
  pnpm lint
  pnpm format:check
  pnpm build
  pnpm test:e2e
  pnpm balance:youth --runs 1000 --seed-start 1 --output artifacts/youth-balance.json
  pnpm audit --prod
  ```

  检查无生成产物、存档、报告或密钥被暂存。更新 `docs/ROADMAP.md` 的 M0–M4 状态和实际指标；`AGENTS.md` 明确代理只读取 `spec.md`、路线图、当前设计和当前计划。提交建议：`feat: complete the playable youth season vertical slice`。

## 完成定义

只有同时满足以下条件，当前垂直切面才算完成：

1. 玩家从创建球员推进至青训赛季总结。
2. 月度推进支持零个或多个事件，并能在刷新后继续同一个月。
3. 逐周调试、月度推进和批量模拟共享同一状态转移规则。
4. 训练、比赛、健康、关系和一线队机会产生可解释且内部一致的结果。
5. v1 存档可迁移或获得可恢复诊断，v2 存档严格校验。
6. 1,000 个赛季无崩溃、卡死或非法状态，并生成可审查分布。
7. 全部质量门禁通过。
8. `master` 保持可运行，不包含下一阶段毕业、合同、转会或国家队半成品。
