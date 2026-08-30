# 职业队赛季设计

> 状态：已获用户批准。
>
> 日期：2026-08-30
>
> 长期产品基准：`spec.md`（尤其第 10 节"转会、合同与俱乐部"）
>
> 项目进度入口：`docs/ROADMAP.md`
>
> 前置：M5 青训毕业与合同已完成（`professional-contract` 阶段为本设计的起点）。

## 1. 目标

让签署首份职业合同的球员进入真实职业环境：在签约俱乐部度过完整的职业赛季，经历阵容竞争、有限的登场机会、合同承诺的兑现检验，以及职业级负荷下的健康管理。本里程碑把生涯从"青训出身"推进为"职业球员"，并为 M7（转会、国家队、退役）建立职业赛季的可复用循环。

## 2. 范围

### 2.1 包含

- 职业赛季循环：从 `professional-contract` 阶段开启首个职业赛季，按月推进、逐周结算，直至赛季结算与下季衔接。
- 职业阵容：签约俱乐部生成 18–22 人虚构阵容与位置深度图，阵容随赛季演化（能力、年龄、状态）。
- 队内竞争：训练表现、比赛评分、健康与教练信任共同决定登场身份（预备队主力 → 一线队替补 → 轮换 → 首发）。
- 职业比赛：联赛双循环赛程（按俱乐部层级 22–38 场）、联赛积分榜（复用现有积分榜模块）、比赛引擎复用（先定球队结果再归因个人数据）。
- 登场时间模型：按合同角色承诺、当前身份、状态、疲劳、伤病与教练信任决定首发/替补/预备队出场。
- 赛季结算与承诺对照：出场份额 vs 合同承诺（`kept`/`broken`），俱乐部原因与球员原因（伤病）区分归因，后果写入信任与声望。
- 健康管理：职业负荷高于青训，医疗条件按俱乐部层级影响恢复速度；复发风险跨季延续。
- 合同年限管理：剩余年限递减；到期赛季结束时提供同俱乐部续约要约（单一选择），拒绝则进入自由球员状态（M7 转会起点）。
- 批量平衡：职业期 3 连季批量模拟与承诺兑现、出场份额、首发率分布校准。

### 2.2 不包含

- 转会市场与其他俱乐部要约（M7）。
- 租借、海外联赛、国家队。
- 杯赛、洲际比赛与多线作战。
- 荣誉系统、金球奖、生涯回顾与退役。
- 经纪人续约谈判的回合制讨价还价（续约为单一要约选择）。

## 3. 玩家流程

```text
签署职业合同（M5 终态）
→ 确认开启职业赛季（季前简报：阵容、角色、赛程概况）
→ 职业赛季月度循环（训练/比赛/事件，与青训相同的月报节奏）
→ 赛季结束 → 职业赛季总结
→ 合同承诺对照报告（kept / broken + 归因）
→ 分支 A（合同仍有年限）：休整 → 下个职业赛季
→ 分支 B（合同到期）：同俱乐部续约要约 → 接受 → 下个赛季
                                        → 拒绝 → 自由球员状态（M7 起点，本里程碑终态）
```

玩家节奏仍为月度推进、内部逐周结算；事件系统复用现有职业化过滤（事件内容按 `category` 与条件区分职业阶段）。

## 4. 生涯阶段机（v4 扩展）

```text
professional-contract（M5 终点）
  → start-professional-season → pro-season
pro-season
  → 完成赛季 → complete-professional-season → pro-offseason
pro-offseason
  → 合同剩余年限 > 0 → start-professional-season → pro-season
  → 合同到期 → 接受续约要约 → start-professional-season（新合同）
             → 拒绝续约 → free-agent（M7 起点，终态）
```

- 新阶段值：`pro-season`、`pro-offseason`、`free-agent` 加入 `CareerPhaseSchema`。
- 每次转移是独立 application 用例并校验当前阶段；web 不自行改写阶段。
- 青训阶段机（`youth-season`/`offseason`/…）保持不变；两者共存于同一存档。

## 5. 职业赛季模型

### 5.1 赛程与积分榜

- 联赛成员：签约俱乐部所在层级的全部俱乐部（`clubs.ts` 按层级分组，同层 8–12 家；不足时由内容校验补齐同层级俱乐部）。
- 赛程：双循环（主客各一次），规模 = 2 × (n−1)；层级 5–8 联赛 22–30 场。生成后立即固定写入存档（与青训同纪律）。
- 积分榜：复用 `createLeagueStandings`/`updateStandings`/`getStandings`，每周全部场次（其他俱乐部间比赛）确定性模拟并更新，写入存档。
- 赛季周期：8 月至次年 5 月（职业赛季比青训赛季长一个月，季前 8 月为集训期，只训练不打联赛）。

### 5.2 职业阵容

