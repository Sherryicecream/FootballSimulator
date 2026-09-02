# 职业赛事深度 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 v4 职业赛季月度流程中加入一项可重放的国内杯赛、球员对球队赛果的窄幅影响、升降级和球队荣誉，并让仪表盘与赛季总结可见。

**Architecture:** 保留 `proSeason.fixtures` 为完整联赛赛程，在 `ProSeasonState.domesticCup` 中保存独立的八队三轮淘汰赛；杯赛签位和结果由 simulation 层使用显式输入与派生种子生成，application 层负责开启赛季、月度暂停/恢复和赛季结算，web 层只渲染 application 已保存的赛事结果。联赛积分榜只使用联赛 fixtures，杯赛晋级只使用杯赛 fixtures，避免两个赛事互相污染。

**Tech Stack:** TypeScript monorepo, Zod contracts, deterministic Mulberry32 random source, Vitest, React, Playwright, pnpm.

## Global Constraints

- `spec.md` 是长期产品基线，`docs/ROADMAP.md` 是唯一进度入口，当前执行计划是本文件。
- 浏览器继续使用 v3 月度职业流程，不新增面向玩家的逐周推进或快进按钮。
- `packages/simulation` 必须保持确定性、无外部运行时依赖，内容和随机种子显式传入。
- `packages/application` 拥有赛季创建、月度推进、暂停/恢复和阶段转换规则；UI 不复制比赛或升降级规则。
- `proSeason.fixtures` 必须始终保存完整联赛赛程；新增杯赛只保存于 `domesticCup.fixtures`。
- 赛事结果、杯赛晋级、升降级和荣誉必须进入保存数据或账本，不能只在 UI 中临时推导。
- 新字段要兼容旧 v4 存档；旧的进行中赛季不补造杯赛历史，新开启的职业赛季才创建杯赛。
- 球员影响只修正所在球队的进攻/中场/防守，绝对值最大为 ±4；未出场、重伤或预备队出场不影响一线队赛果。
- 同一保存、内容、赛季种子和推进顺序必须得到相同签位、比分、排名、晋级、荣誉和账本；杯赛派生随机源不推进现有职业比赛随机游标。
- 国内层级是 3–8，数字越大代表层级越高；排名前 2 升级、后 2 降级，8 级不能再升级，3 级不能再降级。
- 每个代码模块先写并观察失败回归测试，再写最小实现；每个绿色切片独立提交。
- 完成前运行 `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e` 和 roadmap 记录的 1,000 赛季平衡命令。

## 文件职责地图

- `packages/contracts/src/professional.ts`：职业杯赛状态、杯赛统计和下一季层级的 v4 schema。
- `packages/contracts/src/graduation.ts`：赛季历史荣誉结构。
- `packages/contracts/src/youth-season.ts`：职业杯赛/赛季结算账本事实类型（若复用已有 `pro-match` 与 `season-outcome`，只补其上下文字段）。
- `packages/simulation/src/career/domestic-cup.ts`：固定八队签位、三轮周次和晋级状态的纯函数。
- `packages/simulation/src/career/professional-week.ts`：联赛与杯赛周结算、球员影响修正和杯赛统计更新。
- `packages/simulation/src/index.ts`：导出杯赛纯函数和球员影响接口（仅导出需要被 application/test 使用的接口）。
- `packages/application/src/use-cases/pro-flow.ts`：创建杯赛、按有效层级生成球队、结算排名/升降级/荣誉并推进下一季。
- `packages/application/src/index.ts`：如果新增 application 对外类型，保持现有导出边界。
- `apps/web/src/career-dashboard/ProDashboard.tsx`：展示本赛季赛事、杯赛轮次/最近结果、分项统计和层级变化。
- `apps/web/src/career-dashboard/ProOffseasonPanel.tsx`：展示球队赛季、杯赛成绩、层级变化和本赛季荣誉。
- `apps/web/tests/career-dashboard/ProDashboard.test.tsx`、`pro-dashboard.test.tsx`：仪表盘渲染回归。
- `apps/web/tests/e2e/professional-season.spec.ts`：桌面/月度职业流程的杯赛与结算可见性。
- `packages/contracts/tests/professional-competition.test.ts`：schema、默认值和旧 v4 兼容。
- `packages/simulation/tests/career/domestic-cup.test.ts`：签位、赛程、晋级和确定性。
- `packages/simulation/tests/career/professional-week.test.ts`：球员影响、无影响条件、联赛/杯赛统计隔离。
- `packages/application/tests/use-cases/pro-flow.test.ts`：职业赛季创建、月度杯赛周、赛季结算、升降级和荣誉。
- `docs/ROADMAP.md`：只在模块完成后追加进度、验证结果和已知运行时边界。

