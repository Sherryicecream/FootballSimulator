# Career Randomization and Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make new careers seed-randomize non-identity player traits, translate player-facing attributes to Chinese, hide relationship internals, and replace raw ledger rows with concise monthly summaries.

**Architecture:** Seeded profile generation belongs in the simulation player factory and is invoked by the application use case with identity-only inputs. The web layer gains pure presentation helpers for attribute labels and monthly ledger projection; React components consume those helpers without changing persisted contracts or simulation facts.

**Tech Stack:** TypeScript 6/7, React 19, Zod contracts, Vitest, Testing Library, Playwright, pnpm workspace.

## Global Constraints

- New careers expose only name, hometown, primary position, and preferred foot as player choices.
- Growth background, personality tendency, weak-foot ability, and initial attributes are deterministic functions of the save seed.
- The production UI does not show a seed field or provide a reroll action.
- Existing v1/v2 saves keep their stored profile, relationship graph, and ledger unchanged.
- Internal contract keys stay in English; player-facing attribute labels and recent-record copy are Chinese.
- The dashboard does not render people or numeric relationship values.
- Recent records show at most the latest three months and consolidate facts by theme.
- No new runtime dependencies and no unrelated balance changes.

---

## File Structure

- `packages/simulation/src/player-development/player-factory.ts`: owns seed-driven profile and ability generation.
- `packages/simulation/tests/player-development/player-factory.test.ts`: proves deterministic profile generation and bounded variability.
- `packages/application/src/use-cases/start-career.ts`: exposes identity-only career creation input and passes the seeded random source to the factory.
- `packages/application/tests/use-cases/start-career.test.ts`: proves save-level determinism and cross-seed variation.
- `apps/web/src/career-creation/CareerCreationForm.tsx`: collects identity fields and generates a hidden seed.
- `apps/web/src/career-creation/creation-options.ts`: retains only options still selected by the player.
- `apps/web/tests/career-creation/CareerCreationForm.test.tsx`: verifies removed controls and seed injection.
- `apps/web/src/career-dashboard/career-presentation.ts`: central Chinese label map and pure monthly record projector.
- `apps/web/tests/career-dashboard/career-presentation.test.ts`: unit tests labels, grouping, limits, and unknown facts.
- `apps/web/src/career-dashboard/CareerDashboard.tsx`: renders the simplified cards and monthly summaries.
- `apps/web/src/career-dashboard/BootstrapCareerSummary.tsx`: reuses the same attribute labels instead of carrying a duplicate map.
- `apps/web/tests/career-dashboard/CareerDashboard.test.tsx`: component-level assertions for Chinese output and hidden relationships.
- `apps/web/tests/career-dashboard/BootstrapCareerSummary.test.tsx`: guards the shared Chinese mapping.
- `apps/web/tests/app/App.test.tsx`: updates fixtures for identity-only career creation.
- `apps/web/tests/e2e/youth-season.spec.ts`: updates creation flow and checks the new dashboard presentation.
- Application test fixtures that call `createCareerSave`: remove no-longer-accepted profile fields.

---

### Task 1: Generate the Player Profile from the Save Seed

**Files:**
- Modify: `packages/simulation/src/player-development/player-factory.ts`
- Modify: `packages/simulation/tests/player-development/player-factory.test.ts`
- Modify: `packages/application/src/use-cases/start-career.ts`
- Modify: `packages/application/tests/use-cases/start-career.test.ts`
- Modify: `packages/application/tests/use-cases/bootstrap-use-cases.test.ts`
- Modify: `packages/application/tests/use-cases/create-youth-career-v2.test.ts`
- Modify: `packages/application/tests/use-cases/project-week-result.test.ts`
- Modify: `packages/application/tests/use-cases/submit-career-decision.test.ts`
- Modify: `packages/application/tests/use-cases/youth-career-headless-flow.test.ts`

**Interfaces:**
- Consumes: `SeededRandomSource.pick<T>()`, `SeededRandomSource.nextInt(min, max)`.
- Produces: `createPlayer(params: CreatePlayerParams, rng: SeededRandomSource): PlayerCareer`, where `CreatePlayerParams` contains identity fields only; `createCareerSave(params: StartCareerParams): CareerSave`, where `StartCareerParams` no longer contains generated profile fields.

- [ ] **Step 1: Write failing simulation tests for generated profile fields**

Add assertions that callers do not supply generated fields and that one seed reproduces the complete profile:

```ts
const identityParams = {
  name: '林河',
  hometown: '上海',
  primaryPosition: 'CENTER_BACK' as const,
  preferredFoot: 'RIGHT' as const,
  regionId: 'shanghai',
};

it('uses the seed to generate background personality and weak foot', () => {
  const first = createPlayer(identityParams, createSeededRandomSource(42));
  const second = createPlayer(identityParams, createSeededRandomSource(42));

  expect(first.identity.growthBackground).toBe(second.identity.growthBackground);
  expect(first.identity.personalityTendency).toBe(second.identity.personalityTendency);
  expect(first.identity.weakFootLevel).toBe(second.identity.weakFootLevel);
  expect(first.identity.weakFootLevel).toBeGreaterThanOrEqual(1);
  expect(first.identity.weakFootLevel).toBeLessThanOrEqual(5);
});

it('produces varied valid profiles across seeds', () => {
  const profiles = new Set(
    Array.from({ length: 24 }, (_, seed) => {
      const player = createPlayer(identityParams, createSeededRandomSource(seed));
      return [
        player.identity.growthBackground,
        player.identity.personalityTendency,
        player.identity.weakFootLevel,
      ].join('|');
    }),
  );
  expect(profiles.size).toBeGreaterThan(1);
});
```

- [ ] **Step 2: Run the focused simulation test and confirm RED**

Run: `pnpm vitest run packages/simulation/tests/player-development/player-factory.test.ts`

Expected: TypeScript/runtime failure because `CreatePlayerParams` still requires `weakFootLevel`, `growthBackground`, and `personalityTendency`.

- [ ] **Step 3: Implement deterministic profile generation in the player factory**

Use fixed internal pools and the existing seeded source:

```ts
const GROWTH_BACKGROUNDS = ['academy', 'school', 'community', 'late-bloomer'] as const;
const PERSONALITY_TENDENCIES = ['ambitious', 'composed', 'disciplined', 'expressive'] as const;

export interface CreatePlayerParams {
  name: string;
  hometown: string;
  primaryPosition: Position;
  secondaryPosition?: Position;
  preferredFoot: 'LEFT' | 'RIGHT' | 'BOTH';
  regionId: string;
}

const growthBackground = rng.pick(GROWTH_BACKGROUNDS);
const personalityTendency = rng.pick(PERSONALITY_TENDENCIES);
const weakFootLevel = rng.nextInt(1, 5);
```

Write those generated values into `PlayerIdentity` before generating the remaining seeded values. Keep existing position weights, region bonus, attribute bounds, hidden traits, age, stage, and reputation logic intact.

- [ ] **Step 4: Run the focused simulation test and confirm GREEN**

Run: `pnpm vitest run packages/simulation/tests/player-development/player-factory.test.ts`

Expected: all player-factory tests pass, including position and region constraints.

- [ ] **Step 5: Write failing application tests for identity-only inputs**

Change `defaultParams` to:

```ts
const defaultParams = {
  playerName: '张伟',
  hometown: '上海',
  primaryPosition: 'CENTER_BACK' as const,
  secondaryPosition: 'FULL_BACK' as const,
  preferredFoot: 'RIGHT' as const,
  regionId: 'shanghai',
  seed: 12345,
};
```

Extend the same-seed assertion to compare `growthBackground`, `personalityTendency`, and `weakFootLevel`. Extend the different-seed test to compare a combined profile object rather than relying on one individual field changing.

- [ ] **Step 6: Run the focused application test and confirm RED**

Run: `pnpm vitest run packages/application/tests/use-cases/start-career.test.ts`

Expected: compile failure because `StartCareerParams` still requires the generated fields.

- [ ] **Step 7: Simplify `StartCareerParams` and update application fixtures**

Remove `weakFootLevel`, `growthBackground`, and `personalityTendency` from `StartCareerParams` and from the object passed to `createPlayer`. Remove those three properties from every application test fixture listed in this task. Do not alter migration code: old stored values still enter through the existing save schemas.

- [ ] **Step 8: Run simulation and application tests**

Run: `pnpm vitest run packages/simulation/tests/player-development/player-factory.test.ts packages/application/tests/use-cases/start-career.test.ts packages/application/tests/use-cases/bootstrap-use-cases.test.ts packages/application/tests/use-cases/create-youth-career-v2.test.ts packages/application/tests/use-cases/project-week-result.test.ts packages/application/tests/use-cases/submit-career-decision.test.ts packages/application/tests/use-cases/youth-career-headless-flow.test.ts`

Expected: all selected tests pass.

- [ ] **Step 9: Commit the seed-generated profile**

```bash
git add packages/simulation/src/player-development/player-factory.ts packages/simulation/tests/player-development/player-factory.test.ts packages/application/src/use-cases/start-career.ts packages/application/tests/use-cases
git commit -m "feat: randomize new player profiles by seed"
```

