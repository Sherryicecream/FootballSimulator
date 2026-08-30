# 青训毕业与合同实施计划

> **For agentic workers:** 按工作包批量推进，每个工作包遵守 TDD，只在工作包级维护复选框。不要同时执行其他历史设计或计划。

**目标：** 将青训赛季垂直切面扩展为可连续推进的青训生涯：休赛期结算、下赛季生成、毕业资格评估、经纪人与首份职业合同签署，并用 3 赛季批量模拟验收。

**架构：** `contracts` 定义 v3 存档与合同边界，`content` 提供俱乐部与经纪人内容并校验，`simulation` 实现纯确定性休赛期结算、资格评估和要约生成，`application` 以阶段机编排转移，`web` 按阶段路由渲染，`tools/balance` 扩展为 3 赛季批量。休赛期、批量模拟与网页推进共享同一规则，不得出现第二套状态归并。

**技术栈：** Node.js 24.16+、pnpm 11.9.0、TypeScript、Zod、Vitest、React 19、Vite、Testing Library、Playwright。

## 全局约束

- 设计机制以 `docs/superpowers/specs/2026-08-30-youth-graduation-contracts-design.md` 为准。
- 阶段机转移必须经 application 用例校验，非法转移报错；web 不自行改写阶段。
- 同种子同操作序列产生相同机械状态；simulation 不依赖时间、网络与全局随机。
- 俱乐部与经纪人使用虚构名称；内容启动前经校验。
- 签署合同需一次简短确认；要约只能在实际出现的报价中选择。
- 每个工作包完成时项目可运行，门禁全绿；每包一个或少量逻辑完整提交。

## 执行前状态

- `master` 为 M0–M4 已验收的绿基线（1b3194a 之后）。
- 使用 `codex/youth-graduation` 工作区分支实施，完成后快进合并回 `master`。

## 工作包 1：v3 存档、休赛期与连续赛季

**可独立交付结果：** 完成赛季后可进入休赛期查看结算简报，留队玩家开始下个赛季，被放弃玩家可经补救路线重入；v2 存档确定性迁移。

**文件：**

- 修改：`packages/contracts/src/save-migration.ts`（v3 Schema 与 v2→v3 迁移）
- 修改：`packages/contracts/src/youth-season.ts`（账本新条目类型）
- 修改：`packages/contracts/src/index.ts`
- 创建：`packages/simulation/src/career/evaluate-offseason.ts`
- 创建：`packages/simulation/src/career/start-next-season.ts`
- 修改：`packages/simulation/src/index.ts`
- 创建：`packages/application/src/use-cases/enter-offseason.ts`
- 创建：`packages/application/src/use-cases/start-next-season.ts`
- 修改：`packages/application/src/use-cases/complete-youth-season.ts`（结算后写入赛季历史摘要与阶段转移）
- 修改：`packages/application/src/index.ts`
- 修改：`packages/content/src/academies.ts`（补救路线候选机构映射）
- 创建或修改：对应 contracts、simulation、application、web 测试
- 修改：`apps/web/src/app/App.tsx`（休赛期路由与简报页）
- 创建：`apps/web/src/career-dashboard/OffseasonBriefing.tsx`

**接口：**

```ts
export const evaluateOffseason = (
  save: CareerSaveV3,
  nextSeasonStart: string,
  rng: SeededRandomSource,
): { save: CareerSaveV3; briefing: OffseasonBriefing };

export const startNextSeason = (
  save: CareerSaveV3,
  content: YouthContentBundle,
): CareerSaveV3;

export const enterOffseason = (save: CareerSaveV3): { save: CareerSaveV3; briefing: OffseasonBriefing };
```

- [ ] **1.1 契约测试锁定 v3 边界与迁移**
- [ ] **1.2 休赛期结算（健康、体能、沉淀、年龄、声望、资格评估）失败测试先行**
- [ ] **1.3 startNextSeason 与被放弃重入失败测试先行**
- [ ] **1.4 阶段机用例与 UI 简报页**
- [ ] **1.5 门禁全绿并提交** `feat: add offseason settlement and consecutive youth seasons`

