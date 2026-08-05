# 足球生涯模拟器 — 青训生涯核心循环设计

## 1. 概述

本文档描述如何在现有引导流程（创建球员 → 选择青训机构）之后，实现完整的青训生涯核心循环，使玩家可以持续推进每一周，体验训练、比赛和事件。

## 2. 当前状态

引导流程止于 `BootstrapCareerSummary`：

```
创建球员 → 生成初始属性 → 推进至青训机会 → 选择青训机构 → 查看初始生涯摘要（终点）
```

已有但不被流程使用的底层能力：

- 确定性随机系统（`seeded-random-source.ts`）
- 日历与周推进（`calendar.ts`）
- 普通比赛模拟（`match-engine.ts`）
- 联赛与积分榜（`league-season.ts`）
- 事件选择器与模板叙事（`event-selector.ts`、`narrative.ts`）
- 人物关系模型（`relationship-manager.ts`）
- 存档端口（`save-port.ts`）

## 3. 契约扩展

### 3.1 球员运行时状态

```typescript
PlayerStateSchema = z.object({
  fitness: z.number().int().min(0).max(100), // 体能 50=初始
  morale: z.number().int().min(0).max(100), // 士气 50=初始
  coachTrust: z.number().int().min(0).max(100), // 教练信任 30=初始
  fatigue: z.number().int().min(0).max(100), // 疲劳 0=初始
  teamStatus: z.enum(['fringe', 'rotation', 'regular', 'key']), // 队内地位
});
```

### 3.2 世界状态扩展

给 `WorldStateSchema` 增加 `weekNumber: z.number().int().min(1).max(52)`

### 3.3 上下文扩展

给 `CareerContextSchema` 增加：

- `pendingEvent: EventInstanceSchema.nullable()` — 待处理事件
- `playerState: PlayerStateSchema` — 球员运行时状态

### 3.4 周报契约

```typescript
WeekActivitySchema = z.enum(['training', 'match', 'event', 'quiet']);

TrainingSummarySchema = z.object({
  focus: z.string(), // 训练重点
  attributeChanges: z.array(AttributeChangeSchema),
  fitnessChange: z.number().int(),
  moraleChange: z.number().int(),
  coachTrustChange: z.number().int(),
});

YouthMatchResultSchema = z.object({
  opponent: z.string(),
  isHome: z.boolean(),
  homeScore: z.number().int(),
  awayScore: z.number().int(),
  played: z.boolean(),
  minutesPlayed: z.number().int().min(0).max(90),
  rating: z.number().int().min(1).max(10),
  performanceSummary: z.string(),
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
  fitnessChange: z.number().int(),
  moraleChange: z.number().int(),
  coachTrustChange: z.number().int(),
});

WeeklyAdvanceResultSchema = z.object({
  date: z.string(),
  week: z.number().int(),
  season: z.number().int(),
  activity: WeekActivitySchema,
  trainingSummary: TrainingSummarySchema.nullable(),
  matchResult: YouthMatchResultSchema.nullable(),
  event: EventInstanceSchema.nullable(),
  stateChanges: z.array(StateChangeSchema),
  hasPendingChoice: z.boolean(),
});
```

### 3.5 扩展账本条目

新增：

- `training-week`：训练周记录
- `match-week`：比赛周记录（含对手、比分、评分）
- `event-week`：事件周记录
- `attribute-change`：属性变化
- `state-change`：状态变化

### 3.6 人物关系图修复

将 `RelationshipGraphSchema` 从 `z.array(z.unknown())` 改为使用已定义的 `PersonSchema` 和 `ActiveRelationSchema`。

## 4. Simulation 层新增

### 4.1 周活动判定

`career/week-activities.ts` — `generateWeekActivity()`

- 训练：最常见（基础权重 60%）
- 比赛：按青训赛程周期（约每 3-4 周一次，权重 25%）
- 事件：有冷却期（权重 10%）
- 平淡周：无特殊事件（权重 5%）
- 同一周可以有训练+比赛组合

### 4.2 训练模拟

`player-development/training.ts` — `simulateTraining()`

- 根据位置分配训练重点
- 属性增长：缓慢（每项 +0~3），受潜力、职业素养影响
- 体能变化：小幅消耗
- 士气变化：小幅波动
- 教练信任：小幅提升
- 不出现连续大幅增长

