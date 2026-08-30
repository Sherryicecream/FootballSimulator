# 职业队赛季实施计划

> **For agentic workers:** 按工作包批量推进，每个工作包遵守 TDD，只在工作包级维护复选框。设计机制以 `docs/superpowers/specs/2026-08-30-professional-season-design.md` 为准。

**目标：** 让签署职业合同的球员进入职业赛季循环：阵容竞争、登场机会、联赛积分榜、合同承诺兑现检验与续约/自由球员分支，并以职业期 3 连季批量模拟验收。

## 全局约束

- 阶段机（professional-contract → pro-season → pro-offseason → free-agent）转移只经 application 用例；web 不自行改写阶段。
- 同种子同操作产生相同状态；simulation 不依赖时间、网络与全局随机。
- 赛程生成后立即固定写入存档；积分榜与比赛结果一一对应。
- 合同承诺对照的归因（伤病/俱乐部/球员）必须可解释并写入账本。
- 每个工作包完成时项目可运行、门禁全绿。

## 工作包 1：v4 存档、俱乐部内容扩充与职业赛季骨架

- contracts：`CareerPhaseSchema` 增加 pro 阶段；v4 Schema（proSeason/proSeasonStats/promiseReviews/proPhase）与 v3→v4 迁移；账本新增 `pro-match`/`renewal-offer`/`renewal-signed`。
- content：俱乐部表扩充至每层级 ≥8 家（层级 3–8）并校验。
- simulation：`league-fixtures.ts`（同层双循环赛程）、`pro-squad.ts`（阵容与深度图）、`professional-week.ts`（职业周转移：负荷、登场决策、比赛、健康、发展积累）、`promise-review.ts`。
- application：`start-professional-season`、`advance-pro-month`、`complete-professional-season`、`accept-renewal`、`decline-renewal`。
- 测试：v4 迁移、赛程确定性、阵容结构、周转移一致性、用例阶段校验。

- [ ] 1.1 v4 契约与迁移测试先行
- [ ] 1.2 俱乐部内容与校验
- [ ] 1.3 赛程/阵容/职业周转移
- [ ] 1.4 用例与阶段机
- [ ] 1.5 门禁全绿并提交 `feat: add professional season core loop`

## 工作包 2：登场模型校准与职业 UI

- 登场身份/分钟模型按设计公式实现并测试（承诺修正、竞争压制、伤病疲劳硬门槛、预备队出场）。
- web：职业仪表盘（深度图、积分榜、合同卡、月报复用）、承诺对照报告、续约选择；App 按阶段路由。
- E2E：以无界面流程构造职业期存档注入 localStorage，真实推进一个月并刷新恢复。

- [ ] 2.1 登场模型测试先行
- [ ] 2.2 职业 UI 与组件测试
- [ ] 2.3 E2E 与门禁，提交 `feat: add professional squad competition and pro dashboard`

## 工作包 3：承诺对照、续约与平衡验收

- 份额计算与归因后果（信任/声望、连续 broken 修正）；续约要约生成（薪资 ±15%、承诺重生成）。
- 批量工具扩展职业期 3 连季：承诺 kept 率 55–80%、俱乐部原因 broken 10–25%、三季内首发率 15–40%、场均一线队出场中位 25–55 分钟、重伤 <4%/季。
- ROADMAP/AGENTS 更新、完整门禁、1,000 次批量运行。

- [ ] 3.1 承诺对照与续约测试
- [ ] 3.2 批量校准与范围测试
- [ ] 3.3 文档收尾并提交 `feat: complete professional season milestone`

## 完成定义

1. 玩家可从 M5 终态开启职业赛季、按月推进、查看阵容/积分榜/月报、完成赛季并看到承诺对照。
2. 合同到期分支（续约/自由球员）可走通，续约受历史表现影响。
3. v3 存档可迁移；v4 严格校验。
4. 职业期批量模拟无崩溃且分布在校准范围内。
5. 全部门禁通过，`master` 不包含 M7 半成品。
