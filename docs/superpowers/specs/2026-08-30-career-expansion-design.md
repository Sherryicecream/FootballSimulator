# 生涯扩展设计：转会、海外、国家队与退役

> 状态：已获用户批准。
>
> 日期：2026-08-30
>
> 长期产品基准：`spec.md`（第 10 节转会合同、§生涯回顾承诺）
>
> 项目进度入口：`docs/ROADMAP.md`
>
> 前置：M6 职业队赛季已完成（`free-agent` 为本设计激活的起点，`retired` 为 MVP 终点）。

## 1. 目标

把职业期延展为完整生涯：自由球员转会与俱乐部流动、留洋海外、国家队征召、年龄巅峰与衰退，最终退役并生成生涯回顾。本里程碑完成 `spec.md` 的 MVP 终点——玩家从 16 岁青训一路推进到退役回顾，闭环整个生涯。

## 2. 范围

### 2.1 包含

- **自由球员转会**：拒绝续约或合同到期未续 → 自由球员；每个休赛期收到 2–4 份转会要约（复用兴趣评分与层级天花板模型）；签约后在新俱乐部开启职业赛季。
- **海外联赛**：新增海外虚构俱乐部集团（欧陆次级，层级 4–8）；留洋有适应成本（首季每周士气损耗，随适应力与年数衰减）与声望加成（+20%）。
- **国家队**：赛季结算时资格评估（年龄 ≤35、声望 ≥60、上季联赛出场 ≥15）→ 首次征召为决策事件 → 逐季累计 caps 与国际赛进球（抽象窗口制，不模拟完整国际赛程）。
- **年龄曲线与巅峰/衰退**：成长峰值 24–28；29 岁起身体属性开始年衰减（速度/体能最先，32 岁起力量跟进），精神属性缓升至 32 后持平。
- **退役与生涯回顾**：30 岁起休赛期提供退役选择；38 岁强制退役；退役后生成确定性生涯回顾（逐季履历、俱乐部史、国家队、累计数据、分级点评）。

### 2.2 不包含

- 转会费谈判、租借、买家俱乐部间的竞价过程。
- 国家队大赛（亚洲杯/世界杯）与完整国际比赛日赛程。
- 荣誉陈列室、教练模式、生涯结束后的名人堂。

## 3. 玩家流程

```text
pro-offseason（合同到期）
→ 拒绝续约 → free-agent（激活态）
→ 每个休赛期收到 2–4 份转会要约（含海外俱乐部）
→ 签约 → 新俱乐部 pro-season（循环）
每季结算 → 国家队资格评估 → 首征召事件 / caps 累计
30 岁+ → 休赛期出现退役选项 → 选择退役 → retired → 生涯回顾页（MVP 终点）
38 岁 → 强制退役
```

## 4. 生涯阶段机（v5 扩展）

- `free-agent` 从终态改为**激活态**：休赛期生成转会要约（复用 `offer-review` 面板形态），签约后进入新俱乐部 `pro-season`。
- 自由球员连续两个休赛期无签约（要约被全部拒绝）→ 转会要约层级天花板 −1（市场降温）；连续三个 → 提示退役选项。
- 新增终态 `retired`。
- 转移均经 application 用例校验。

## 5. 转会模型

- 要约池：复用 M5 俱乐部兴趣评分（能力/潜力/表现/适配/年龄/偏好 ± 噪声）+ 能力天花板；自由球员不再有保底要约——无合格要约时提示"市场冷淡"。
- 海外要约门槛：`adaptability ≥ 55` 才进入要约池；海外俱乐部薪资系数 ×1.4（税率补偿），声望获取 +20%。
- 已通过适应力门槛的球员在海外球探池获得一档发展容错；报价仍受兴趣评分和能力层级天花板约束，不构成无条件越级签约。
- 合同 2–3 年、队内角色与承诺按兴趣分重生成（与 M5 规则一致）。
- 每次转会写入 `clubHistory`（俱乐部、起止年、效力季数、出场、进球）。

## 6. 海外适应

- 留洋首季：每周士气 −(100 − adaptability)/25（适应力 60 → 每周 −1.6）；第二季减半；第三季起归零。
- 留洋声望加成：赛季结算声望增益 ×1.2。
- 海外经历写入生涯回顾（"留洋"标签）。

## 7. 国家队

- 资格（赛季结算时评估）：年龄 ≤35 且 `reputation ≥ 60` 且上季联赛出场 ≥15。
- 首次达标触发决策事件"国家队首秀征召"（接受：信心+3、疲劳+2；婉拒：信心−1）。
- 接受后逐季累计：`caps += 3~8`（按声望档位 60/70/80 → 3/5/8 为基准 ± 种子波动），国际赛进球按出场数的二项抽样（单场进球率 0.25）；每次结算声望 +1~3。
- 数据固化于存档 `nationalTeam`：{ capped, caps, goals, debutOn }。

## 8. 年龄曲线与退役

### 8.1 成长与衰退

- 周成长乘数（叠加现有系数）：`age ≤ 23 → 1.0`；`24–28 → 0.85`；`≥ 29 → 0.4`。
- 月度结算追加衰退：`age ≥ 30`：`pace`/`stamina`/`agility` 每季期望 −1.5（按月分摊，种子决定具体月份）；`age ≥ 32` 追加 `strength`；精神属性不衰退。
- 衰退写入月度结算摘要，可见属性直接下降（与成长同为账本事实）。

### 8.2 退役

- 30 岁起每个休赛期出现"宣布退役"选项；38 岁强制（结算自动进入退役）。
- 退役属永久性重大操作 → 一次简短确认。
- 退役后进入 `retired` 终态，生成生涯回顾。