---

### Task 1: 扩展职业存档契约并保留旧 v4 迁移

**Files:**
- Modify: `packages/contracts/src/professional.ts`
- Modify: `packages/contracts/src/graduation.ts`
- Modify: `packages/contracts/src/youth-season.ts`（只有在现有账本枚举不足以表达杯赛/赛季结算时）
- Create: `packages/contracts/tests/professional-competition.test.ts`
- Test existing: `packages/contracts/tests/career-v4.test.ts`

**Interfaces:**
- Produce `SeasonHonourSchema`/`SeasonHonour`，字段为 `id`、`kind: 'league-champion' | 'cup-champion' | 'promotion'`、`label`、`seasonId`、`clubId`、`evidenceId`。
- Produce `ProCupStateSchema`/`ProCupState`，字段为 `id`、`name`、`competitionId`、`entrants`、`fixtures`、`currentRound: 'quarterfinal' | 'semifinal' | 'final' | 'complete'`、`winnerClubId: string | null`、`completed`。
- Extend `ProSeasonState` with `domesticCup: ProCupState | null` and `nextClubTier: number | null`，两个字段都用兼容旧 v4 的默认值。
- Extend `ProSeasonStats` with `cupAppearances`、`cupMinutes`、`cupGoals`、`cupAssists`，默认值均为 0；联赛字段语义不变。
- Extend `SeasonHistorySummary` with `honours: SeasonHonour[]`，默认值为空数组；旧青训和旧职业历史仍可通过 schema。

**Test fixtures:** 在本测试文件中从 packages/simulation/tests/fixtures/pro-save.ts 导入现有 createProSave，再用对象展开构造旧存档切片；validCup 与 validProSeason 是测试内从完整 schema-valid 对象生成的常量，不引入生产夹具。


Define `createProSaveWithoutCompetitionDepthFields` in the test file as the result of copying `createProSave()` and deleting `domesticCup`, `nextClubTier`, the four cup-stat fields, and each history entry's `honours`; define `validCup` and `validProSeason` from the complete objects shown above.
- [x] **Step 1: Write the failing contract tests**

```ts
it('accepts a complete eight-team domestic cup and preserves its round state', () => {
  const parsed = ProCupStateSchema.parse({
    id: 'cup-pro-2030', name: '国内杯', competitionId: 'domestic-cup',
    entrants: ['club-a', 'club-b', 'club-c', 'club-d', 'club-e', 'club-f', 'club-g', 'club-h'],
    fixtures: [], currentRound: 'quarterfinal', winnerClubId: null, completed: false,
  });
  expect(parsed.entrants).toHaveLength(8);
});

it('fills new professional defaults when loading a legacy v4 save', () => {
  const legacy = createProSaveWithoutCompetitionDepthFields();
  const parsed = CareerSaveV4Schema.parse(legacy);
  expect(parsed.proSeason?.domesticCup).toBeNull();
  expect(parsed.proSeasonStats.cupAppearances).toBe(0);
  expect(parsed.seasonHistory[0]?.honours).toEqual([]);
});

it('rejects duplicate cup entrants and out-of-range next club tiers', () => {
  expect(() => ProCupStateSchema.parse({ ...validCup, entrants: ['club-a', 'club-a', ...validCup.entrants.slice(2)] })).toThrow();
  expect(() => ProSeasonStateSchema.parse({ ...validProSeason, nextClubTier: 9 })).toThrow();
});
```