### 4.3 青训比赛

`match/youth-match.ts` — `simulateYouthMatch()`

- 复用现有 `simulateMatch()` 引擎
- 生成虚构对手（青训学院名称池）
- 判定球员是否出场（基于体能、教练信任）
- 出场时间：基于队内地位
- 表现评分：基于属性、位置适配、随机波动
- 结果影响：体能消耗、士气变化、教练信任变化
- 允许爆冷（弱队偶尔赢强队）
- 强队总体更有优势

### 4.4 每周推进

`career/weekly-advance.ts` — `advanceCareerWeek()`

整合：

1. 推进日历 1 周
2. 生成周活动（训练/比赛/事件/平淡）
3. 执行训练模拟
4. 执行比赛模拟
5. 执行事件选择
6. 更新球员状态
7. 追加账本记录
8. 返回 `WeeklyAdvanceResult`

### 4.5 初始状态

`career/initial-state.ts` — `initializePlayerState()`

青训选择后初始化球员运行时状态。

## 5. Application 层新增

### 5.1 推进周用例

`use-cases/advance-career-week.ts` — `createAdvanceCareerWeek()`

- 接收 `CareerSave`，返回 `CareerSave`（更新后的存档）
- 验证存档可推进（无待处理事件）
- 调用 `simulation` 的 `advanceCareerWeek`
- 返回更新后的存档

### 5.2 提交事件选择用例

`use-cases/submit-event-choice.ts` — `createSubmitEventChoice()`

- 验证事件存在且待处理
- 应用选择效果
- 清除待处理事件
- 写入账本

## 6. Web 层新增

### 6.1 生涯仪表盘

`career-dashboard/CareerDashboard.tsx` — 替换 `BootstrapCareerSummary`

显示：

- 球员姓名、年龄、位置、青训机构
- 当前日期、赛季、周次
- 属性概览（16 项）
- 体能/士气/疲劳/教练信任状态条
- 最近活动摘要
- 下周活动预览
- 「推进一周」按钮

### 6.2 周报展示

`career-dashboard/WeeklyReport.tsx` — 推进后的结果显示

显示：

- 日期变化
- 训练摘要（重点、属性变化）
- 比赛结果（对手、比分、评分、表现）
- 事件（如果有选择则暂停）
- 状态变化列表
- 无事件时自动显示「继续推进」按钮

### 6.3 事件选择面板

`event-choice/EventChoicePanel.tsx` — 事件决策

- 渲染事件标题、描述
- 显示选项按钮
- 单击提交，不可重复提交

### 6.4 持久化

`persistence/local-storage-save.ts` — localStorage 适配器

- 版本化存储
- JSON 序列化/反序列化
- 启动时自动加载
- 每次推进后自动保存
- 损坏数据提示

### 6.5 App.tsx 修改

- 新增 `FlowStep`：`'dashboard'`（替换 `'summary'`）
- 新增存档/读档逻辑
- 新增「新生涯」入口

## 7. 测试计划

### Simulation 测试

- 周活动生成：不同种子产生不同活动
- 训练模拟：属性增长在合理范围内
- 比赛模拟：强队有优势但允许爆冷
- 每周推进：日期正确、状态更新正确
- 确定性：相同种子 + 相同序列 → 相同结果

### Application 测试

- 空闲存档可推进
- 待处理事件阻止推进
- 事件提交后不可重复提交
- 存档通过 Zod 校验

### Web 测试

- 仪表盘显示正确信息
- 推进后显示周报
- 事件选择暂停推进
- localStorage 存取
- 损坏存档不白屏

### E2E 测试

- 完整流程：创建 → 选择 → 仪表盘 → 推进 3 周
- 同一种子相同结果
- 无水平溢出（桌面 + 移动端）

## 8. 实施顺序

1. 扩展契约（PlayerState、WorldState、Context、账本条目、关系图修复）
2. 实现训练模拟
3. 实现青训比赛
4. 实现周活动判定
5. 实现每周推进（整合）
6. 实现初始状态初始化
7. 实现推进周用例
8. 实现事件选择用例
9. 实现 localStorage 适配器
10. 实现生涯仪表盘 UI
11. 实现周报 UI
12. 实现事件选择 UI
13. 修改 App.tsx 集成流程
14. 编写测试
15. 运行质量门禁