### 8.3 青训年龄边界

- 19 岁是最后一个可完整参加的青训赛季；休赛期即使能力、表现或一线队认可未全部达标，也必须获得职业市场评估资格。
- 下一赛季开始时若将满 20 岁，阶段机禁止再次开启青训赛季；前端隐藏继续青训入口，并提供首份职业合同或自由市场路线。
- 年龄封顶不改变报价层级天花板：较弱球员仍可能只能收到低层级报价，拒绝最后窗口报价后进入自由球员市场。

## 9. 生涯回顾（spec.md 核心承诺）

- 纯确定性生成，数据源：`seasonHistory`（逐季）、`clubHistory`、`nationalTeam`、`totals`。
- 页面结构：生涯总览（赛季数/出场/进球/助攻/国家队）、逐季时间线、俱乐部履历、国家队数据、**生涯点评**。
- 点评分级（按终值声望 + caps + 累计出场）：传奇（≥80 或 caps ≥80）/ 世界级（≥70）/ 国脚级（≥60 或 caps ≥20）/ 稳健生涯（≥45）/ 平凡生涯（<45），各配一段专属点评文案。

## 10. 数据与存档（v5）

```ts
export const ClubHistoryEntrySchema = z.strictObject({
  clubId: IdSchema,
  clubName: z.string(),
  from: IsoDateSchema,
  to: IsoDateSchema.nullable(),
  seasons: z.number().int().min(1),
  appearances: z.number().int().min(0),
  goals: z.number().int().min(0),
});

export const NationalTeamSchema = z.strictObject({
  capped: z.boolean(),
  caps: z.number().int().min(0),
  goals: z.number().int().min(0),
  debutOn: IsoDateSchema.nullable(),
});

export const CareerTotalsSchema = z.strictObject({
  appearances: z.number().int().min(0),
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
  minutes: z.number().int().min(0),
});

export const CareerSaveV5Schema = CareerSaveV4Schema.omit({ schemaVersion: true }).extend({
  schemaVersion: z.literal(5),
  clubHistory: z.array(ClubHistoryEntrySchema).default([]),
  nationalTeam: NationalTeamSchema.nullable().default(null),
  totals: CareerTotalsSchema.default({ appearances: 0, goals: 0, assists: 0, minutes: 0 }),
  overseasSince: IsoDateSchema.nullable().default(null),
  freeAgentSeasons: z.number().int().min(0).default(0),
  retiredOn: IsoDateSchema.nullable().default(null),
});
```

- `CareerPhaseSchema` 增加 `retired`。
- 账本新增：`transfer-signed`、`national-debut`、`retirement`。
- 内容：新增 `overseasClubs`（12 家，层级 4–8，`overseas: true` 标记），并入 `YouthContentBundle`。
- v4→v5 迁移：默认值补齐；`free-agent` 存档保持激活语义。

## 11. 架构对接

- `simulation`：`age-curve.ts`（周成长乘数 + 月度衰退）、`transfer-offers.ts`（自由球员要约，复用兴趣评分）、`national-team.ts`（资格评估 + caps 抽样）、`career-review.ts`（回顾与点评生成）。
- `application`：`generate-transfer-offers`、`sign-transfer`、`retire`；国家队累计并入 `complete-professional-season`；`advance-pro-month` 接入海外适应与年龄曲线。
- `content`：海外俱乐部表与校验。
- `web`：转会要约面板（复用要约卡片）、国家队卡片（仪表盘）、退役确认、生涯回顾页。
- `tools/balance`：全生涯批量（毕业 → 职业期至退役，上限 20 季）：转会次数、留洋占比、caps 分布、退役年龄分布、回顾生成率。

## 12. 测试与平衡

必须验证：

- 同种子同操作下转会要约、国家队累计、衰退与回顾完全一致。
- 自由球员连续无签约 → 市场降温（天花板 −1）→ 三季后提示退役。
- 海外适应损耗随适应力与年数衰减；声望加成只在留洋期生效。
- 国家队资格不达标绝不征召；caps 累计与声望档位一致。
- 30+ 退役可选、38 强制；退役后回顾与实际账本一致（逐季可对账）。
- v4 存档可迁移；退役为终态，不可再推进。

批量校准范围（首轮工程校准，可依报告调整）：

- 全生涯批量（上限 20 季）无崩溃，回顾生成率 100%。
- 生涯长度中位 8–14 季；退役年龄中位 30–34。
- 生涯平均转会 0.5–2.5 次；留洋球员占比 10–30%（分母为已毕业职业球员）。
- 有国家队出场球员占比 25–50%；caps 中位 0–15（国家队占比按全部生成生涯统计，同时满足 `spec.md` 的成年 15–30% 基线）。
- 本轮 1,000 季实测：职业季数中位 12、平均转会 1.48、留洋 27.3%、国家队出场 25.6%、退役年龄中位 30、回顾生成率 100%。
- 衰退可见：34 岁球员身体属性均值低于 28 岁同位置球员（可统计验证）。

## 13. 工作包概览

1. **工作包 1：v5 存档、年龄曲线与自由球员转会**——契约/迁移、成长乘数与衰退、转会要约与签约用例、转会 UI、测试。
2. **工作包 2：海外与国家队**——海外俱乐部内容与适应、征召与 caps、国家队卡片 UI、测试。
3. **工作包 3：退役与生涯回顾 + 全生涯平衡**——退役流程、回顾生成、全生涯批量校准、文档收尾与完整门禁。

每个工作包完成时项目必须可运行、门禁全绿。