- 阵容生成：18–22 人，覆盖全部 6 个位置，能力均值按俱乐部层级（`tier×8 + 20` ± 波动），含 2–3 名与玩家同位置的直接竞争者。
- 阵容成员含：ID、姓名（虚构）、位置、能力、年龄、状态、疲劳、出场身份。存档固化，随赛季演化（能力小幅漂移、年龄 +1）。
- 深度图：按位置 × 能力排序；玩家初始排位由合同角色决定：`youth-team` → 深度图末位；`rotation` → 中游；`first-team-rotation` → 首发边缘；`highlighted-prospect` → 中游且培养优先级高。

### 5.3 登场时间模型

每周按固定顺序决定球员出场身份：

```text
首发资格分 = 教练信任 × 0.35 + 当前状态 × 0.20 + 体能 × 0.15
           + 深度图排位分 × 0.20 + 训练表现 × 0.10
身份阈值（首发资格分）：首发 ≥ 62；替补 ≥ 45；否则预备队出场
```

- 合同承诺修正：承诺 `≥50%` 出场的球员阈值 −6（俱乐部须给机会）；承诺 `≥30%` 阈值 −3。
- 疲劳与伤病硬门槛：伤病未愈不得出场；疲劳 ≥80 时首发资格分 −10。
- 出场分钟：首发 60–90，替补 10–35，预备队 60–90（预备队不计入合同承诺的份额）。
- 俱乐部竞争是客观的：同位置竞争者能力高出玩家 8 分以上时，首发阈值 +8（不因玩家是主角而放水）。

### 5.4 训练与成长

- 复用青训训练计划（重点/强度持续生效）与月末成长结算；年龄曲线进入职业段（18–23 岁身体属性仍有成长空间，精神属性按经验增长）。
- 训练表现分（0–100）每周生成，作为登场模型的输入之一，同时驱动"训练表现好 → 教练信任 +"的反馈。

### 5.5 健康管理

- 复用伤病模型；职业负荷系数 × 1.15（比赛节奏更快）。
- 医疗条件：俱乐部层级 ≥6 的俱乐部恢复速度 +20%（`expectedRecoveryWeeks` 结算时按比例折减）。
- 严重伤病在职业期允许发生（不再受首赛季青训的低概率保护），但仍由持续负荷与倾向决定，不由单次随机决定。

## 6. 赛季结算与承诺对照

### 6.1 出场份额

```text
出场份额 = 一线队出场分钟 / (联赛已赛场次 × 90)
```

- 联赛已赛 = 赛程中 `played` 的场次；预备队出场不计入分子。
- 承诺对照在赛季结算时执行一次：份额 ≥ 承诺 → `kept`；否则 `broken`。

### 6.2 归因与后果

| 情形                        | 判定       | 后果                                                                 |
| --------------------------- | ---------- | -------------------------------------------------------------------- |
| 伤病缺席 ≥ 联赛场次的 25%   | 球员原因   | 信任 −3、声望 −2、承诺标记 `broken`（球员原因）                      |
| 份额不足但健康且训练分 ≥ 65 | 俱乐部原因 | 信任 −5（对俱乐部管理层）、声望不变、承诺标记 `broken`（俱乐部原因） |
| 份额不足且训练分 < 65       | 球员原因   | 信任 −4、声望 −1                                                     |
| 份额达标                    | —          | 信任 +5、声望 +3、承诺标记 `kept`                                    |

- 承诺后果写入账本（`promise-review` 事实）并更新合同状态；连续两个赛季 `broken`（俱乐部原因）使下赛季登场阈值 −4（俱乐部补偿）。
- 球员原因连续两个赛季 `broken`：续约要约薪资 −20%（俱乐部信心下降）。

### 6.3 角色与续约

- 赛季结算同时评估队内角色：份额 ≥50% → 首发；≥30% → 轮换；≥10% → 替补；否则预备队。角色写入阵容深度图排位。
- 合同剩余年限在每次赛季结算后 −1。
- 到期续约要约：同俱乐部单一要约，期限 2–3 年，薪资按上季表现与层级重新计算（±15%），承诺按新角色生成；接受 → 新合同写入存档；拒绝 → `free-agent` 终态。

## 7. 数据与存档（v4）

在 `CareerSaveV3Schema` 基础上扩展为 `CareerSaveV4Schema`：

