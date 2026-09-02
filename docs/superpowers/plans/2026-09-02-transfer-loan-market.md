# 转会与租借市场 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 v3 月度职业生涯中加入每赛季可用的留队、永久转会和一年期租借路径，并让合同归属、参赛俱乐部、数据、球队荣誉、升级降级、赛季总结和生涯回顾保持可解释且可重放。

**Architecture:** contracts 保存 offerKind、activeLoan 和 loanHistory，并通过 v5 迁移兼容旧存档；simulation 只使用显式内容、存档切片和派生种子生成市场报价及目标俱乐部结果；application 承担市场窗口、签约、开赛、租借结算和回归的状态变换；web 只显示 application 保存的状态，不自行计算层级、概率或结果。沿用现有职业休赛期，不新增周推进或玩家可见阶段。

**Tech Stack:** TypeScript monorepo、Zod、Vitest、React、Playwright、pnpm、现有 Mulberry32 seeded random source。

## Global Constraints

- spec.md 是长期产品基线，docs/ROADMAP.md 是唯一进度入口；设计基线为 docs/superpowers/specs/2026-09-02-transfer-loan-market-design.md。
- 浏览器继续使用 v3 月度职业流程，不重新引入玩家侧周推进或快进动作。
- packages/simulation 必须保持确定性且无外部运行时依赖；内容和种子显式传入。
- packages/application 拥有职业市场、赛季开赛、赛季结算、租借回归和阶段转换规则；UI 不复制这些规则。
- 保持 CareerSaveV5 版本；新增 activeLoan 与 loanHistory 字段都提供兼容默认值。
- ContractOfferV3.offerKind 取值为 permanent 或 loan，旧报价无此字段时按 permanent 解析。
- 母队合同的 contract.clubId 与 clubTier 在租借期间不被目标俱乐部替换；proSeason.clubId 才是当前代表参赛的俱乐部。
- 租借期限固定为一个职业赛季，赛季结束自动回到母队；不实现半赛季租借、买断或租借转永久。
- 重大事件必须有账本或赛季历史证据；重复提交、刷新或结算不能复制履历、荣誉或统计。
- 海外市场仍要求 adaptability >= 55；报价层级继续受兴趣分数和能力天花板共同限制，能力天花板保持单调。
- 每个行为变更先添加失败回归测试，再写最小实现；每个绿色切片都提交分支检查点。
- 完成前运行 pnpm test、pnpm typecheck、pnpm lint、pnpm format:check、pnpm build、pnpm test:e2e 和 roadmap 记录的 1,000 生涯平衡命令。

## File Map