- [x] **Step 2: Run the contract tests and verify they fail because the fields/schema do not exist**

Run: `pnpm exec vitest run packages/contracts/tests/professional-competition.test.ts --pool=threads --maxWorkers=1`

Expected: FAIL with missing exports/default fields or the duplicate-entrant validation not being present.

- [x] **Step 3: Add the minimum Zod schemas and defaults**

Implement `SeasonHonourSchema`, `ProCupStateSchema` with an array-level uniqueness refinement, and extend v4 schemas with nullable/default fields. Keep `ProFixtureSchema` unchanged so league fixtures remain the whole league schedule. Use `CareerSaveV4Schema` defaults that explicitly include every existing stats field plus the four cup fields.

- [x] **Step 4: Run focused and existing contract tests**

Run: `pnpm exec vitest run packages/contracts/tests/professional-competition.test.ts packages/contracts/tests/career-v4.test.ts --pool=threads --maxWorkers=1`

Expected: PASS, including old v4 migration defaults and existing v4 assertions.

- [x] **Step 5: Commit the contract slice**

```bash
git add packages/contracts/src/professional.ts packages/contracts/src/graduation.ts packages/contracts/src/youth-season.ts packages/contracts/tests/professional-competition.test.ts
git commit -m "feat: add professional competition save contracts"
```

### Task 2: Build deterministic domestic-cup scheduling and bracket transitions

**Files:**
- Create: `packages/simulation/src/career/domestic-cup.ts`
- Modify: `packages/simulation/src/index.ts`
- Create: `packages/simulation/tests/career/domestic-cup.test.ts`

**Interfaces:**
- Produce `createDomesticCup(clubs: readonly ClubProfile[], playerClubId: string, effectiveTier: number, seasonYear: string, seed: number): ProCupState`.
- Produce `advanceDomesticCup(cup: ProCupState, fixtureId: string, homeScore: number, awayScore: number, tieBreaker: number): ProCupState`；只接受当前轮次中未赛且属于该杯赛的 fixture，平局使用传入的确定性 tie-break 数选择晋级队。
- Fixtures 使用固定周次 `27`、`33`、`39`；首轮 4 场，半决赛 2 场，决赛 1 场。未开始轮次只保留已确定的对阵，不为未晋级队生成结果。

The `clubs` constant is `youthClubs.filter(({ overseas }) => !overseas)`; choose `club-tier-5-1` from that content list and define `validCup` immediately before the tests. Define `invalidCup` in the rejection test by copying the first fixture and changing only its `homeClubId` to `missing-club`.
- 候选队只从有效层级及相邻国内层级选择，球员俱乐部强制进入；不足时抛出领域错误。对 `overseas` 俱乐部直接拒绝国内杯生成。

- [x] **Step 1: Write failing scheduling and transition tests**

```ts
it('creates the same eight entrants and seven fixed cup fixtures for the same inputs', () => {
  const first = createDomesticCup(clubs, 'club-tier-5-1', 5, '2030', 99);
  const second = createDomesticCup(clubs, 'club-tier-5-1', 5, '2030', 99);
  expect(second).toEqual(first);
  expect(first.entrants).toContain('club-tier-5-1');
  expect(first.fixtures).toHaveLength(7);
  expect(first.fixtures.filter(({ weekKey }) => weekKey.endsWith('W27'))).toHaveLength(4);
  expect(first.fixtures.filter(({ weekKey }) => weekKey.endsWith('W33'))).toHaveLength(2);
  expect(first.fixtures.filter(({ weekKey }) => weekKey.endsWith('W39'))).toHaveLength(1);
});

it('advances only the winner of the current cup round and completes the final', () => {
  const cup = createDomesticCup(clubs, 'club-tier-5-1', 5, '2030', 99);
  const quarter = cup.fixtures.filter(({ weekKey }) => weekKey.endsWith('W27'))[0]!;
  const afterQuarter = advanceDomesticCup(cup, quarter.id, 2, 0, 0);
  expect(afterQuarter.fixtures.find(({ id }) => id === quarter.id)?.status).toBe('played');
  expect(afterQuarter.currentRound).toBe('quarterfinal');
  expect(afterQuarter.fixtures.filter(({ weekKey, status }) => weekKey.endsWith('W33') && status === 'scheduled')).toHaveLength(2);
  expect(() => advanceDomesticCup(afterQuarter, quarter.id, 1, 0, 0)).toThrow();
});

it('does not silently accept unknown or repeated entrants', () => {
  expect(() => createDomesticCup(clubs, 'missing-club', 5, '2030', 99)).toThrow();
  expect(() => advanceDomesticCup(invalidCup, 'missing-fixture', 1, 0, 0)).toThrow();
});
```

