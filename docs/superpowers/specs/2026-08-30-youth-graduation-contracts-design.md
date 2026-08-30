# 青训毕业与首份职业合同设计

> 状态：已获用户批准。
>
> 日期：2026-08-30
>
> 长期产品基准：`spec.md`（尤其第 10 节"转会、合同与俱乐部"）
>
> 项目进度入口：`docs/ROADMAP.md`

## 1. 目标

在已验收的青训赛季垂直切面（M0–M4）之上，实现赛季结束后的连续生涯循环：玩家从赛季总结进入休赛期，续留青训体系开始下个赛季，或在满足条件时从多个真实要约中签署人生第一份职业合同。本里程碑把"单个赛季"扩展为"可连续推进的青训生涯"，并首次引入合同承诺与违背后果，为 M6 职业队赛季建立合同边界。

## 2. 范围

### 2.1 包含

- 休赛期阶段：赛季总结后的过场结算（年龄按出生日期增长、属性赛季间沉淀、关系与声望延续）。
- 连续多个青训赛季：留队球员进入下赛季，赛程与阵容按新赛季重新生成，历史账本保留。
- 毕业资格判定：基于年龄、当前能力、发展信号、一线队阶段和教练评价的多年份累积判断，不做单次随机毕业。
- 合同要约生成：按 `spec.md` 第 10 节的俱乐部兴趣因素生成 2–4 份要约，玩家只能在实际出现的报价中选择。
- 合同签署与履行：合同只模拟期限、薪资、队内角色、关键承诺和必要解约条件；签署属永久性重大操作，需一次简短确认。
- 承诺后果：俱乐部违背出场承诺、玩家拒绝续约或主动推动转会产生关系和声望后果。
- 经纪人：玩家表达联赛、出场和薪资倾向，倾向影响要约池构成，不保证结果。
- 被放弃玩家的补救路线推进：校园、低级青训、试训路线可再次进入青训循环。

### 2.2 不包含

- 完整职业联赛、职业队赛季和正式转会市场（M6+）。
- 租借、解约金实际支付、合同谈判回合制讨价还价。
- 国家队、海外联赛、声望的完整计算（仅引入声望的雏形变量）。
- 退役与生涯回顾。

## 3. 玩家流程

```text
赛季总结（现有）
→ 确认进入休赛期
→ 系统结算：年龄、属性沉淀、关系延续、毕业资格评估
→ 分支 A（留队续约培养）：休赛期简报 → 新赛季开始 → 回到月度循环
→ 分支 B（获得毕业资格）：经纪人设定倾向 → 收到 2–4 份要约 → 比较并选择 →
   简短确认 → 签署职业合同 → 赛季总结记录毕业结局（进入 M6 起点）
→ 分支 C（被放弃）：从补救路线中重新选择 → 回到月度循环（新机构）
```

玩家节奏仍为月度推进；休赛期不逐周模拟，只做一次结算与少量决策。

## 4. 生涯阶段机（v3 核心状态）

```text
youth-season（青训赛季中）
  → completeYouthSeason（现有）→ offseason（休赛期）
offseason
  → evaluateOffseason 结算后：
     ├─ 未获毕业资格 → start-next-season → youth-season（下个赛季）
     ├─ 获得毕业资格且玩家选择谋求签约 → agent-preferences → offer-review
     └─ 被放弃且选择补救路线 → 选择新机构 → youth-season（新机构下个赛季）
offer-review
  → 签署一份要约（确认后）→ professional-contract（M6 起点，本里程碑终态）
  → 拒绝全部要约 → start-next-season → youth-season
```

阶段保存在存档顶层 `careerPhase` 字段，每次转移是独立用例，转移前校验当前阶段，非法转移直接报错。

## 5. 休赛期结算（`evaluateOffseason`）

纯确定性函数，输入存档快照与种子随机源，输出结算结果与下一阶段建议。结算内容按固定顺序：