---

### Task 2: Reduce Career Creation to Identity Choices

**Files:**
- Modify: `apps/web/src/career-creation/CareerCreationForm.tsx`
- Modify: `apps/web/src/career-creation/creation-options.ts`
- Modify: `apps/web/tests/career-creation/CareerCreationForm.test.tsx`
- Modify: `apps/web/tests/app/App.test.tsx`

**Interfaces:**
- Consumes: identity-only `StartCareerParams` from Task 1.
- Produces: `CareerCreationFormProps.seedFactory?: () => number`; the optional injection is for deterministic component tests and is not rendered.

- [ ] **Step 1: Write failing form tests for removed controls**

Add a deterministic seed factory and assert generated controls are absent:

```tsx
render(
  <CareerCreationForm
    onComplete={onComplete}
    content={createBootstrapContent()}
    seedFactory={() => 42}
  />,
);

expect(screen.queryByLabelText('逆足')).toBeNull();
expect(screen.queryByLabelText('成长背景')).toBeNull();
expect(screen.queryByLabelText('性格倾向')).toBeNull();
expect(screen.queryByLabelText('随机种子')).toBeNull();
```

After submitting valid identity fields, assert `save.randomState.seed === 42` and that the stored generated profile fields are present.

- [ ] **Step 2: Run the form test and confirm RED**

Run: `pnpm vitest run apps/web/tests/career-creation/CareerCreationForm.test.tsx`

Expected: failure because all four controls remain visible and `seedFactory` is not accepted.

- [ ] **Step 3: Remove generated-profile state and controls**

Delete `weakFoot`, `background`, `personality`, `seed`, their validation, and the corresponding selects/input. Define:

```ts
interface CareerCreationFormProps {
  onComplete: (save: CareerSave) => void;
  content: BootstrapContentPort;
  seedFactory?: () => number;
}

export function CareerCreationForm({
  onComplete,
  content,
  seedFactory = () => Math.floor(Math.random() * 2147483647),
}: CareerCreationFormProps) {
```

Submit only identity fields plus `regionId` and `seed: seedFactory()`. Delete unused `WEAK_FOOT_OPTIONS`, `BACKGROUND_OPTIONS`, and `PERSONALITY_OPTIONS` exports from `creation-options.ts`.

- [ ] **Step 4: Update app fixtures and run web unit tests**

Remove generated-profile properties from direct `createCareerSave` calls in `apps/web/tests/app/App.test.tsx` and dashboard fixtures that compile in this package.

Run: `pnpm vitest run apps/web/tests/career-creation/CareerCreationForm.test.tsx apps/web/tests/app/App.test.tsx`

Expected: both test files pass.

- [ ] **Step 5: Commit the simplified creation form**

```bash
git add apps/web/src/career-creation apps/web/tests/career-creation apps/web/tests/app/App.test.tsx
git commit -m "feat: simplify new career identity choices"
```

---

### Task 3: Add a Chinese Presentation Layer and Monthly Record Projection

**Files:**
- Create: `apps/web/src/career-dashboard/career-presentation.ts`
- Create: `apps/web/tests/career-dashboard/career-presentation.test.ts`
- Modify: `apps/web/src/career-dashboard/BootstrapCareerSummary.tsx`
- Modify: `apps/web/tests/career-dashboard/BootstrapCareerSummary.test.tsx`

**Interfaces:**
- Consumes: `CareerSaveV2['ledger']`, `CareerSaveV2['season']['startDate']`, internal attribute keys.
- Produces: `labelAttribute(attribute: string): string`; `buildRecentRecords(save: Pick<CareerSaveV2, 'season' | 'ledger'>, limit?: number): RecentRecord[]`; `RecentRecord = { monthKey: string; lines: string[] }`.

- [ ] **Step 1: Write failing tests for centralized attribute labels**

Create the presentation test with the complete mapping:

```ts
expect(labelAttribute('firstTouch')).toBe('停球');
expect(labelAttribute('aerialAbility')).toBe('头球');
expect(labelAttribute('offTheBall')).toBe('无球跑动');
expect(labelAttribute('discipline')).toBe('自律');
expect(labelAttribute('unrecognized')).toBe('其他能力');
```

- [ ] **Step 2: Write failing tests for monthly consolidation**

Build a minimal save projection whose ledger contains training, match, health, event, decision, relationship, and first-team entries across four calculated months. Assert:

```ts
const records = buildRecentRecords(saveProjection, 3);
expect(records).toHaveLength(3);
expect(records.map(({ monthKey }) => monthKey)).toEqual(['2024-12', '2024-11', '2024-10']);
expect(records.flatMap(({ lines }) => lines).join(' ')).not.toMatch(
  /training|match|health|event|decision|relationship|first-team/i,
);
expect(records.flatMap(({ lines }) => lines).join(' ')).toContain('比赛');
expect(records.flatMap(({ lines }) => lines).join(' ')).toContain('关键选择');
```

Also assert an empty ledger returns `[]` and an unknown/unhandled input never emits its internal key.

- [ ] **Step 3: Run the presentation test and confirm RED**

Run: `pnpm vitest run apps/web/tests/career-dashboard/career-presentation.test.ts`

Expected: module-not-found failure.

- [ ] **Step 4: Implement label and date projection helpers**

Create a typed immutable attribute map and the fallback:

```ts
export const ATTRIBUTE_LABELS = {
  firstTouch: '停球',
  dribbling: '盘带',
  passing: '传球',
  shooting: '射门',
  defending: '防守',
  aerialAbility: '头球',
  pace: '速度',
  strength: '力量',
  stamina: '耐力',
  agility: '灵活',
  offTheBall: '无球跑动',
  vision: '视野',
  decision: '决策',
  composure: '镇定',
  determination: '意志',
  discipline: '自律',
} as const;

export const labelAttribute = (attribute: string): string =>
  ATTRIBUTE_LABELS[attribute as keyof typeof ATTRIBUTE_LABELS] ?? '其他能力';
```

Convert `YYYY-WNN` to a month by adding `(weekNumber - 1) * 7` UTC days to `season.startDate`. Group facts newest-first and keep the latest `limit` months.

- [ ] **Step 5: Implement concise theme summaries**

For each month, count facts and emit no more than one line per theme:

```ts
if (matchCount > 0) lines.push(`本月参加 ${matchCount} 场比赛。`);
if (trainingCount + settlementCount > 0) lines.push('本月持续完成训练与能力积累。');
if (healthCount > 0) lines.push('本月出现健康状态变化，恢复情况需要关注。');
if (firstTeamCount > 0) lines.push('本月获得一线队相关关注与机会。');
if (offFieldCount > 0 || decisionCount > 0) {
  lines.push(`本月经历 ${offFieldCount} 次重要事件，并完成 ${decisionCount} 次关键选择。`);
}
```

Do not concatenate `fact.type`, `fact.summary`, IDs, participant IDs, or other raw ledger text. Omit zero-count themes. Treat relationship facts as part of `offFieldCount` so relationship effects remain narratively represented without showing people or scores.

- [ ] **Step 6: Reuse the label helper in the bootstrap summary**

Delete `KEY_ATTRIBUTES` labels from `BootstrapCareerSummary.tsx`. Keep only the ordered internal keys and render `labelAttribute(key)`. Update its test expectations to “无球跑动”“决策” and add an assertion that no internal English key is visible.

- [ ] **Step 7: Run presentation and bootstrap-summary tests**

Run: `pnpm vitest run apps/web/tests/career-dashboard/career-presentation.test.ts apps/web/tests/career-dashboard/BootstrapCareerSummary.test.tsx`

Expected: both pass.

- [ ] **Step 8: Commit presentation helpers**

```bash
git add apps/web/src/career-dashboard/career-presentation.ts apps/web/src/career-dashboard/BootstrapCareerSummary.tsx apps/web/tests/career-dashboard
git commit -m "feat: add Chinese career presentation helpers"
```

---

### Task 4: Integrate the Simplified Dashboard

**Files:**
- Modify: `apps/web/src/career-dashboard/CareerDashboard.tsx`
- Modify: `apps/web/tests/career-dashboard/CareerDashboard.test.tsx`
- Modify: `apps/web/tests/e2e/youth-season.spec.ts`

**Interfaces:**
- Consumes: `labelAttribute()` and `buildRecentRecords()` from Task 3.
- Produces: a dashboard with Chinese attributes, no relationship card, and up to three monthly record cards.

- [ ] **Step 1: Write failing dashboard assertions**

Extend the component fixture with at least one relationship and ledger facts. Assert:

```ts
expect(screen.getByText('停球')).toBeVisible();
expect(screen.getByText('无球跑动')).toBeVisible();
expect(screen.queryByText('firstTouch')).toBeNull();
expect(screen.queryByText('offTheBall')).toBeNull();
expect(screen.queryByText('关键人物')).toBeNull();
expect(screen.queryByText(/信任|尊重|亲近/)).toBeNull();
expect(screen.queryByText('training')).toBeNull();
expect(screen.getByText(/本月持续完成训练与能力积累/)).toBeVisible();
```