- [x] **Step 2: Run the cup tests and verify the expected missing-function/behavior failure**

Run: `pnpm exec vitest run packages/simulation/tests/career/domestic-cup.test.ts --pool=threads --maxWorkers=1`

Expected: FAIL because the new module and exports do not exist.

- [x] **Step 3: Implement the minimal pure bracket generator and transition function**

Use a local derived random source or integer shuffle seeded by `seed + seasonYear`; do not mutate a save random cursor. Validate club existence, domestic status, unique entrants, exact round fixture ownership, and one-time fixture settlement. Give every fixture a stable id containing competition, round, and index; mark results with `resultId` only when settled. Keep future-round fixture participants explicit and update them only after the preceding round is complete.

- [x] **Step 4: Run focused tests and determinism checks**

Run: `pnpm exec vitest run packages/simulation/tests/career/domestic-cup.test.ts --pool=threads --maxWorkers=1`

Expected: PASS with seven fixtures, fixed week separation, stable repeat output, and domain errors for invalid input.

- [x] **Step 5: Commit the pure simulation slice**

```bash
git add packages/simulation/src/career/domestic-cup.ts packages/simulation/src/index.ts packages/simulation/tests/career/domestic-cup.test.ts
git commit -m "feat: generate deterministic domestic cup brackets"
```

### Task 3: Integrate player impact, league/cup match isolation, and cup statistics into professional weeks

**Files:**
- Modify: `packages/simulation/src/career/professional-week.ts`
- Modify: `packages/simulation/tests/career/professional-week.test.ts`
- Modify: `packages/simulation/src/index.ts` only if a focused impact calculator is exported.

**Interfaces:**
- Keep `simulateProfessionalWeek<S extends CareerSaveV4Like>(save: S, clubs: readonly ClubProfile[]): ProWeekTransition<S>` unchanged for application callers.
- Add an internal `playerTeamImpact(save: CareerSaveV4Like, selection: ProAppearanceDecision, opponentStrength: number): number` returning an integer in `[-4, 4]`; expose it only if the test boundary requires a public pure function.
- League standings update only for fixtures in `pro.fixtures`; domestic cup settlement updates only `pro.domesticCup`, cup stats and cup facts.

Define `saveWithOwnLeagueFixture` by taking the existing valid professional fixture and setting `currentWeek` to the week before it; define `strongStarterSaveWithSameSeed` by copying it with the same seed, high visible abilities, fitness 95, fatigue 0, form 90, confidence 90, and coach evaluation 90. Define `injuredSave` with an active injury, `unavailableSave` with fitness 20, `reserveSelectionSave` with a depth/coach state that produces reserve appearance, and `saveAtCupQuarterfinalWeek` with a schema-valid cup whose player fixture is at week 27. Each builder starts from `createProSave()` and changes only the named fields.
- Existing `matchResult`/promise-review league semantics remain compatible; cup player appearances contribute to cup fields and overall totals at season settlement without being counted as league appearances.

- [x] **Step 1: Write failing professional-week regression tests**