## 工作包 2：毕业资格、经纪人与首份合同

**可独立交付结果：** 达标玩家可设定经纪人倾向、比较 2–4 份要约、签署首份职业合同或拒绝全部；未达标玩家永远无法进入要约环节；合同与承诺写入存档并展示。

**文件：**

- 创建：`packages/content/src/clubs.ts`、`packages/content/src/agent-archetypes.ts`
- 修改：`packages/content/src/validation/validate-content.ts`、`packages/content/src/index.ts`
- 创建：`packages/simulation/src/career/graduation.ts`
- 创建：`packages/simulation/src/career/offer-generation.ts`
- 创建：`packages/application/src/use-cases/submit-agent-preferences.ts`
- 创建：`packages/application/src/use-cases/generate-offers.ts`
- 创建：`packages/application/src/use-cases/sign-contract.ts`
- 创建：`packages/application/src/use-cases/reject-offers.ts`
- 修改：`packages/application/src/index.ts`
- 创建：`apps/web/src/career-dashboard/AgentPreferencesForm.tsx`
- 创建：`apps/web/src/career-dashboard/OfferComparisonPanel.tsx`
- 创建：`apps/web/src/career-dashboard/ContractCard.tsx`
- 修改：`apps/web/src/app/App.tsx`
- 创建或修改：对应 content、simulation、application、web 测试与 E2E

**接口：**

```ts
export const evaluateGraduationEligibility = (
  save: CareerSaveV3,
): { eligible: boolean; report: EligibilityCriterion[] };

export const generateOffers = (
  save: CareerSaveV3,
  content: YouthContentBundle,
  rng: SeededRandomSource,
): ContractOfferV3[];

export const submitAgentPreferences = (save: CareerSaveV3, prefs: AgentPreferences): CareerSaveV3;
export const signContract = (save: CareerSaveV3, offerId: string): CareerSaveV3;
export const rejectOffers = (save: CareerSaveV3): CareerSaveV3;
```

- [ ] **2.1 俱乐部与经纪人内容校验测试**
- [ ] **2.2 毕业资格评估失败测试先行**
- [ ] **2.3 要约生成与兴趣评分失败测试先行**
- [ ] **2.4 签署、拒绝、承诺记录与阶段转移用例**
- [ ] **2.5 UI（经纪人表单、要约对比、签署确认、合同卡）与 E2E**
- [ ] **2.6 门禁全绿并提交** `feat: add graduation pathway and first professional contract`

## 工作包 3：3 赛季平衡验收与文档收尾

**可独立交付结果：** 批量工具输出 3 连季毕业/合同分布并满足校准范围；文档更新为完成态。

**文件：**

- 修改：`tools/balance/src/run-youth-seasons.ts`、`tools/balance/src/youth-season-metrics.ts`
- 修改：`tools/balance/tests/youth-season-balance.test.ts`
- 修改：`docs/ROADMAP.md`（M5 已完成、实际指标）
- 修改：`AGENTS.md`（补充 M5 后的规则约束）

**CLI：**

```powershell
pnpm balance:youth --runs 1000 --seed-start 1 --output artifacts/youth-balance.json
```

- [ ] **3.1 3 连季批量指标与校准范围测试**
- [ ] **3.2 完整门禁 + 1,000 赛季运行**
- [ ] **3.3 更新 ROADMAP 与 AGENTS 并提交** `feat: complete youth graduation and contract milestone`

## 完成定义

1. 玩家可从赛季总结推进至休赛期、下赛季（多季连续）或首份职业合同签署。
2. 毕业资格、要约生成、休赛期结算可解释、可回放、同种子一致。
3. v2 存档可迁移，v3 存档严格校验，损坏存档有诊断。
4. 批量 3 连季无崩溃，毕业率与合同分布在校准范围内。
5. 全部质量门禁通过，`master` 不包含 M6 职业赛季半成品。
