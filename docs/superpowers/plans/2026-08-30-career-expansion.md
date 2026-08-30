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

- [ ] 1.1 v5 契约与迁移测试先行
- [ ] 1.2 年龄曲线（成长乘数 + 衰退）测试先行
- [ ] 1.3 转会要约与签约用例
- [ ] 1.4 UI 与门禁，提交 `feat: add free agency transfers and age curves`

## 工作包 2：海外适应与国家队

- content：海外俱乐部表（12 家，层级 4–8，overseas: true）并入校验。
- simulation：`national-team.ts`（资格评估 + caps/进球抽样）；海外适应（每周士气损耗随适应力与年数衰减）与声望加成（×1.2）接入职业周转移。
- application：国家队资格评估并入赛季结算；首征召生成待决事件（接受/婉拒）。
- web：仪表盘国家队卡片；待决事件复用事件面板。
- 测试：资格边界、caps 分布、适应衰减、声望加成、首征召事件。

- [ ] 2.1 海外内容与适应机制
- [ ] 2.2 国家队资格与累计
- [ ] 2.3 UI 与门禁，提交 `feat: add overseas clubs and national team`

## 工作包 3：退役、生涯回顾与全生涯平衡

- simulation：`career-review.ts`（总览/时间线/履历/六级点评，确定性）。
- application：`retire`（30+ 可选、38 强制确认逻辑）；阶段路由收尾。
- web：退役确认、生涯回顾页。
- tools/balance：全生涯批量（毕业 → 职业期至退役，上限 20 季）：生涯长度、转会次数、留洋占比、caps、退役年龄、回顾生成率。
- 校准范围：生涯长度中位 8–14 季；平均转会 0.5–2.5；留洋占比 10–30%；有国家队出场 25–50%；退役年龄中位 30–34；回顾生成 100%。
- 文档：ROADMAP M7 已完成 + 实际指标；AGENTS 补充；完整门禁 + 1,000 次批量。

- [ ] 3.1 退役与回顾测试先行
- [ ] 3.2 UI 与 E2E
- [ ] 3.3 批量校准与范围测试
- [ ] 3.4 文档收尾并提交 `feat: complete career expansion milestone`

## 完成定义

1. 玩家可从 M6 终态经自由球员转会（含留洋）继续生涯，累计国家队出场，最终退役并查看生涯回顾。
2. 转会、国家队累计、衰退与回顾可解释、可回放、同种子一致。
3. v4 存档可迁移；v5 严格校验；退役为终态。
4. 全生涯批量无崩溃且分布在校准范围内。
5. 全部门禁通过；MVP 生涯闭环（16 岁 → 退役回顾）完整可玩。
