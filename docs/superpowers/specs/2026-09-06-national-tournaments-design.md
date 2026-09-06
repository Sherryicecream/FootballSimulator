# 国家队大赛窗口设计（M11 模块 2）

> 状态：按长期清单推进（spec §13 重大赛事）。
>
> 日期：2026-09-06
>
> 前置：M11 模块 1 已完成。M7 的国家队为抽象年度窗口，明确排除了大赛；本模块补上。

## 1. 目标

已入选国家队的球员在生涯中经历**亚洲杯/世界杯**抽象大赛：小组赛 + 淘汰赛、出场与进球计入国家队数据、冠军/亚军进入生涯荣誉与传奇时刻、声望经衰减带结算。不做完整国际赛程、不逐分钟模拟（spec §3.2 与 M7 边界保持）。

## 2. 赛历与资格

- 赛季 `pro-YYYY` 结束后的夏天（年份 `YYYY+1`）举办大赛：`% 4 === 0` → 亚洲杯；`% 4 === 2` → 世界杯；其余年份无大赛。
- 参赛资格：`nationalTeam.capped === true` 且结算时 `player.age ≤ 35`。青年队不建模（M7 边界）。
- 世界杯对手基准比亚洲杯高 10，且随国家队周期强度小幅波动。

## 3. 抽象赛制

- **球队强度代理**（国家队整体未建模，用声望档位代表周期强度）：`<60 → 55`；`60–69 → 62`；`70–79 → 68`；`≥80 → 74`。
- **小组赛 3 场**：单场胜率 `clamp(0.5 + (强度 − 对手)/120, 0.15, 0.85)`，平局概率为剩余的 40%；积分 ≥4 晋级。
- **淘汰赛** QF→SF→F 单场决胜（平局时点球 50/50）。
- **出场/进球**：小组每场 +1 caps；淘汰赛每轮 +1；单场进球按 0.25 二项抽样（与年度窗口一致）。
- **荣誉**：冠军/亚军写入当季 `seasonHistory.honours`（新增 kind：`asian-cup-champion`、`world-cup-champion`、`world-cup-runner-up`）。
- **声望**：冠军 +4、亚军 +2、四强 +1，经 `applyReputationGain` 结算。
- **账本**：一条 `national-debut` 类型事实（摘要含赛名、止步轮次、出场、进球），生涯回放自动归入"国家队节点"。
- caps/goals 累入 `nationalTeam`，与传奇档（caps ≥80）互通。

## 4. 分层归属

- contracts：`SeasonHonourSchema.kind` 枚举扩展（additive，旧存档不受影响）。
- simulation：`career/national-tournament.ts` 纯函数 `simulateSummerTournament(save, tournamentYear, rng)` + `isTournamentYear(year)`；`career-review.ts` 的荣誉权重与传奇计数纳入新 kind。
- application：`completeProfessionalSeason` 在年度国家队结算后处理大赛，结果合并进赛季历史、账本与声望。
- web：无新页面——大赛结果经赛季总结账本、国家队卡片（caps）与回顾页荣誉/回放自然呈现。

## 5. 测试与验收

- simulation：无资格/非大赛年返回 null；确定性；结构合法（小组 3 场、caps 3–7、轮次单调）；强队种子搜索可夺冠且荣誉标签正确。
- application：大赛年的结算把 caps/荣誉/账本事实/声望合并；非大赛年行为不变。
- 门禁全绿；1,000 季：世界级 1–5%、国家队 15–30%、完成率 100% 等既有断言保持（大赛带来 caps 与声望的小幅上移属可解释漂移）。
