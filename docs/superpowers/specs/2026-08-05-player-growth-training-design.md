# 足球生涯模拟器 — 球员成长与训练系统设计

> **已被取代：** 本文仅保留为历史参考。当前成长、训练和伤病设计以 `2026-08-07-youth-season-vertical-slice-design.md` 为准，不得继续依据本文实施。

## 1. 概述

本文档描述如何在现有训练模拟基础上，实现玩家可控的训练系统，包括训练重点选择、强度控制，以及加练带来的受伤风险。

## 2. 当前状态

现有 `simulateTraining()` 内部随机选择训练重点（基于位置），无玩家参与，无强度控制。属性增长完全由 `growthModifier = (professionalism/100) * (potential/100)` 决定。

```
推进一周 → 生成活动 → [训练周] → 随机选重点 → 模拟训练 → 应用变化 → 显示结果
                                                                    ↑
                                                         玩家无法干预
```

## 3. 设计目标

- 玩家可随时调整训练重点（位置相关选项 + "自动"）
- 玩家可控制训练强度（轻量/普通/加练）
- 强度影响成长率、疲劳积累、体能消耗
- 加练引入小概率受伤风险
- 与现有架构无缝集成，最小化重构

## 4. 架构变更

### 4.1 契约层

在 `packages/contracts/src/career.ts` 中：

```typescript
// 新增：训练强度枚举
export const TrainingIntensitySchema = z.enum(['light', 'normal', 'intense']);
export type TrainingIntensity = z.infer<typeof TrainingIntensitySchema>;

// 扩展 CareerContextSchema
export const CareerContextSchema = z.object({
  academyId: z.string().nullable(),
  pendingOpportunity: YouthOpportunitySchema.nullable(),
  playerState: PlayerStateSchema,
  pendingEvent: EventInstanceSchema.nullable(),
  trainingFocus: z.string().nullable().default(null), // null = 自动
  trainingIntensity: TrainingIntensitySchema.default('normal'),
});
```

### 4.2 Simulation 层

**`simulateTraining()` 签名变更：**

```typescript
export function simulateTraining(
  player: PlayerCareer,
  state: PlayerState,
  rng: SeededRandomSource,
  focus?: string, // 新增：指定训练重点
  intensity?: TrainingIntensity, // 新增：训练强度
): TrainingSummary;
```

**强度效果表：**

| 强度    | 属性成长倍率 | 疲劳积累 | 体能消耗 | 受伤概率 |
| ------- | :----------: | :------: | :------: | :------: |
| light   |     ×0.5     |   ×0.5   |   ×0.5   |    0%    |
| normal  |     ×1.0     |   ×1.0   |   ×1.0   |    0%    |
| intense |     ×1.5     |   ×1.5   |   ×1.5   |    5%    |

**受伤逻辑（`intense` 时）：**

- 5% 概率触发轻微受伤
- 受伤效果：疲劳 +10~~15，体能 -10~~15，士气 -3~5
- 不引入持久伤病（后续阶段可扩展）
- 受伤信息通过 `TrainingSummary` 的 `injury: boolean` 字段返回

**`TrainingSummarySchema` 扩展：**

```typescript
export const TrainingSummarySchema = z.object({
  focus: z.string().min(1).max(30),
  attributeChanges: z.array(AttributeChangeSchema),
  fitnessChange: z.number().int(),
  moraleChange: z.number().int(),
  coachTrustChange: z.number().int(),
  injury: z.boolean().default(false).optional(), // 新增
});
```

**`advanceCareerWeek()` 变更：**

- 从 `save.context` 读取 `trainingFocus` 和 `trainingIntensity`
- 传给 `simulateTraining()`
- 受伤时更新 `playerState`（额外疲劳、体能、士气变化）

### 4.3 Application 层

**`advance-career-week.ts` 和 `batch-advance.ts`：**

- 调用 `advanceCareerWeek()` 时传入训练设置
- 无需额外逻辑变更（训练设置已包含在 save.context 中）

### 4.4 Web 层

**新增：TrainingSettings 组件**

在仪表盘状态栏下方、属性上方添加训练设置面板：

```
┌──────────────────────────────────────┐
│  ⚙️ 训练设置                          │
│                                      │
│  训练重点: [下拉选择器]                │
│  强度:    [轻量] [普通] [加练]         │
│                                      │
│  💡 当前设置：传球训练 · 普通强度      │
│  📊 预期效果：传球 +1~3 · 疲劳 +2~4   │
└──────────────────────────────────────┘
```

**训练重点选项（按位置）：**

| 位置   | 可选重点               |
| ------ | ---------------------- |
| 中后卫 | 防守、空中、力量、自动 |
| 边后卫 | 速度、耐力、防守、自动 |
| 后腰   | 防守、传球、耐力、自动 |
| 中场   | 传球、视野、技术、自动 |
| 边锋   | 盘带、速度、射门、自动 |
| 前锋   | 射门、跑位、盘带、自动 |

**预期效果预览：**

- 轻量：↓ 成长慢 · 恢复快 · 低疲劳
- 普通：适中成长 · 适中消耗
- 加练：↑ 成长快 · 疲劳高 · ⚠️ 受伤风险

## 5. 数据流

```
玩家调整训练设置
       ↓
save.context.trainingFocus = 'passing'
save.context.trainingIntensity = 'intense'
       ↓
推进一周 → 训练活动
       ↓
advanceCareerWeek() 读取 context 中的训练设置
       ↓
simulateTraining(player, state, rng, 'passing', 'intense')
       ↓
返回带强度倍率的 TrainingSummary（含 injury 字段）
       ↓
应用属性变化、状态变化、受伤效果
       ↓
写入账本（training-week 条目已有 focus 字段）
       ↓
显示周报（含训练结果、受伤信息）
```

## 6. 测试计划

### Simulation 测试

- `simulateTraining` 传入指定重点时返回对应 focus
- 轻量模式成长倍率合理（单次增长 ≤2）
- 加练模式成长倍率合理（单次增长 ≤4）
- 加练模式下 `injury` 偶尔为 true
- 轻量/普通模式下 `injury` 始终为 false
- 不传 focus 时行为与原来一致（随机选择）

### Application 测试

- 带有训练设置的 save 可正常推进
- 训练设置不影响非训练周

### Web 测试

- 训练设置面板渲染正确
- 选择训练重点后保存到 context
- 强度切换后预览文字更新

## 7. 实施顺序

1. 扩展契约（TrainingIntensitySchema、CareerContextSchema）
2. 修改 `simulateTraining()` 接受 focus 和 intensity 参数
3. 扩展 TrainingSummary 添加 injury 字段
4. 修改 `advanceCareerWeek()` 传递训练设置
5. 更新 Application 层传递训练设置
6. 实现 TrainingSettings UI 组件
7. 集成到 CareerDashboard
8. 编写测试
9. 运行质量门禁