1. **健康清算**：轻微不适与小伤全部痊愈；中等伤病恢复期跨季则剩余周数折半带入新赛季；严重伤病痊愈但复发风险 +5。
2. **体能重置**：`fitness` 重置为 88–96（由种子决定），`fatigue` 清零，`recentLoad` 清零。
3. **属性沉淀**：休赛期不产生训练成长，但身体属性按年龄曲线有微小自然演变：17–20 岁 `pace`/`stamina` 有 60% 概率 +0 或 +1（早熟 +10% 概率修正），26 岁后开始衰减（本里程碑玩家最大 19 岁，衰减代码保留但不会触发）。精神属性不变。单项变化写入账本（`season-outcome` 类型的沉淀摘要）。
4. **年龄更新**：`player.age = deriveAge(dateOfBirth, 新赛季开始日期)`（复用现有函数，跨生日自动 +1）。
5. **声望雏形**：`reputation` 按赛季表现调整：场均评分 ≥7.2 +3，≥6.8 +1，<6.0 −2；一线队正式出场每次额外 +2；赛季进球 + 助攻 ≥8 额外 +2。范围钳制 0–100。
6. **发展信号归档**：当期信号存入该赛季的 `SeasonHistorySummary`。
7. **毕业资格评估**（见第 6 节）。

结算结果生成一份休赛期简报（纯展示数据，不入账本重复条目），网页在休赛期页面展示。

## 6. 毕业资格与留队判定

### 6.1 毕业资格（全部为持续性指标，同时满足才进入 offer-review）

| 条件        | 阈值                                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 年龄        | `deriveAge` 结果 ≥17 且 ≤19（>19 岁仍未毕业的玩家在结算中获得"建议毕业"提示并降低资格门槛 2 点能力值，但不会强制毕业）                  |
| 当前能力    | 16 项可见属性按位置权重加权后 ≥ 俱乐部层级门槛（`42 + competitionLevel × 0.34`，即随机构赛事级别缩放的签约线）                          |
| 发展信号    | 本赛季信号包含 `rapid-development`、`steady-progress`、`first-team-radar` 之一，且无 `stalled-development` 与 `injury-setback` 同时存在 |
| 一线队/教练 | `firstTeamStage ≥ watchlist` 或 `coachEvaluation ≥ 65`                                                                                  |

连续两个休赛期达标但玩家均拒绝全部要约，第三期门槛中的能力线 −4（"再不签约，兴趣会降温"）。该计数存入存档 `graduationPressure`。

### 6.2 留队（分支 A）

未达标或主动留下的玩家调用 `startNextSeason`：生成新赛季（赛季 ID 递增、日期 +1 年、`createFixtures` 重新生成赛程）、阵容年龄与能力小幅演化、教练评价回归均值 55–65、故事冷却清零、关系与人物记忆保留。留队可以连续任意多年。

### 6.3 被放弃重入（分支 C）

`released` 玩家在休赛期选择补救路线（校园足球、低级青训、其他机构试训），选择结果映射到新的 `academyId`（content 提供每条路线的候选机构），随后同样调用 `startNextSeason` 但更换机构与赛事。能力门槛按新机构 `competitionLevel` 重新计算。

## 7. 经纪人与合同要约

### 7.1 经纪人倾向（玩家输入，进入 offer-review 前设置一次）

```text
联赛层级偏好: high | balanced | low        （影响要约俱乐部层级分布）
优先诉求:     playing-time | salary | development
```

倾向存入存档，只影响要约池构成，不改变俱乐部兴趣评分本身。

### 7.2 俱乐部兴趣评分（对每个候选俱乐部计算）

```
interest = 0.30 × abilityScore          （位置加权当前能力 / 100）
         + 0.20 × potentialScore        （发展档案模糊档位 / 100）
         + 0.15 × performanceScore      （上赛季场均评分与出场率）
         + 0.15 × fitScore              （位置需求稀缺度 × 战术适配）
         + 0.10 × ageScore              （年龄对位置的曲线）
         + 0.10 × preferenceScore       （经纪人倾向匹配度）
         ± 种子噪声（±0.05，可复现）
```

`interest ≥ 0.45` 且俱乐部层级不超过球员能力天花板（`floor((加权能力 − 10) / 10)`，位置高度契合时五成概率上调一档）的俱乐部进入要约池；池中按 `interest` 排序取 2–4 份（种子决定数量）；不足 2 份时插入 1 份低层级保底要约（层级 ≤4）。候选俱乐部来自 `packages/content` 的虚构俱乐部表（≥12 家，层级 3–8，含位置需求与青训周期标注），启动前经内容校验。

### 7.3 要约内容（每份）