```ts
it('lets a strong in-form starter create a bounded team-strength advantage', () => {
  const baseline = simulateProfessionalWeek(saveWithOwnLeagueFixture(), clubs).save;
  const improved = simulateProfessionalWeek(strongStarterSaveWithSameSeed(), clubs).save;
  const fact = improved.ledger.at(-1)!;
  expect(fact.type).toBe('pro-match');
  expect(fact.matchContext?.teamImpact).toBeGreaterThan(0);
  expect(fact.matchContext?.teamImpact).toBeLessThanOrEqual(4);
  expect(Math.abs((fact.matchContext?.teamImpact ?? 0))).toBeLessThanOrEqual(4);
  expect(baseline.proSeasonStats.leagueAppearances).toBeGreaterThanOrEqual(0);
});

it('gives no first-team team impact to an injured, unavailable, or reserve-only player', () => {
  for (const save of [injuredSave(), unavailableSave(), reserveSelectionSave()]) {
    const next = simulateProfessionalWeek(save, clubs).save;
    expect(next.ledger.at(-1)?.matchContext?.teamImpact ?? 0).toBe(0);
  }
});

it('settles a cup week without changing league standings and increments cup stats separately', () => {
  const save = saveAtCupQuarterfinalWeek();
  const next = simulateProfessionalWeek(save, clubs).save;
  expect(next.proSeason?.domesticCup?.fixtures.some(({ weekKey, status }) => weekKey.endsWith('W27') && status === 'played')).toBe(true);
  expect(next.proSeason?.standings).toEqual(save.proSeason?.standings);
  expect(next.proSeasonStats.cupAppearances + next.proSeasonStats.cupMinutes).toBeGreaterThan(0);
});
```

Because the existing `MatchContextSchema` is strict, first extend it with an optional `competitionId`/`teamImpact` only if these assertions are part of the persisted contract; otherwise assert on the returned fixture/result and preserve facts through a dedicated summary. The test must fail because current code has no cup settlement and ignores player strength in `simulateMatch`.

- [x] **Step 2: Run the focused tests and verify each failure is behavioral**

Run: `pnpm exec vitest run packages/simulation/tests/career/professional-week.test.ts --pool=threads --maxWorkers=1`

Expected: FAIL on missing cup updates or zero/absent team impact, not on malformed test fixtures.

- [x] **Step 3: Implement bounded player impact and competition-specific settlement**

Compute impact from weighted ability, form, confidence, fitness, fatigue, selection minutes and opponent strength; clamp to `[-4, 4]`. Apply it only to the player club’s attack/midfield/defence before calling `simulateMatch`. Keep base club strength, home advantage and seeded match randomness dominant. Use a derived cup seed based on `save.randomState.seed`, season id and fixture id, so cup processing does not consume the existing league RNG position. Update cup fixture status and pass final scores to `advanceDomesticCup`; create a `pro-match` fact with cup competition context; update cup stats only for actual cup appearances.

- [x] **Step 4: Run the focused, simulation-wide and type checks**

Run: `pnpm exec vitest run packages/simulation/tests/career/professional-week.test.ts packages/simulation/tests/career/domestic-cup.test.ts --pool=threads --maxWorkers=1`; then `pnpm typecheck`.

Expected: PASS; existing league tests retain their standings, random-position and save/reload expectations.

- [x] **Step 5: Commit the weekly simulation slice**

```bash
git add packages/simulation/src/career/professional-week.ts packages/simulation/tests/career/professional-week.test.ts packages/contracts/src/youth-season.ts
git commit -m "feat: connect professional player impact to cup matches"
```

### Task 4: Create/settle cup seasons in application and persist promotion, relegation, and honours

**Files:**
- Modify: `packages/application/src/use-cases/pro-flow.ts`
- Modify: `packages/application/tests/use-cases/pro-flow.test.ts`
- Modify: `packages/contracts/src/professional.ts` or `packages/contracts/src/graduation.ts` only if Task 1 exposes a missing type.

**Interfaces:**
- Keep `startProfessionalSeason(save, clubs)` and `completeProfessionalSeason(save)` signatures unchanged.
- `startProfessionalSeason` reads `save.proSeason?.nextClubTier` when starting a renewal/next season; it uses the effective tier for league competition and forces the contracted club into the candidate pool without rewriting static content.