Add a report fixture whose `attributeChanges` contains `firstTouch`, then assert the report renders “停球” and not `firstTouch`.

- [ ] **Step 2: Run the dashboard test and confirm RED**

Run: `pnpm vitest run apps/web/tests/career-dashboard/CareerDashboard.test.tsx`

Expected: English keys and relationship content are still visible, and consolidated summaries are absent.

- [ ] **Step 3: Apply the shared Chinese labels**

When flattening attributes, render `labelAttribute(key)`. In the monthly report, map each `attributeChanges.attribute` through the same helper before formatting old/new values.

- [ ] **Step 4: Remove the relationship card**

Delete the complete “关键人物” section and `person-row` mapping from `CareerDashboard.tsx`. Do not mutate `save.relationships` and do not remove relationship CSS unless it is proven unused throughout the web app.

- [ ] **Step 5: Replace raw timeline details with monthly summaries**

Compute `const recentRecords = buildRecentRecords(save)` before returning JSX. Render one block per month with the month title and its one-to-five concise lines. If the result is empty, render `暂无重要生涯记录。`. Remove raw `<details>`, `fact.type`, and `fact.summary` output.

- [ ] **Step 6: Run dashboard and web tests**

Run: `pnpm vitest run apps/web/tests/career-dashboard/CareerDashboard.test.tsx apps/web/tests/career-dashboard/career-presentation.test.ts apps/web/tests/career-creation/CareerCreationForm.test.tsx apps/web/tests/app/App.test.tsx`

Expected: all selected tests pass.

- [ ] **Step 7: Update the E2E creation helper and assertions**

Remove interaction with the random-seed input from `createCareer(page)`. After entering the dashboard, assert “停球” is visible and “关键人物” is absent. Keep the monthly advance, interruption resolution, refresh restoration, mobile project, and full-season completion coverage unchanged.

- [ ] **Step 8: Run desktop and mobile E2E tests**

Run: `pnpm test:e2e -- apps/web/tests/e2e/youth-season.spec.ts`

Expected: creation, one-month persistence, and full-season tests pass in both configured browser projects.

- [ ] **Step 9: Commit dashboard integration**

```bash
git add apps/web/src/career-dashboard/CareerDashboard.tsx apps/web/tests/career-dashboard/CareerDashboard.test.tsx apps/web/tests/e2e/youth-season.spec.ts
git commit -m "feat: consolidate career dashboard information"
```

---

### Task 5: Full Regression and Quality Gate

**Files:**
- Modify only files required to fix failures caused by Tasks 1-4.

**Interfaces:**
- Consumes: completed implementation from Tasks 1-4.
- Produces: a clean branch with all repository quality gates passing.

- [ ] **Step 1: Run all unit and architecture tests**

Run: `pnpm test`

Expected: all unit test files and all architecture checks pass.

- [ ] **Step 2: Run static quality checks**

Run: `pnpm typecheck`

Expected: all workspace type checks pass.

Run: `pnpm lint`

Expected: zero warnings and zero errors.

Run: `pnpm format:check`

Expected: every tracked file conforms to Prettier.

- [ ] **Step 3: Run production build**

Run: `pnpm build`

Expected: Vite production build succeeds.

- [ ] **Step 4: Run complete E2E suite**

Run: `pnpm test:e2e`

Expected: all desktop and mobile browser tests pass.

- [ ] **Step 5: Review the diff for scope and player-facing English leakage**

Run: `git diff HEAD~4 --check`

Expected: no whitespace errors.

Search the modified dashboard and tests for rendered internal keys and relationship labels. Internal TypeScript identifiers and test fixture fields are allowed; JSX text output of `firstTouch`, `offTheBall`, `training`, `relationship`, `信任`, `尊重`, or `亲近` is not.

- [ ] **Step 6: Commit any verification-only corrections**

If verification required changes:

```bash
git add <only-the-files-corrected-during-verification>
git commit -m "fix: complete career presentation regression gate"
```

If no changes were required, do not create an empty commit.

---

## Self-Review Result

- Spec coverage: random profile generation, hidden controls, Chinese labels, relationship removal, three-month consolidation, old-save compatibility, and regression coverage each map to a task.
- Placeholder scan: no placeholder marker or unspecified implementation step remains.
- Type consistency: Task 3 defines the exact helpers consumed by Task 4; Task 1 defines the identity-only interfaces consumed by Task 2.
- Scope: the work remains one testable vertical UI/presentation change and does not require splitting into independent sub-projects.