| 字段       | 规则                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| 俱乐部身份 | ID、名称、层级（青训出身首轮 4–7 档为主）                                                                |
| 期限       | 1–3 年：interest 高 → 2–3 年，低 → 1 年                                                                  |
| 薪资       | `base = tier×tier×40 + abilityScore×120`，× 表现系数（0.8–1.3），按层级货币档位取整                      |
| 队内角色   | `youth-team` / `rotation` / `first-team-rotation` / `highlighted-prospect`，由 interest 与 ageScore 决定 |
| 关键承诺   | 出场承诺（`≥50%` 或 `≥30%` 出场时间）或位置承诺，最多其一；interest 越高承诺越少                         |
| 解约条件   | 层级 ≥6 的俱乐部附带降级解约条款（文本）                                                                 |

要约之间差异必须真实：高层级高薪低承诺，低层级低薪高承诺。玩家可选择一份（进入签署确认）或拒绝全部（回分支 A）。

### 7.4 签署与后果

- 签署需一次简短确认（页面二次确认控件），写入存档 `contract`，`careerPhase = professional-contract`，账本追加 `contract-signed` 事实。
- 承诺记录于合同状态；本里程碑在玩家签署后若继续推进（仅批量模拟做此推进），按下赛季对照出场率检查承诺：达成 → 信任 +；违背 → 信任 −、声望雏形 −，写入账本。俱乐部单方面违背（阵容竞争客观导致）与球员导致（伤病缺席）区分归因。
- 玩家拒签某份要约不影响全局；拒签全部要约 → `graduationPressure +1`。

## 8. 数据与存档（v3）

在 `CareerSaveV2Schema` 基础上扩展为 `CareerSaveV3Schema`：

```ts
export const CareerPhaseSchema = z.enum([
  'youth-season',
  'offseason',
  'agent-preferences',
  'offer-review',
  'professional-contract',
]);

export const ContractOfferV3Schema = z.strictObject({
  id: IdSchema,
  clubId: IdSchema,
  clubName: z.string().min(1).max(80),
  clubTier: z.number().int().min(1).max(10),
  salaryPerYear: z.number().int().min(0),
  contractYears: z.number().int().min(1).max(3),
  squadRole: z.enum(['youth-team', 'rotation', 'first-team-rotation', 'highlighted-prospect']),
  promise: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('playing-time'), minimumShare: z.number().min(0).max(1) }),
    z.strictObject({ kind: z.literal('position-guarantee') }),
    z.strictObject({ kind: z.literal('none') }),
  ]),
  releaseClauseNote: z.string().max(200),
});

export const SignedContractSchema = ContractOfferV3Schema.extend({
  signedOn: IsoDateSchema,
  seasonsCompleted: z.number().int().min(0).default(0),
  promiseStatus: z.enum(['pending', 'kept', 'broken']).default('pending'),
});

export const SeasonHistorySummarySchema = z.strictObject({
  seasonId: IdSchema,
  age: z.number().int().min(14).max(50),
  status: z.enum(['retained', 'released', 'graduated']),
  appearances: z.number().int().min(0),
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
  avgRating: z.number().min(0).max(10).nullable(),
  signals: z.array(z.string()),
  endedOn: IsoDateSchema,
});

export const OffseasonStateSchema = z.strictObject({
  briefing: z.strictObject({
    healthClearance: z.string().min(1).max(200),
    attributeDrift: z.array(AttributeChangeSchema), // 复用现有结构
    reputationChange: z.number().int().min(-20).max(20),
    ageUpdate: z.strictObject({ from: z.number().int(), to: z.number().int() }),
  }),
  graduationEligible: z.boolean(),
  eligibilityReport: z.array(z.strictObject({ criterion: z.string().min(1), met: z.boolean() })),
  rejectedOfferSeasons: z.number().int().min(0).max(3),
});

export const AgentPreferencesSchema = z.strictObject({
  leagueTierBias: z.enum(['high', 'balanced', 'low']),
  priority: z.enum(['playing-time', 'salary', 'development']),
});

// CareerSaveV3 = CareerSaveV2 字段 + 以下字段
export const CareerSaveV3Schema = CareerSaveV2Schema.omit({ schemaVersion: true }).extend({
  schemaVersion: z.literal(3),
  careerPhase: CareerPhaseSchema,
  contract: SignedContractSchema.nullable(),
  pendingOffers: z.array(ContractOfferV3Schema).min(0).max(4),
  agentPreferences: AgentPreferencesSchema.nullable(),
  offseason: OffseasonStateSchema.nullable(),
  seasonHistory: z.array(SeasonHistorySummarySchema),
  graduationPressure: z.number().int().min(0).max(3).default(0),
});
```