Implement `saveWithCompletedLeagueAndCup` by copying the existing completed-save builder, setting the player club's legal standing rank, marking every cup fixture as played, and setting `winnerClubId` to the requested champion; implement `saveAtTierBoundary` by using the existing signed contract/club builder, changing only domestic `clubTier` and the player's standing rank, then marking the season completed. The resulting standings must satisfy `won + drawn + lost === played` and the points formula.
- `completeProfessionalSeason` writes exactly one season-history entry, exactly one set of honour facts, and exactly one `nextClubTier` result for a completed `proSeason`.
- Honour evidence ids point to real fixture/standing/season facts. League champion is rank 1; promotion/relegation applies only to the player’s club and respects tiers 3 and 8.

- [x] **Step 1: Write failing application tests**

```ts
it('creates a domestic cup containing the player club when a new professional season starts', () => {
  const started = startProfessionalSeason(signedProSave(), content.clubs);
  expect(started.proSeason?.domesticCup?.entrants).toContain(started.proSeason?.clubId);
  expect(started.proSeason?.domesticCup?.fixtures).toHaveLength(7);
});

it('settles a cup champion, league champion and player-club promotion into season history and ledger', () => {
  const completed = saveWithCompletedLeagueAndCup({ playerRank: 2, cupChampion: true });
  const settled = completeProfessionalSeason(completed).save;
  const honours = settled.seasonHistory.at(-1)!.honours;
  expect(honours.map(({ kind }) => kind)).toEqual(expect.arrayContaining(['cup-champion', 'promotion']));
  expect(settled.proSeason?.nextClubTier).toBe((completed.contract?.clubTier ?? 5) + 1);
  expect(settled.ledger.some(({ type, summary }) => type === 'season-outcome' && summary.includes('升级'))).toBe(true);
});

it('protects tier 8 from promotion and tier 3 from relegation', () => {
  expect(completeProfessionalSeason(saveAtTierBoundary(8, 1)).save.proSeason?.nextClubTier).toBe(8);
  expect(completeProfessionalSeason(saveAtTierBoundary(3, 12)).save.proSeason?.nextClubTier).toBe(3);
});

it('does not duplicate honours if season settlement is reloaded and called again through the guarded flow', () => {
  const first = completeProfessionalSeason(saveWithCompletedLeagueAndCup({ playerRank: 1 })).save;
  expect(first.seasonHistory.filter(({ seasonId }) => seasonId === first.proSeason?.id)).toHaveLength(1);
  expect(first.seasonHistory.at(-1)?.honours.filter(({ kind }) => kind === 'league-champion')).toHaveLength(1);
});
```

- [x] **Step 2: Run application tests and verify they fail on missing cup/settlement fields**

Run: `pnpm exec vitest run packages/application/tests/use-cases/pro-flow.test.ts --pool=threads --maxWorkers=1`

Expected: FAIL because season creation has no cup and settlement has no honours/next tier.

- [x] **Step 3: Add cup creation to `startProfessionalSeason`**

Select the effective domestic tier from `save.proSeason?.nextClubTier ?? contract.clubTier` for a next season, generate the same-tier league candidates with the player club forced into the list, then call `createDomesticCup` using the same season seed derivation family but a separate cup seed. Set cup stats to zero and `domesticCup` to the generated state. Keep overseas contracts on the existing overseas path and set `domesticCup: null`.

- [x] **Step 4: Add settlement helpers and persist season outcomes**

Implement focused helpers inside the application use case (or a domain-specific application file if the function exceeds 50 lines): sort standings with the existing points/goal-difference order; find the player club rank; derive next tier with boundary clamps; identify league/cup champions only from completed persisted results; create stable `SeasonHonour` ids/evidence ids; append a `season-outcome` fact only once. Add cup stats to season totals where the existing totals represent all professional appearances, but keep `seasonHistory.appearances` as league plus reserve plus cup appearances.