```ts
export const ProSquadMemberSchema = z.strictObject({
  personId: IdSchema,
  name: z.string().min(1).max(50),
  primaryPosition: PositionSchema,
  currentAbility: ScoreSchema,
  age: z.number().int().min(15).max(45),
  form: ScoreSchema,
  fitness: ScoreSchema,
  minutesPlayed: z.number().int().min(0).default(0),
});

export const ProSeasonStateSchema = z.strictObject({
  id: IdSchema,
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
  currentDate: IsoDateSchema,
  currentWeek: z.number().int().min(1).max(60),
  currentMonth: z.string().regex(/^\d{4}-\d{2}$/),
  clubId: IdSchema,
  competitionId: IdSchema,
  fixtures: z.array(ProFixtureSchema),          // 复用赛程结构，新增参赛双方为俱乐部 ID
  standings: z.array(LeagueStandingSchema),
  squad: z.array(ProSquadMemberSchema).min(18).max(22),
  depthChart: z.record(PositionSchema, z.array(IdSchema)),
  completed: z.boolean(),
});

export const PromiseReviewSchema = z.strictObject({
  seasonId: IdSchema,
  share: z.number().min(0).max(1),
  promisedShare: z.number().min(0).max(1),
  status: z.enum(['kept', 'broken']),
  cause: z.enum(['none', 'injury', 'club', 'player']),
  evaluatedOn: IsoDateSchema,
});

export const ProSeasonStatsSchema = z.strictObject({
  leagueAppearances: z.number().int().min(0).default(0),
  reserveAppearances: z.number().int().min(0).default(0),
  minutes: z.number().int().min(0).default(0),
  goals: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  ratingSum: z.number().min(0).default(0),
  ratingCount: z.number().int().min(0).default(0),
});

export const CareerSaveV4Schema = CareerSaveV3Schema.omit({ schemaVersion: true }).extend({
  schemaVersion: z.literal(4),
  proSeason: ProSeasonStateSchema.nullable().default(null),
  proSeasonStats: ProSeasonStatsSchema.default({ ... }),
  promiseReviews: z.array(PromiseReviewSchema).default([]),
  proPhase: z.enum(['preseason', 'league', 'settled']).default('preseason'),
});

export const migrateCareerSaveV4 = (raw: unknown): CareerSaveV4;
```

- v3→v4 迁移：默认值补齐；`professional-contract` 阶段存档保持原状（等待玩家开启职业赛季）。v1/v2 经既有链路升入。
- 账本新增条目类型：`pro-match`、`promise-review`（已存在）、`renewal-offer`、`renewal-signed`。
- 内容扩展：`clubs.ts` 补充至每层级 ≥8 家俱乐部（层级 3–8 共 ≥40 家），保证同层级联赛规模；校验新增"同层级俱乐部数量 ≥8"。

## 8. 架构对接

- `contracts`：v4 存档边界、职业赛季/阵容/承诺 Schema、迁移。
- `content`：俱乐部表扩充与层级校验。
- `simulation`：`pro-squad.ts`（阵容与深度图生成/演化）、`professional-week.ts`（职业周转移：训练负荷、登场决策、比赛、健康、发展积累——组合复用现有训练/伤病/比赛引擎，不复制实现）、`league-fixtures.ts`（双循环赛程）、`promise-review.ts`（份额计算与归因）。
- `application`：`start-professional-season`、`advance-pro-month`（复用月度推进骨架与事件系统）、`complete-professional-season`、`accept-renewal`、`decline-renewal`；`projectWeekResult` 类投影扩展为职业版单点投影。
- `web`：职业仪表盘（阵容深度图、积分榜、合同卡复用、月报复用）、季前简报、赛季总结 + 承诺对照报告、续约选择页；App 阶段路由扩展。
- `tools/balance`：职业期批量（签约后 3 季）——承诺兑现率、出场份额分布、首发率、伤病率、续约接受率、自由球员率。

## 9. 测试与平衡

必须验证：

- 同种子同操作下阵容、赛程、积分榜、登场决策与承诺对照完全一致；月度、逐周与批量共享同一职业周转移。
- 登场模型尊重合同承诺（承诺 ≥50% 的健康球员份额不因随机而长期为 0）。
- 承诺对照归因正确：伤病缺席高的赛季标记球员原因；健康且训练好但无机会标记俱乐部原因。
- 阵容竞争客观：同位置强竞争者压低登场，不因主角身份放水。
- 合同年限递减、到期续约或转自由球员的分支正确；续约要约受历史 `broken` 影响。
- v3 存档可迁移；迁移后可继续开启职业赛季。
- 积分榜与比赛结果一致（每场比赛都被计入积分榜，无重复计分）。

批量平衡初始校准范围（首轮工程校准，可依报告调整）：

- 签约后 3 季批量无非法状态或卡死，完成率 100%。
- 承诺 `kept` 率约 55%–80%；俱乐部原因 `broken` 约 10%–25%。
- 角色晋升合理：3 季内达到"首发"身份的比例约 15%–40%。
- 场均一线队出场分钟中位数约 25–55；预备队出场随角色下降而上升。
- 严重伤病率高于青训期但可控（<4%/季）；俱乐部层级 ≥6 时恢复更快可验证。

## 10. 工作包概览

1. **工作包 1：v4 存档、职业赛季初始化与月度循环**
   v4 契约与迁移、俱乐部内容扩充、阵容与赛程生成、积分榜接入、职业周转移骨架、`start-professional-season` 与月度推进、季前简报 UI、测试。
2. **工作包 2：登场模型、阵容竞争与职业 UI**
   登场身份/分钟模型、阵容演化、训练表现反馈、职业仪表盘（深度图/积分榜/月报）、组件与 E2E 测试。
3. **工作包 3：赛季结算、承诺对照、续约与平衡验收**
   份额计算与归因、后果与续约要约、续约 UI、职业期批量模拟与校准、文档更新与完整门禁。

每个工作包完成时项目必须可运行、门禁全绿。