- v2→v3 迁移（确定性默认值）：`careerPhase = 'youth-season'`、`contract = null`、`pendingOffers = []`、`agentPreferences = null`、`offseason = null`、`seasonHistory = []`、`graduationPressure = 0`；其余字段原样保留。v1 存档走既有 v1→v2 再接 v2→v3。迁移失败保留原始数据并返回诊断。
- 账本新增条目类型：`offseason-settlement`、`contract-signed`、`promise-review`（加入 `CareerLedgerEntryV2Schema.type` 联合）。
- 内容扩展：`packages/content` 新增虚构俱乐部表（`clubs.ts`，≥12 家，层级 3–8、地区、位置需求、青训周期）与经纪人原型（`agent-archetypes.ts`），并入 `YouthContentBundle` 校验（ID 唯一、引用合法、层级范围、无真实品牌词）。

## 9. 架构对接

- `contracts`：v3 存档边界、合同与要约 Schema、迁移（本设计第 8 节）。
- `content`：俱乐部表、经纪人原型、校验规则扩展。
- `simulation`：`evaluate-offseason.ts`（休赛期结算）、`graduation.ts`（资格评估）、`offer-generation.ts`（兴趣评分与要约生成）——全部纯确定性函数，输入存档快照与种子随机源。
- `application`：`enter-offseason`、`submit-agent-preferences`、`generate-offers`、`sign-contract`、`reject-offers`、`start-next-season` 用例；全部通过阶段机校验转移合法性；复用唯一周模拟入口，不新增第二套状态归并。
- `web`：`OffseasonBriefing.tsx`（休赛期简报 + 资格报告）、`AgentPreferencesForm.tsx`、`OfferComparisonPanel.tsx`（要约对比 + 拒绝全部）、签署二次确认、`ContractCard.tsx`（仪表盘合同信息卡）；App 按阶段机路由。
- `tools/balance`：批量模拟扩展为每种子连续 3 个赛季，统计毕业率、首合同质量分布、承诺达成率。

## 10. 测试与平衡

必须验证：

- 年龄由出生日期派生，跨生日准确更新，不以"赛季结束固定加一"代替。
- 同种子同操作下休赛期结算、要约生成与签署结果完全一致；逐周、月度与批量复用同一规则。
- 毕业资格不由单次随机决定；未达标玩家永远无法收到要约；资格报告逐条列出满足与否。
- 拒绝全部要约可安全回到青训循环并再次评估；连续拒绝提升压力计数且能力门槛下降。
- v2 存档可迁移，迁移后可继续推进休赛期；损坏存档给出诊断不静默删除。
- 承诺违背后果只影响参与俱乐部与人物；达成与违背可归因区分。
- 阶段机非法转移全部被拒绝（如青训赛季中直接签署合同）。

批量平衡初始校准范围（首轮工程校准，可依报告调整）：

- 连续 3 个赛季模拟无非法状态或卡死，完成率 100%。
- 18 岁前毕业率低于 15%；3 个赛季内累计毕业率约 30%–60%。
- 首份合同俱乐部层级与玩家能力/表现正相关（报告给出分档均值）。
- 承诺类型分布不集中于单一选项（每类 ≥10%）；拒绝全部要约的比例约 10%–25%。

## 11. 工作包概览

1. **工作包 1：休赛期与连续赛季**
   创建 v3 存档契约与 v2→v3 迁移、休赛期结算、`startNextSeason`、被放弃路线重入、阶段机骨架、对应 UI（休赛期简报、新机构选择）与测试。
2. **工作包 2：毕业、经纪人与合同**
   毕业资格评估、俱乐部内容与校验、经纪人倾向、要约生成、签署与承诺记录、对应 UI（经纪人表单、要约对比、签署确认、合同卡）与 E2E。
3. **工作包 3：平衡验收与文档**
   3 赛季批量模拟扩展、指标校准、完整质量门禁、ROADMAP/AGENTS 更新。

每个工作包完成时项目必须可运行、门禁全绿，使用逻辑完整的少量提交。