- [x] **Step 5: Run application regression tests and the contract/type checks**

Run: `pnpm exec vitest run packages/application/tests/use-cases/pro-flow.test.ts packages/contracts/tests/professional-competition.test.ts --pool=threads --maxWorkers=1`; then `pnpm typecheck`.

Expected: PASS, including renewal, national-team, promise-review, old v4 and existing professional-flow tests.

- [x] **Step 6: Commit the application slice**

```bash
git add packages/application/src/use-cases/pro-flow.ts packages/application/tests/use-cases/pro-flow.test.ts packages/contracts/src/professional.ts packages/contracts/src/graduation.ts
git commit -m "feat: settle professional honours and club tier movement"
```

### Task 5: Make competition depth visible in dashboard and offseason summary

**Files:**
- Modify: `apps/web/src/career-dashboard/ProDashboard.tsx`
- Modify: `apps/web/src/career-dashboard/ProOffseasonPanel.tsx`
- Modify: `apps/web/src/app/app.css` only for focused layout/style additions.
- Modify: `apps/web/tests/career-dashboard/ProDashboard.test.tsx`
- Modify: `apps/web/tests/career-dashboard/pro-dashboard.test.tsx`

**Interfaces:**
- UI reads `save.proSeason.domesticCup`, `save.proSeason.nextClubTier`, `save.proSeasonStats` and `save.seasonHistory.at(-1)?.honours`; it does not calculate match outcomes, brackets, promotion or honours.
- Dashboard adds an accessible “本赛季赛事” card with league rank, cup round, cup progress/recent cup result, and next-tier movement when available.

Implement `saveWithCompetitionDepth` by extending the existing dashboard fixture with a quarterfinal/semifinal cup state, `nextClubTier`, cup stats, and a history item containing a domestic-cup honour. Implement `settledSaveWithHonours` from that fixture with `careerPhase: 'pro-offseason'`; implement `legacySettledSave` by removing the new fields and relying on the schema-compatible save fixture.
- Dashboard and offseason show league/cup appearances and minutes separately while keeping existing national-team, promise and role cards.
- Offseason adds “球队赛季” and “本赛季荣誉”; empty/legacy cup state renders a neutral “本赛季暂无杯赛记录” message without crashing.

- [x] **Step 1: Write failing rendering tests**

```tsx
it('shows league position, cup round, cup result and tier movement on the professional dashboard', () => {
  render(<ProDashboard save={saveWithCompetitionDepth()} report={null} advancing={false} onAdvance={() => {}} onNewCareer={() => {}} />);
  expect(screen.getByRole('region', { name: '本赛季赛事' })).toHaveTextContent('联赛第 2 名');
  expect(screen.getByRole('region', { name: '本赛季赛事' })).toHaveTextContent('半决赛');
  expect(screen.getByRole('region', { name: '本赛季赛事' })).toHaveTextContent('升级');
  expect(screen.getByText(/联赛出场/)).toBeInTheDocument();
  expect(screen.getByText(/杯赛出场/)).toBeInTheDocument();
});

it('shows honours in the professional offseason and remains safe for a legacy save', () => {
  const { rerender } = render(<ProOffseasonPanel save={settledSaveWithHonours()} onStartNextSeason={() => {}} onAcceptRenewal={() => {}} onDeclineRenewal={() => {}} onRetire={() => {}} />);
  expect(screen.getByRole('region', { name: '本赛季荣誉' })).toHaveTextContent('国内杯冠军');
  rerender(<ProOffseasonPanel save={legacySettledSave()} onStartNextSeason={() => {}} onAcceptRenewal={() => {}} onDeclineRenewal={() => {}} onRetire={() => {}} />);
  expect(screen.getByText('本赛季暂无荣誉')).toBeInTheDocument();
});
```

- [x] **Step 2: Run the web tests and verify they fail because the regions/copy are absent**

Run: `pnpm exec vitest run apps/web/tests/career-dashboard/ProDashboard.test.tsx apps/web/tests/career-dashboard/pro-dashboard.test.tsx --pool=threads --maxWorkers=1`