- packages/contracts/src/graduation.ts：扩展报价种类，并保证续约和旧报价仍能解析。
- packages/contracts/src/career-expansion.ts：定义租借状态、租借履历和 v5 跨字段校验。
- packages/contracts/src/youth-season.ts：增加 market-window 账本事实类型。
- packages/simulation/src/career/offer-generation.ts、transfer-offers.ts：生成确定性的双类型职业市场报价。
- packages/application/src/use-cases/transfer-flow.ts：新增市场请求、市场签约、租借回归，并复用永久签约逻辑。
- packages/application/src/use-cases/pro-flow.ts：按租借目标开赛，结算时分离母队履历与租借履历。
- packages/application/src/index.ts：导出新的 application 用例。
- packages/simulation/src/career/career-review.ts：把租借俱乐部、租借荣誉和合同节点纳入回顾。
- apps/web/src/app/App.tsx、ProOffseasonPanel.tsx、OfferComparisonPanel.tsx：串联并呈现市场。
- apps/web/src/career-dashboard/ProDashboard.tsx、pro-presentation.ts、CareerReviewPage.tsx、app.css：显示实际参赛队、租借标记、荣誉和视觉层级。
- packages/contracts/tests/transfer-loan.test.ts、packages/simulation/tests/career/transfer-offers.test.ts、packages/application/tests/use-cases/transfer-market.test.ts：覆盖契约、报价和应用用例。
- packages/application/tests/use-cases/pro-flow.test.ts、apps/web/tests/career-dashboard/*.test.tsx、apps/web/tests/e2e/professional-season.spec.ts：覆盖生命周期和界面。
- tools/balance/src/youth-season-metrics.ts、run-youth-seasons.ts、docs/ROADMAP.md：长期平衡指标和进度记录。

---

### Task 1: 扩展 v5 契约、租借状态与迁移保护

**Files:**
- Modify: packages/contracts/src/graduation.ts
- Modify: packages/contracts/src/career-expansion.ts
- Modify: packages/contracts/src/youth-season.ts
- Create: packages/contracts/tests/transfer-loan.test.ts
- Modify: packages/contracts/tests/career-v5.test.ts

**Interfaces:**

- ContractOfferV3.offerKind: 'permanent' | 'loan'，schema 使用带 permanent 默认值的枚举。
- ActiveLoanSchema 保存 parentClubId、parentClubName、parentClubTier、loanClubId、loanClubName、loanClubTier、startedOn、returnsOn、seasonId。
- LoanHistoryEntrySchema 保存 seasonId、母队和目标队字段、from、to、appearances、goals、assists、minutes、competitionTier、outcomeEvidenceId。
- CareerSaveV5Schema 增加 activeLoan: ActiveLoanSchema.nullable().default(null) 与 loanHistory: z.array(LoanHistoryEntrySchema).default([])。
- 导出 validateCareerSaveV5LoanState(save: CareerSaveV5): CareerSaveV5。有进行中 proSeason 时，activeLoan.seasonId 必须等于 proSeason.id；尚未开赛时 proSeason === null 可以通过。
- CareerLedgerEntryV2Schema.type 增加 market-window。

- [ ] **Step 1: 写失败测试**

在测试文件中从现有 v5 fixture 构造 legacyV5Fixture、无 offerKind 的 legacyOffer，并定义 validV5WithLoan(overrides) 为 CareerSaveV5Schema.parse({ ...fixture, ...overrides })。添加：

```ts
it('旧 v5 报价默认永久，旧存档补空租借状态', () => {
  const parsed = migrateCareerSaveV5({
    ...legacyV5Fixture,
    pendingOffers: [legacyOffer],
  });
  expect(parsed.pendingOffers[0]!.offerKind).toBe('permanent');
  expect(parsed.activeLoan).toBeNull();
  expect(parsed.loanHistory).toEqual([]);
});

it('进行中的租借必须绑定当前职业赛季', () => {
  const save = validV5WithLoan({
    activeLoan: { ...validLoan, seasonId: 'pro-2031' },
    proSeason: { ...validProSeason, id: 'pro-2030' },
  });
  expect(() => migrateCareerSaveV5(save)).toThrow(/租借.*赛季/);
});
```

- [ ] **Step 2: 运行失败测试**

运行：pnpm vitest run packages/contracts/tests/transfer-loan.test.ts packages/contracts/tests/career-v5.test.ts

预期：FAIL，原因是新字段、账本类型和跨字段校验尚未定义。

- [ ] **Step 3: 写最小契约实现**

先扩展报价 schema，再添加两个 strict schema 和 v5 默认字段；迁移成功后调用 validateCareerSaveV5LoanState。为现有续约报价对象补 offerKind: 'permanent'，保证严格对象仍能解析。

- [ ] **Step 4: 运行通过测试并提交**

运行同一 Vitest 命令，预期新增迁移测试与旧 v4/v5 测试全部 PASS。

```bash
git add packages/contracts/src packages/contracts/tests/transfer-loan.test.ts packages/contracts/tests/career-v5.test.ts
git commit -m "feat: add loan state contracts"
```

---

### Task 2: 构建可解释且确定性的双类型市场报价

**Files:**
- Modify: packages/simulation/src/career/offer-generation.ts
- Modify: packages/simulation/src/career/transfer-offers.ts
- Modify: packages/simulation/src/index.ts
- Create: packages/simulation/tests/career/transfer-offers.test.ts

**Interfaces:**

- 导出 TransferMarketKind = 'permanent' | 'loan'。
- 导出 MarketPerformanceSnapshot：appearances、goals、assists、ratingSum、ratingCount 均为非负数。
- 导出 generateProfessionalMarketOffers(save: CareerSaveV5Like, content: YouthContentBundle, rng: SeededRandomSource, kind: TransferMarketKind): ContractOfferV3[]。
- 保留 generateTransferOffers(save, content, rng) 签名，内部固定生成永久报价。
- GenerateOffersOptions 增加 offerKind、performance、excludeClubIds；allowFallback: false 时绝不生成伪造保底报价。

- [ ] **Step 1: 写失败测试**

在测试文件顶部定义 seeded(seed)、saveWithContract、lowAdaptabilitySave，以及能力高低两个存档 fixture；fixture 从现有 simulation fixture 复制完整存档，只替换合同、适应力或属性。添加：

```ts
it('同一存档、市场类型和种子生成完全相同报价', () => {
  const first = generateProfessionalMarketOffers(saveWithContract, content, seeded(77), 'loan');
  const second = generateProfessionalMarketOffers(saveWithContract, content, seeded(77), 'loan');
  expect(second).toEqual(first);
});

it('租借报价固定一年且排除当前合同俱乐部', () => {
  const offers = generateProfessionalMarketOffers(saveWithContract, content, seeded(11), 'loan');
  expect(offers.every((offer) => offer.offerKind === 'loan')).toBe(true);
  expect(offers.every((offer) => offer.contractYears === 1)).toBe(true);
  expect(offers.every((offer) => offer.clubId !== saveWithContract.contract!.clubId)).toBe(true);
});

it('能力天花板保持单调，适应力不足时没有海外报价', () => {
  const high = generateProfessionalMarketOffers(highAbilitySave, content, seeded(3), 'permanent');
  const low = generateProfessionalMarketOffers(lowAbilitySave, content, seeded(3), 'permanent');
  expect(Math.max(...high.map((offer) => offer.clubTier), 0)).toBeGreaterThanOrEqual(
    Math.max(...low.map((offer) => offer.clubTier), 0),
  );
  expect(generateProfessionalMarketOffers(lowAdaptabilitySave, content, seeded(3), 'permanent')
    .every((offer) => !offer.overseas)).toBe(true);
});
```

- [ ] **Step 2: 运行失败测试**

运行：pnpm vitest run packages/simulation/tests/career/transfer-offers.test.ts

预期：FAIL，因为没有职业市场入口、报价没有 offerKind，且职业表现没有传入评分。

- [ ] **Step 3: 写最小模拟实现**

让 offer-generation.ts 从显式 performance 读取表现；职业市场传入 proSeasonStats，自由球员继续使用 seasonStats。构建报价时设置 offerKind，租借将 contractYears 固定为 1。候选池先排除当前合同俱乐部，海外候选仍须 adaptability >= 55，按兴趣和俱乐部 ID 稳定排序，最多返回 4 份。所有随机只消费调用方传入的派生 source，不推进 randomState.sequencePosition。

- [ ] **Step 4: 运行通过测试并提交**

运行：pnpm vitest run packages/simulation/tests/career/transfer-offers.test.ts packages/simulation/tests/career/offer-generation.test.ts，预期 PASS。

```bash
git add packages/simulation/src/career packages/simulation/src/index.ts packages/simulation/tests/career/transfer-offers.test.ts
git commit -m "feat: generate permanent and loan market offers"
```

---

### Task 3: 接入职业休赛期市场与签约语义

**Files:**
- Modify: packages/application/src/use-cases/transfer-flow.ts
- Modify: packages/application/src/index.ts
- Create: packages/application/tests/use-cases/transfer-market.test.ts
- Modify: packages/application/tests/use-cases/contract-flow.test.ts

**Interfaces:**

- requestCareerMarket(save, content, kind): CareerSaveV5Like：仅 pro-offseason，生成报价、写入 pendingOffers，并 upsert market-window 事实。
- signMarketOffer(save, offerId): CareerSaveV5Like：仅 pro-offseason，验证报价属于当前 pendingOffers，按 offerKind 签永久转会或租借。
- returnFromLoan(save, entry): CareerSaveV5Like：只允许已完成绑定赛季，验证 entry 来自当前 activeLoan，写入一次 loanHistory 后清空 activeLoan。
- generateFreeAgentOffers、signTransfer、retire 保持旧签名；signTransfer 复用内部永久签约函数。
- 下一赛季 ID 使用 pro- 加上上个 proSeason 开赛年份加一。签租借时清空已完成的旧 proSeason，避免上一赛季状态和下一赛季租借冲突。

- [ ] **Step 1: 写失败测试**

在测试文件中定义 proOffseasonSave()（由现有职业 fixture 完成一个赛季）、proSeasonSave()、parentClubId 和 loanOfferId。添加：

```ts
it('职业休赛期可以请求永久市场并记录事实', () => {
  const next = requestCareerMarket(proOffseasonSave(), content, 'permanent');
  expect(next.pendingOffers.every((offer) => offer.offerKind === 'permanent')).toBe(true);
  expect(next.ledger.at(-1)?.type).toBe('market-window');
});

it('签租借后母队合同保留', () => {
  const market = requestCareerMarket(proOffseasonSave(), content, 'loan');
  const loan = signMarketOffer(market, market.pendingOffers[0]!.id);
  expect(loan.contract!.clubId).toBe(parentClubId);
  expect(loan.activeLoan?.loanClubId).toBe(market.pendingOffers[0]!.clubId);
  expect(loan.proSeason).toBeNull();
  expect(loan.careerPhase).toBe('professional-contract');
});

it('非法阶段和过期报价不改变存档', () => {
  expect(() => requestCareerMarket(proSeasonSave(), content, 'loan')).toThrow(/pro-offseason/);
  const market = requestCareerMarket(proOffseasonSave(), content, 'loan');
  const expired = { ...market, pendingOffers: [] };
  expect(() => signMarketOffer(expired, market.pendingOffers[0]!.id)).toThrow(/要约不存在|失效/);
});
```

- [ ] **Step 2: 运行失败测试**

运行：pnpm vitest run packages/application/tests/use-cases/transfer-market.test.ts packages/application/tests/use-cases/contract-flow.test.ts

预期：FAIL，因为新的市场入口、账本事实和 activeLoan 建立逻辑不存在。

- [ ] **Step 3: 写最小 application 实现**

添加下一赛季日期、市场派生 seed 和账本 upsert helper。永久签约关闭旧的未结束 clubHistory，写入新合同、professional-contract、proSeason: null、清空报价和 transfer-signed 事实；海外状态按新合同更新。租借签约把当前合同复制为母队字段，把报价俱乐部写为目标队，保存开始/回归日期和目标队一年期信息，保留母队合同和母队未结束履历；重复请求同类市场不重复追加事实。

- [ ] **Step 4: 运行通过测试并提交**

运行同一 Vitest 命令，预期市场、过期报价、重复请求、自由球员兼容测试 PASS。

```bash
git add packages/application/src/use-cases/transfer-flow.ts packages/application/src/index.ts packages/application/tests/use-cases/transfer-market.test.ts packages/application/tests/use-cases/contract-flow.test.ts
git commit -m "feat: add professional transfer market flow"
```

---

### Task 4: 让职业赛季代表租借目标并自动回归

**Files:**
- Modify: packages/application/src/use-cases/pro-flow.ts
- Modify: packages/application/tests/use-cases/pro-flow.test.ts
- Modify: packages/simulation/tests/fixtures/pro-save.ts（仅在 fixture 需要新默认字段时）

**Interfaces:**

- startProfessionalSeason(save, clubs) 在有 activeLoan 时用 loanClubId 查找球队，要求赛季 ID 等于 activeLoan.seasonId，并验证内容包层级等于 loanClubTier。
- buildSeasonOutcome 当前层级按 activeLoan.loanClubTier 优先，荣誉和升降级证据使用 proSeason.clubId。
- completeProfessionalSeason 先读取目标队统计和成绩；租借不更新母队 clubHistory，创建 LoanHistoryEntry 后调用 returnFromLoan，清空租借状态；永久路径保留既有合同和 nextClubTier 继承。
- 租借回归后 proSeason.nextClubTier 为 null，下一赛季以母队合同层级为基础；续约报价显式使用 offerKind: 'permanent'。

- [ ] **Step 1: 写失败测试**

在 pro-flow.test.ts 顶部定义本地 finishProfessionalSeason(save)：反复调用 advanceProMonth 并处理 pending event；定义 completeLoanWithTargetRelegation() 覆盖最终积分榜；定义 completedLoanSave() 返回已完成且有 activeLoan 的存档。添加：

```ts
it('租借赛季使用目标队数据，结算后回到母队', () => {
  const signed = signMarketOffer(requestCareerMarket(proOffseasonSave(), content, 'loan'), loanOfferId);
  const started = startProfessionalSeason(signed, content.clubs);
  const completed = finishProfessionalSeason(started);
  const settled = completeProfessionalSeason(completed).save;
  expect(started.proSeason?.clubId).toBe(signed.activeLoan?.loanClubId);
  expect(settled.activeLoan).toBeNull();
  expect(settled.contract?.clubId).toBe(signed.contract?.clubId);
  expect(settled.loanHistory.at(-1)?.loanClubId).toBe(started.proSeason?.clubId);
  expect(settled.seasonHistory.at(-1)?.honours.every(({ clubId }) => clubId === started.proSeason?.clubId)).toBe(true);
});

it('目标队升降级不会污染母队合同层级', () => {
  const settled = completeProfessionalSeason(completeLoanWithTargetRelegation()).save;
  expect(settled.contract!.clubTier).toBe(parentTier);
  expect(settled.proSeason?.nextClubTier).toBeNull();
});

it('租借回归幂等', () => {
  const first = returnFromLoan(completedLoanSave(), loanHistoryEntry);
  expect(returnFromLoan(first, loanHistoryEntry)).toEqual(first);
});
```

finishProfessionalSeason 必须通过月度推进完成赛季，不得直接改写统计。

- [ ] **Step 2: 运行失败测试**

运行：pnpm vitest run packages/application/tests/use-cases/pro-flow.test.ts

预期：FAIL，当前开赛读取母队合同，结算会把目标队统计写入母队履历，且没有租借回归记录。

- [ ] **Step 3: 写最小 application 实现**

让开赛的当前俱乐部、海外标记、层级和赛程来源统一使用 activeLoan 优先，并校验绑定赛季。结算分出永久和租借路径：租借数据进入 loanHistory，目标队荣誉进入赛季历史，目标队层级不写入合同；永久路径保持原有 clubHistory、合同年限和层级逻辑。所有事实继续来自现有月度/比赛账本。

- [ ] **Step 4: 运行通过测试并提交**

运行 pnpm vitest run packages/application/tests/use-cases/pro-flow.test.ts packages/application/tests/use-cases/transfer-market.test.ts，预期租借目标队、合同归属、荣誉隔离、幂等回归及原有职业杯赛/升降级测试 PASS。

```bash
git add packages/application/src/use-cases/pro-flow.ts packages/application/tests/use-cases/pro-flow.test.ts packages/simulation/tests/fixtures/pro-save.ts
git commit -m "feat: complete loan season and return to parent club"
```

---

### Task 5: 补齐市场、租借状态和荣誉的可视化

**Files:**
- Modify: apps/web/src/app/App.tsx
- Modify: apps/web/src/career-dashboard/ProOffseasonPanel.tsx
- Modify: apps/web/src/career-dashboard/OfferComparisonPanel.tsx
- Modify: apps/web/src/career-dashboard/ProDashboard.tsx
- Modify: apps/web/src/career-dashboard/pro-presentation.ts
- Modify: apps/web/src/career-dashboard/CareerReviewPage.tsx
- Modify: apps/web/src/app/app.css
- Modify: apps/web/tests/career-dashboard/contract-ui.test.tsx
- Modify: apps/web/tests/career-dashboard/pro-dashboard.test.tsx
- Modify: apps/web/tests/career-dashboard/CareerReviewPage.test.tsx

**Interfaces:**

- ProOffseasonPanelProps 增加 onRequestMarket(kind: ContractOfferV3['offerKind']) 与 onSignMarketOffer(offerId: string)。
- OfferComparisonPanelProps 增加 marketMode?: 'permanent' | 'loan'，展示以 offer.offerKind 为准。
- CareerReviewData 增加 honours: SeasonHonour[]，clubs 和 overseasSpells 计入租借目标。
- ProDashboard 当前俱乐部名称优先使用 activeLoan.loanClubName，否则使用合同俱乐部名称。

- [ ] **Step 1: 写失败测试**

在 contract-ui.test.tsx 添加含两类报价的 fixture，断言“租借 · 合同仍归母队”“赛季末自动回归”和“预计角色”。在职业休赛期测试中断言“寻找永久转会”和“寻找租借机会”两个按钮；在回顾测试中断言租借俱乐部、租借标签、租借赛季数据和荣誉陈列。

- [ ] **Step 2: 运行失败测试**

运行：pnpm vitest run apps/web/tests/career-dashboard/contract-ui.test.tsx apps/web/tests/career-dashboard/pro-dashboard.test.tsx apps/web/tests/career-dashboard/CareerReviewPage.test.tsx

预期：FAIL，因为现有报价卡没有市场类别，休赛期没有市场入口，回顾没有租借和荣誉区块。

- [ ] **Step 3: 写最小 UI 实现**

App.tsx 只增加 request/sign 两个 application 回调；存档恢复仍只按 careerPhase 路由，web 不改写 activeLoan。休赛期显示母队合同卡、两个市场入口和当前市场报价；租借卡明确显示目标队、预计角色、薪资、合同仍归母队、代表目标队、自动回归日期。签约确认只出现一次。

ProDashboard 分开显示实际参赛队与合同母队；生涯回顾增加荣誉陈列和租借标签。使用既有 FootballGlyph、SceneBanner 与语义状态色提升标题对比度和卡片层次，保持移动端单列且无横向滚动。

- [ ] **Step 4: 运行通过测试并提交**

运行：pnpm vitest run apps/web/tests/career-dashboard/contract-ui.test.tsx apps/web/tests/career-dashboard/pro-dashboard.test.tsx apps/web/tests/career-dashboard/CareerReviewPage.test.tsx apps/web/tests/app/App.test.tsx，预期新旧职业市场 UI、实际参赛队和自由球员测试 PASS。

```bash
git add apps/web/src apps/web/tests/career-dashboard apps/web/tests/app/App.test.tsx
git commit -m "feat: present loan market and career honours"
```

---

### Task 6: 完成浏览器租借纵向切片

**Files:**
- Modify: apps/web/tests/e2e/professional-season.spec.ts

**Interfaces:**

- E2E 用 application 用例构造合法租借存档；浏览器只验证页面渲染、点击和回归提示。
- 流程固定为：休赛期 → 请求租借 → 选择报价 → 一次确认 → 开赛 → 月度推进至结算 → 自动回归母队。

- [ ] **Step 1: 写失败 E2E**

在 E2E 文件中定义 buildLoanSaveThroughApplication() 和 advanceAllProfessionalMonths(page)；前者复用现有 buildProSave 并调用 request/sign market，后者复用现有事件处理 helper。添加断言：

```ts
await expect(page.getByRole('button', { name: '寻找租借机会' })).toBeVisible();
await page.getByRole('button', { name: '寻找租借机会' }).click();
await expect(page.getByText('合同仍归母队')).toBeVisible();
await page.getByRole('button', { name: /选择这份租借/ }).first().click();
await page.getByRole('button', { name: '确认签署租借' }).click();
await page.getByRole('button', { name: '开始下个职业赛季' }).click();
await advanceAllProfessionalMonths(page);
await expect(page.getByText('租借已结束，已回到母队')).toBeVisible();
```

- [ ] **Step 2: 运行失败 E2E**

运行：pnpm exec playwright test apps/web/tests/e2e/professional-season.spec.ts --project=chromium

预期：FAIL，因为没有租借入口和自动回归的可见反馈。

- [ ] **Step 3: 写最小 E2E 支持**

使用 application 构造 fixture，不直接拼非法 activeLoan；推进期间遇到事件先完成反馈，再等待赛季总结。断言目标队、母队合同、租借数据、回归提示、场景 banner 和桌面/移动端无横向溢出。

- [ ] **Step 4: 运行通过测试并提交**

运行：pnpm exec playwright test apps/web/tests/e2e/professional-season.spec.ts，预期原有职业流程和新增租借流程均 PASS。

```bash
git add apps/web/tests/e2e/professional-season.spec.ts
git commit -m "test: cover loan career slice in browser"
```

---

### Task 7: 加入长期平衡指标并完成模块验收

**Files:**
- Modify: tools/balance/src/youth-season-metrics.ts
- Modify: tools/balance/src/run-youth-seasons.ts
- Modify: docs/ROADMAP.md
- Create: artifacts/youth-balance-m10-transfer-loan.json（由命令生成）

**Interfaces:**

- 报告增加 permanentTransferRate、loanRate、loanReturnRate、loanSeasonAppearanceRate、overseasMoveRate。
- loanReturnRate 分母为发生过租借的生涯；loanSeasonAppearanceRate 分母为完成租借赛季的生涯；前两类市场率分母分别是请求对应市场的生涯；overseasMoveRate 分母为所有转会签约。
- 平衡策略固定为：有合同先请求租借，无报价再请求永久市场，收到报价选第一份，租借完成后继续回归母队，30 岁后按现有规则退役；策略只用于模拟，不写入 UI。

- [ ] **Step 1: 写失败指标断言**

在现有 balance metrics 测试位置断言五个字段均为非负，并添加不变量：完成租借生涯至少有一条 loanHistory，回归后的 activeLoan === null，母队合同 ID 不改变。

- [ ] **Step 2: 运行失败平衡检查**

运行：pnpm balance:youth -- --runs 20 --seed-start 1 --output artifacts/youth-balance-m10-transfer-loan-smoke.json

预期：FAIL，报告没有新指标，生命周期没有使用新的职业市场路径。

- [ ] **Step 3: 写最小平衡实现**

在 LifecycleOutcome 保存市场请求、签约、租借完成、租借出场和海外流动计数；汇总时使用上述分母。职业模拟只通过 application 用例推进，逐月处理事件，并读取 loanHistory、proSeasonStats、clubHistory 与 contract 校验不变量。

- [ ] **Step 4: 运行完整门禁**

按顺序运行：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test:e2e
pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/youth-balance-m10-transfer-loan.json
```

记录每条命令的实际结果；如果根 pnpm test 仍只因既有 balance Vitest 超时而未完成，同时保留直接 1,000 生涯命令的结果，并在 roadmap 区分断言通过与测试超时。

- [ ] **Step 5: 更新进度并提交**

在 docs/ROADMAP.md 追加实际测试文件/用例数、类型/规范/构建、E2E、1,000 生涯完成率及五个新指标；未完成内容不得写成已完成。

```bash
git add tools/balance/src docs/ROADMAP.md artifacts/youth-balance-m10-transfer-loan.json
git commit -m "chore: balance transfer and loan career flow"
```

## Execution Notes

- Task 1–4 先完成领域闭环，再做 UI；每个任务的失败测试必须在实现前观察到失败。
- Task 5 只展示已保存状态，不在 panel 内决定层级、报价概率或回归时间。
- Task 6 是用户可检查的本地纵向切片；完成 Task 5 后启动开发服务器并报告可操作路径。
- Task 7 完成后才把 M10 转会/租借写入 docs/ROADMAP.md，并保留每个提交作为可回滚检查点。
- 训练界面和训练冗余问题留到后续训练体验模块，不与本模块混做。