Expected: FAIL on missing “本赛季赛事” or “本赛季荣誉” regions.

- [x] **Step 3: Render the persisted competition data with existing visual primitives**

Add small presentation-only label maps for cup round and honour kind. Derive the current league rank by reading the already persisted standings order only for display, render `FootballGlyph`/`StatusBadge`/`SceneBanner` where the existing dashboard uses them, and do not introduce an event or simulation calculation in React. Add responsive grid rules that keep the new card within the existing mobile one-column layout and do not create horizontal overflow.

- [x] **Step 4: Run focused web tests and E2E**

Run: `pnpm exec vitest run apps/web/tests/career-dashboard/ProDashboard.test.tsx apps/web/tests/career-dashboard/pro-dashboard.test.tsx --pool=threads --maxWorkers=1`; then `pnpm test:e2e -- apps/web/tests/e2e/professional-season.spec.ts`.

Expected: PASS on desktop and mobile snapshots/locators, with legacy saves rendering without exceptions.

- [x] **Step 5: Commit the presentation slice**

```bash
git add apps/web/src/career-dashboard/ProDashboard.tsx apps/web/src/career-dashboard/ProOffseasonPanel.tsx apps/web/src/app/app.css apps/web/tests/career-dashboard/ProDashboard.test.tsx apps/web/tests/career-dashboard/pro-dashboard.test.tsx
git commit -m "feat: show professional competitions and honours"
```

### Task 6: Full regression, balance evidence, and roadmap checkpoint

**Files:**
- Modify: `apps/web/tests/e2e/professional-season.spec.ts`
- Modify: `docs/ROADMAP.md`
- No generated build or balance artifacts are committed; keep them under ignored `artifacts/`.

**Interfaces:**
- E2E must exercise monthly UI flow through a cup week, verify cup state is visible, verify a completed cup/season summary, and cover at least one promotion or elimination path without adding weekly player controls.
- Roadmap records exact command results, test counts, build status, and any balance-runner timeout separately from semantic balance results.

- [x] **Step 1: Add the failing E2E assertions for cup and honours**

Add locators for `本赛季赛事`, `杯赛`, `本赛季荣誉` and the completed-season summary to the existing professional-season journey. The test must initially fail because the UI and simulation have not yet exposed these states.

- [x] **Step 2: Run the targeted E2E and verify the failure is a missing user-visible feature**

Run: `pnpm test:e2e -- apps/web/tests/e2e/professional-season.spec.ts`

Expected: FAIL only on the new cup/honour assertions before Tasks 3–5 are implemented.

- [x] **Step 3: Run the complete required verification suite**

Run exactly:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test:e2e
pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/youth-balance-m10-professional-competition.json
```

If the monorepo balance Vitest project exceeds its configured 600-second test timeout, run the documented direct balance command, preserve its output path and metrics, and record the runner timeout without replacing the 1,000-season evidence with a smaller sample.

- [x] **Step 4: Review the diff and update roadmap**

Check `git diff --check`, `git status --short`, and the staged diff for secrets, generated output, accidental weekly controls, duplicate facts, or UI-only rules. Append to `docs/ROADMAP.md` the module status, exact validation counts/results, balance metrics path, compatibility notes, and the next module (transfer/loan market).

- [x] **Step 5: Commit the verification/documentation checkpoint**

```bash
git add apps/web/tests/e2e/professional-season.spec.ts docs/ROADMAP.md
git commit -m "docs: record professional competition depth verification"
```

## Completion Handoff

完成 Task 1–6 后，向用户逐项汇报：

1. 新职业赛季如何生成杯赛、何时产生赛果、如何保存和恢复。
2. 球员能力/状态/出场如何影响球队且为什么不会失真。
3. 联赛排名、杯赛晋级、升降级和荣誉分别在哪里可见。
4. 每个原子提交的检查点、完整验证命令结果和本地预览地址。
5. 明确未在本模块改动的转会/租借市场和训练可视化，并列出下一模块入口。

