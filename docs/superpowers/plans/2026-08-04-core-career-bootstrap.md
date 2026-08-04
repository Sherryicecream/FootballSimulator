# Core Career Bootstrap Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable deterministic vertical slice: create a 16-year-old Chinese outfield player, apply a bounded regional profile, initialize a career, advance to the first youth opportunity, make one irreversible-in-memory choice, and view the result in a responsive web interface.

**Architecture:** Stable schemas live in `contracts`; validated static regional content lives in `content`; deterministic random draws and career transitions remain pure in `simulation`; `application` orchestrates use cases through ports; React renders application results without mutating simulation state. This slice deliberately stops before ordinary match simulation, the general event engine, Dexie persistence, and AI narration, which each require a separate vertical-slice plan.

**Tech Stack:** Node.js 24.16+, pnpm 11.9.0, TypeScript, Zod 4.4.3, Vitest 4.1.10, fast-check 4.9.0, React 19.2.8, Vite 8.2.0, Testing Library 16.3.2, Playwright 1.62.1

**Execution Choice:** Subagent-driven development with a fresh implementation subagent and review gate for each task. Status: planning complete; implementation has not started.

## Global Constraints

- The player-facing product is a local-first responsive web/PWA; this slice must run without a network connection after installation.
- The player starts at age 16, is Chinese, and selects an outfield position; goalkeeper is excluded.
- Supported positions are centre-back, full-back, defensive-midfielder, central-midfielder, winger, and striker.
- Region changes opportunity and initial-attribute distributions only slightly; it never changes potential and never assigns ethnicity-based physical or personality traits.
- Later training, coaching, matches, and migration must be able to outweigh birthplace effects.
- The same seed and the same choices must produce byte-equivalent mechanical state.
- `packages/simulation` may depend only on `@football/contracts`; it must not import React, browser APIs, storage, content files, or AI providers.
- `web` must call application use cases and must not directly mutate a `CareerSave`.
- Mechanical results are committed before narration; AI is absent from this slice.
- Do not create directories named `utils`, `helpers`, `common`, or `shared`.
- Keep focused source files below roughly 200 lines; split by domain responsibility when they grow beyond that.

## Slice Boundary and Acceptance Scenario

The executable acceptance path is:

1. Open the career creation page.
2. Enter a name and select homeland, primary/secondary position, preferred foot, weak-foot level, growth background, personality, and a visible seed.
3. Submit once and receive a valid `CareerSave` dated `2026-07-01`, age 16, with 16 visible attributes and hidden traits.
4. Advance by deterministic weekly transitions until one `YouthOpportunity` is pending.
5. Choose one offer; the choice is appended to the ledger and cannot be submitted twice.
6. View the resulting academy placement, visible attribute summary, date, seed fingerprint, and decision feedback.
7. Repeating the scenario with the same seed and choices produces the same mechanical state; changing the seed changes at least one generated value or offer.

---

### Task 1: Install and Wire the Slice Test Toolchain

**Files:**

- Modify: `package.json`
- Modify: `packages/contracts/package.json`
- Modify: `packages/content/package.json`
- Modify: `packages/simulation/package.json`
- Modify: `packages/application/package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/web/tsconfig.json`
- Modify: `tools/architecture/tests/workspace-structure.test.mjs`
- Create: `vitest.config.ts`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Modify: `pnpm-lock.yaml` (generated)

**Interfaces:**

- Consumes: the existing pnpm workspace and Node `>=24.16.0` engine constraint.
- Produces: root commands `test`, `test:unit`, and `test:e2e`; browser entry point `apps/web/index.html`; Vitest discovery for all workspace tests.

- [ ] **Step 1: Add a failing toolchain assertion**

Extend `tools/architecture/tests/repository-config.test.mjs` with:

```js
test('root package exposes slice verification commands', async () => {
  const rootPackage = JSON.parse(await read('package.json'));

  assert.equal(rootPackage.scripts.test, 'pnpm test:unit && pnpm test:architecture');
  assert.equal(rootPackage.scripts['test:unit'], 'vitest run');
  assert.equal(rootPackage.scripts['test:e2e'], 'playwright test');
});
```

- [ ] **Step 2: Verify the assertion fails**

Run: `pnpm test:architecture`

Expected: FAIL because `test`, `test:unit`, or `test:e2e` is missing.

- [ ] **Step 3: Add exact dependencies and configuration**

Run:

```powershell
pnpm add -Dw vitest@4.1.10 fast-check@4.9.0 @playwright/test@1.62.1
pnpm --filter @football/contracts add zod@4.4.3
pnpm --filter @football/web add react@19.2.8 react-dom@19.2.8 @football/application@workspace:* @football/content@workspace:* @football/contracts@workspace:*
pnpm --filter @football/web add -D vite@8.2.0 @vitejs/plugin-react@6.0.5 @testing-library/react@16.3.2 @testing-library/user-event@14.6.3 jsdom@30.0.1 @types/react@19.2.18 @types/react-dom@19.2.4
```

Set the root scripts to:

```json
{
  "test": "pnpm test:unit && pnpm test:architecture",
  "test:unit": "vitest run",
  "test:e2e": "playwright test"
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/*/tests/**/*.test.ts?(x)', 'packages/*/tests/**/*.test.ts'],
    environmentMatchGlobs: [['apps/web/tests/**/*.test.tsx', 'jsdom']],
    coverage: { reporter: ['text', 'json-summary'] },
  },
});
```

Create `apps/web/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [react()] });
```

Create `apps/web/index.html` with `<div id="root"></div>` and a module script loading `/src/index.tsx`; include `lang="zh-CN"` and a responsive viewport meta tag. Update the web TypeScript config to include DOM libraries and `vite.config.ts`.

Update the architecture dependency map so `@football/web` may compose `@football/content` alongside application and contracts. Keep the explicit prohibition against importing `@football/simulation` from web, and add a policy test proving that direct simulation access still fails.

- [ ] **Step 4: Verify toolchain and boundaries**

Run: `pnpm install --frozen-lockfile && pnpm test:architecture && pnpm typecheck`

Expected: all commands PASS; Vitest may report no tests only until Task 2, so do not run `test:unit` yet.

- [ ] **Step 5: Commit**

```powershell
git add package.json pnpm-lock.yaml vitest.config.ts apps/web packages tools/architecture/tests/repository-config.test.mjs
git commit -m "chore: add vertical slice test toolchain"
```

---

### Task 2: Define Player, Region, Random, and Career Contracts

**Files:**

- Create: `packages/contracts/src/player.ts`
- Create: `packages/contracts/src/region.ts`
- Create: `packages/contracts/src/random.ts`
- Create: `packages/contracts/src/career.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/contracts/tests/contracts.test.ts`

**Interfaces:**

- Consumes: Zod 4.4.3.
- Produces: `PlayerCreationInputSchema`, `RegionProfileSchema`, `RandomStateSchema`, `YouthOpportunitySchema`, `CareerSaveSchema`, and inferred TypeScript types with the same names minus `Schema`.

- [ ] **Step 1: Write contract tests**

Create tests asserting:

```ts
import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTE_KEYS,
  CareerSaveSchema,
  PlayerCreationInputSchema,
  RegionProfileSchema,
} from '../src/index.js';

describe('player contracts', () => {
  it('defines exactly 16 visible attributes and six outfield positions', () => {
    expect(ATTRIBUTE_KEYS).toHaveLength(16);
    expect(PlayerCreationInputSchema.shape.primaryPosition.options).toHaveLength(6);
  });

  it('rejects goalkeeper and an identical secondary position', () => {
    expect(() => PlayerCreationInputSchema.parse({
      name: '林岳', homelandId: 'shandong', primaryPosition: 'goalkeeper',
      secondaryPosition: null, preferredFoot: 'right', weakFoot: 3,
      background: 'academy', personality: 'composed', seed: 'career-001',
    })).toThrow();
  });
});

describe('regional constraints', () => {
  it('rejects attribute biases outside the bounded range', () => {
    expect(() => RegionProfileSchema.parse({
      id: 'invalid', name: '无效地区', group: 'focus',
      youthFacilities: 60, scoutingCoverage: 60, competition: 60,
      relocationCost: 40, climate: 'temperate', footballCulture: 'balanced',
      attributeBias: { stamina: 4 }, opportunityTags: ['academy'],
    })).toThrow();
  });
});

it('rejects a career missing any consistency-boundary member', () => {
  expect(() => CareerSaveSchema.parse({ schemaVersion: 1 })).toThrow();
});
```

- [ ] **Step 2: Verify tests fail**

Run: `pnpm test:unit -- packages/contracts/tests/contracts.test.ts`

Expected: FAIL because the new exports do not exist.

- [ ] **Step 3: Implement focused Zod contracts**

Use these exact discriminants:

```ts
export const POSITIONS = [
  'centre-back', 'full-back', 'defensive-midfielder',
  'central-midfielder', 'winger', 'striker',
] as const;

export const ATTRIBUTE_KEYS = [
  'firstTouch', 'dribbling', 'passing', 'shooting', 'defending', 'aerial',
  'pace', 'strength', 'stamina', 'agility',
  'movement', 'vision', 'decisions', 'composure', 'determination', 'discipline',
] as const;
```

`PlayerCreationInputSchema` must include trimmed `name` (1–40 characters), `homelandId`, primary and nullable secondary position, preferred foot, weak-foot integer 1–5, background (`academy | school | community | late-bloomer`), personality (`ambitious | composed | disciplined | expressive`), and seed (1–80 characters). Add a `superRefine` check rejecting identical primary and secondary positions.

`RegionProfileSchema` must contain `id`, display name, `focus | macro` group, five 0–100 environment ratings, climate/culture text, a partial attribute-bias record constrained to integers from -3 through 3, and non-empty opportunity tags. It must contain no potential field.

Define `CareerSaveSchema` as schema version `1` and content version `bootstrap-1`, with these required members:

```ts
type CareerSave = {
  schemaVersion: 1;
  contentVersion: 'bootstrap-1';
  careerId: string;
  player: PlayerCareer;
  world: { date: string; season: string; week: number };
  context: { academyId: string | null; pendingOpportunity: YouthOpportunity | null };
  relationships: { people: []; edges: [] };
  story: { bootstrapOpportunityWeek: number; resolvedOpportunityIds: string[] };
  ledger: CareerLedgerEntry[];
  random: RandomState;
};
```

Use a discriminated union for ledger entries: `career-started`, `week-advanced`, and `youth-opportunity-chosen`. Re-export every public contract from `src/index.ts`; do not export internal schema fragments.

- [ ] **Step 4: Run contract tests and typecheck**

Run: `pnpm test:unit -- packages/contracts/tests/contracts.test.ts && pnpm --filter @football/contracts typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts
git commit -m "feat: define career bootstrap contracts"
```

---

### Task 3: Build the Serializable Deterministic Random Source

**Files:**

- Create: `packages/simulation/src/randomness/deterministic-random.ts`
- Modify: `packages/simulation/src/index.ts`
- Create: `packages/simulation/tests/deterministic-random.test.ts`

**Interfaces:**

- Consumes: `RandomState { seed: string; cursor: number }` from contracts.
- Produces: `drawFloat(state)`, `drawInteger(state, min, max)`, `pickWeighted(state, candidates)`, each returning `{ value, state }` without mutating its input.

- [ ] **Step 1: Write deterministic and property tests**

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { drawFloat, drawInteger, pickWeighted } from '../src/index.js';

describe('deterministic random', () => {
  it('replays the same stream from the same state', () => {
    const state = { seed: '沪上-001', cursor: 0 };
    expect(drawFloat(state)).toEqual(drawFloat(state));
  });

  it('advances exactly one cursor position per draw', () => {
    expect(drawInteger({ seed: 's', cursor: 7 }, 1, 6).state.cursor).toBe(8);
  });

  it('always respects inclusive integer bounds', () => {
    fc.assert(fc.property(fc.string({ minLength: 1 }), fc.integer({ min: 0, max: 999 }),
      (seed, cursor) => {
        const { value } = drawInteger({ seed, cursor }, -3, 3);
        expect(value).toBeGreaterThanOrEqual(-3);
        expect(value).toBeLessThanOrEqual(3);
      }));
  });

  it('rejects empty or non-positive weighted candidates', () => {
    expect(() => pickWeighted({ seed: 's', cursor: 0 }, [])).toThrow();
  });
});
```

- [ ] **Step 2: Verify tests fail**

Run: `pnpm test:unit -- packages/simulation/tests/deterministic-random.test.ts`

Expected: FAIL because the functions are not exported.

- [ ] **Step 3: Implement a pure cursor-addressed generator**

Hash the UTF-8 seed plus `":" + cursor` into an unsigned 32-bit value using FNV-1a followed by a fixed avalanche step. Convert it to `[0, 1)` by division by `2 ** 32`. Every public draw validates inputs, returns a new state with `cursor + 1`, and never calls `Math.random`, `Date`, or platform crypto. Weighted selection must preserve candidate order and select by cumulative positive weight.

```ts
export type RandomDraw<T> = { readonly value: T; readonly state: RandomState };
export type WeightedCandidate<T> = { readonly value: T; readonly weight: number };
```

- [ ] **Step 4: Verify determinism and boundaries**

Run: `pnpm test:unit -- packages/simulation/tests/deterministic-random.test.ts && pnpm --filter @football/simulation typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/simulation
git commit -m "feat: add deterministic career random source"
```

---

### Task 4: Add Validated Chinese Regional Profiles

**Files:**

- Create: `packages/content/data/regions/china-bootstrap.ts`
- Create: `packages/content/src/regions/region-catalog.ts`
- Modify: `packages/content/src/index.ts`
- Create: `packages/content/tests/region-catalog.test.ts`

**Interfaces:**

- Consumes: `RegionProfileSchema` from contracts.
- Produces: `CHINA_REGION_PROFILES`, `listRegionProfiles()`, and `getRegionProfile(id)` returning immutable validated profiles.

- [ ] **Step 1: Write catalog and ethics-boundary tests**

Test that the catalog has unique IDs; includes `shanghai`, `shandong`, `xinjiang`, `guangdong`, `sichuan-chongqing`, `northeast`, and at least two macro-region fallbacks; parses every entry; contains no keys matching `/potential|ethnicity|race|personality/i`; and keeps every attribute bias within `[-3, 3]`.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm test:unit -- packages/content/tests/region-catalog.test.ts`

Expected: FAIL because the catalog is missing.

- [ ] **Step 3: Implement the catalog**

Create believable but bounded profiles:

- Shanghai: higher scouting coverage and facilities, higher competition and relocation cost.
- Shandong: strong academy/school pathways and broad local competition.
- Xinjiang: wider scouting variance and travel cost; only small environment-linked distribution effects, with no ethnic claim.
- Guangdong: strong school/community pathways and hot-humid climate adaptation context.
- Sichuan/Chongqing: community density and relocation/travel trade-offs.
- Northeast: school/academy tradition with colder climate context.
- North/Central and South/West macro fallbacks: neutral biases and moderate opportunity ratings.

Each profile must state in its copy that region influences exposure and starting distribution, not personal ceiling. Parse the exported array once at module load with `RegionProfileSchema.array().readonly().parse(...)` and throw a content-validation error on failure.

- [ ] **Step 4: Verify content and package types**

Run: `pnpm test:unit -- packages/content/tests/region-catalog.test.ts && pnpm --filter @football/content typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/content
git commit -m "feat: add bounded Chinese region profiles"
```

---

### Task 5: Generate a Valid 16-Year-Old Player

**Files:**

- Create: `packages/simulation/src/player-development/create-player.ts`
- Create: `packages/simulation/src/player-development/position-emphasis.ts`
- Modify: `packages/simulation/src/index.ts`
- Create: `packages/simulation/tests/create-player.test.ts`

**Interfaces:**

- Consumes: validated `PlayerCreationInput`, `RegionProfile`, and `RandomState`.
- Produces: `createPlayer(input, region, random): { player: PlayerCareer; random: RandomState }`.

- [ ] **Step 1: Write behavior and fairness tests**

Declare a valid `baseInput`, a neutral profile, and a biased profile parsed through their public schemas, then add these concrete assertions:

```ts
const generate = (seed: string, region: RegionProfile) => createPlayer(
  { ...baseInput, seed, homelandId: region.id },
  region,
  { seed, cursor: 0 },
);

it('creates all 16 visible attributes in the 1..100 range', () => {
  const { player } = generate('same-seed', neutralRegion);
  expect(Object.keys(player.attributes).toSorted()).toEqual([...ATTRIBUTE_KEYS].toSorted());
  expect(Object.values(player.attributes).every((value) => value >= 1 && value <= 100)).toBe(true);
});

it('is byte-equivalent for identical inputs', () => {
  expect(generate('same-seed', neutralRegion)).toEqual(generate('same-seed', neutralRegion));
});

it('changes generated values for a different seed', () => {
  expect(generate('seed-a', neutralRegion).player.attributes)
    .not.toEqual(generate('seed-b', neutralRegion).player.attributes);
});

it('keeps potential independent from homeland', () => {
  expect(generate('same-seed', neutralRegion).player.hidden.potential)
    .toEqual(generate('same-seed', biasedRegion).player.hidden.potential);
});

it('bounds every regional visible-attribute delta to three', () => {
  const neutral = generate('same-seed', neutralRegion).player.attributes;
  const biased = generate('same-seed', biasedRegion).player.attributes;
  for (const key of ATTRIBUTE_KEYS) expect(Math.abs(biased[key] - neutral[key])).toBeLessThanOrEqual(3);
});
```

- [ ] **Step 2: Verify tests fail**

Run: `pnpm test:unit -- packages/simulation/tests/create-player.test.ts`

Expected: FAIL because `createPlayer` is missing.

- [ ] **Step 3: Implement generation in a fixed draw order**

For every attribute in `ATTRIBUTE_KEYS`, draw a base integer from 35–55, add position emphasis (`0..6`), background emphasis (`0..3`), and bounded region bias (`-3..3`), then clamp to `1..100`. Generate each attribute potential independently from 58–92 using the seed namespace `seed + ':potential'` so changing only region cannot change potential. Generate stability, professionalism, pressure, adaptability, and injury tendency from 25–75.

Document the draw order beside the implementation and never iterate over object property enumeration for random draws; iterate over the exported ordered tuples. Preserve the final mechanical cursor in the returned `RandomState`.

- [ ] **Step 4: Run focused and property tests**

Run: `pnpm test:unit -- packages/simulation/tests/create-player.test.ts && pnpm --filter @football/simulation typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/simulation
git commit -m "feat: generate deterministic youth players"
```

---

### Task 6: Initialize the Career Consistency Boundary

**Files:**

- Create: `packages/simulation/src/career/start-career.ts`
- Create: `packages/simulation/src/career/career-identifiers.ts`
- Modify: `packages/simulation/src/index.ts`
- Create: `packages/simulation/tests/start-career.test.ts`

**Interfaces:**

- Consumes: `PlayerCreationInput`, `RegionProfile`, and `createPlayer`.
- Produces: `startCareer(input, region): CareerSave` with a deterministic ID and complete empty consistency-boundary members.

- [ ] **Step 1: Write initialization tests**

Assert exact initial state: `schemaVersion: 1`, `contentVersion: 'bootstrap-1'`, date `2026-07-01`, season `2026-27`, week `0`, age `16`, null academy/opportunity, empty relationships and resolved-opportunity IDs, a deterministic `bootstrapOpportunityWeek` in `[2, 4]`, exactly one `career-started` ledger entry, and a valid `CareerSaveSchema.parse(result)`.

Also assert `JSON.stringify(startCareer(input, region))` is identical across two runs and contains neither wall-clock timestamps nor UUID-v4 values.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm test:unit -- packages/simulation/tests/start-career.test.ts`

Expected: FAIL because `startCareer` is missing.

- [ ] **Step 3: Implement deterministic initialization**

Derive `careerId` as `career-` plus the first 12 lowercase hexadecimal characters of the existing deterministic seed hash. Use logical dates in ledger entries, not `Date.now()`. Validate the completed value with `CareerSaveSchema.parse` before returning it. Do not accept partially initialized saves.

- [ ] **Step 4: Verify schema-valid replay**

Run: `pnpm test:unit -- packages/simulation/tests/start-career.test.ts && pnpm test:unit -- packages/simulation/tests/deterministic-random.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/simulation
git commit -m "feat: initialize deterministic career saves"
```

---

### Task 7: Advance to and Resolve the First Youth Opportunity

**Files:**

- Create: `packages/simulation/src/career/advance-bootstrap-career.ts`
- Create: `packages/simulation/src/career/youth-opportunity.ts`
- Modify: `packages/simulation/src/index.ts`
- Create: `packages/simulation/tests/bootstrap-progression.test.ts`

**Interfaces:**

- Consumes: a schema-valid `CareerSave` and a `RegionProfile` supplied by the caller.
- Produces: `advanceOneWeek(save, region): CareerSave` and `chooseYouthOpportunity(save, optionId): CareerSave`.

- [ ] **Step 1: Write transition tests**

Test that:

- each advance increments week and date by exactly seven logical days and appends one ledger entry;
- an opportunity appears deterministically between weeks 2 and 4;
- offers contain 2–3 choices and include at least one local pathway;
- the same state produces the same next state without input mutation;
- choosing an available option sets `academyId`, clears the pending opportunity, records its ID in story state, and appends one choice ledger entry;
- submitting again or using an unknown option ID throws `CareerTransitionError` without changing the input;
- changing the seed changes the offer combination across a table of at least ten seeds.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm test:unit -- packages/simulation/tests/bootstrap-progression.test.ts`

Expected: FAIL because the transition functions do not exist.

- [ ] **Step 3: Implement pure weekly transitions**

Use a fixed offer pool with fictional, non-parodic academy names and three pathway kinds: `local-academy`, `school-elite`, and `relocation-academy`. Region scouting/facility ratings affect weights; relocation cost reduces relocation weight. The first opportunity week is the deterministic `story.bootstrapOpportunityWeek` draw in `[2, 4]` created by `startCareer`; never derive or redraw it during advancement.

Every transition must:

1. parse input with `CareerSaveSchema`;
2. compute a new object without mutation;
3. consume random draws in documented order;
4. append ledger facts;
5. parse the result before returning.

Use visible risk labels `low | medium | high`; do not expose exact weights or probabilities.

- [ ] **Step 4: Verify replay and invalid-transition safety**

Run: `pnpm test:unit -- packages/simulation/tests/bootstrap-progression.test.ts packages/simulation/tests/start-career.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts packages/simulation
git commit -m "feat: add first youth opportunity transition"
```

---

### Task 8: Orchestrate the Slice Through Application Use Cases

**Files:**

- Create: `packages/application/src/ports/bootstrap-content.ts`
- Create: `packages/application/src/use-cases/start-career.ts`
- Create: `packages/application/src/use-cases/advance-to-decision.ts`
- Create: `packages/application/src/use-cases/submit-youth-choice.ts`
- Modify: `packages/application/src/index.ts`
- Create: `packages/application/tests/bootstrap-use-cases.test.ts`

**Interfaces:**

- Consumes: simulation functions and a `BootstrapContentPort` exposing `getRegionProfile(id)`.
- Produces: use-case factories `createStartCareer`, `createAdvanceToDecision`, and `createSubmitYouthChoice`.

- [ ] **Step 1: Write orchestration tests with a fake content port**

```ts
const content: BootstrapContentPort = {
  getRegionProfile: (id) => id === region.id ? region : undefined,
};

it('rejects an unknown homeland before simulation', () => {
  expect(() => createStartCareer(content)({ ...input, homelandId: 'missing' }))
    .toThrowError('Unknown homeland: missing');
});

it('advances until exactly one decision is pending', () => {
  const career = createStartCareer(content)(input);
  const pending = createAdvanceToDecision(content)(career);
  expect(pending.context.pendingOpportunity).not.toBeNull();
  expect(pending.world.week).toBeGreaterThanOrEqual(2);
  expect(pending.world.week).toBeLessThanOrEqual(4);
});
```

Add a choice submission test and a 12-week loop guard test.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm test:unit -- packages/application/tests/bootstrap-use-cases.test.ts`

Expected: FAIL because the use cases and port are absent.

- [ ] **Step 3: Implement thin use cases**

Keep all mechanics in simulation. `createAdvanceToDecision` resolves the homeland profile from `career.player.homelandId`, repeatedly calls `advanceOneWeek`, and stops when a pending opportunity exists. Throw an application error after 12 iterations to prevent a corrupted state from hanging the UI. Re-export only public ports and factories.

- [ ] **Step 4: Verify the application boundary**

Run: `pnpm test:unit -- packages/application/tests/bootstrap-use-cases.test.ts && pnpm --filter @football/application typecheck && pnpm test:architecture`

Expected: PASS, including the rule that web cannot bypass application to mutate simulation state.

- [ ] **Step 5: Commit**

```powershell
git add packages/application
git commit -m "feat: orchestrate career bootstrap use cases"
```

---

### Task 9: Build the Responsive Career Creation and First-Decision UI

**Files:**

- Create: `apps/web/src/app/App.tsx`
- Create: `apps/web/src/app/bootstrap-dependencies.ts`
- Create: `apps/web/src/career-creation/CareerCreationForm.tsx`
- Create: `apps/web/src/career-creation/creation-options.ts`
- Create: `apps/web/src/event-choice/YouthOpportunityPanel.tsx`
- Create: `apps/web/src/career-dashboard/BootstrapCareerSummary.tsx`
- Create: `apps/web/src/design-system/tokens.css`
- Create: `apps/web/src/app/app.css`
- Replace: `apps/web/src/index.ts` with `apps/web/src/index.tsx`
- Create: `apps/web/tests/bootstrap-flow.test.tsx`

**Interfaces:**

- Consumes: application use-case factories, contracts, and content catalog adapter.
- Produces: an accessible single-page bootstrap flow; UI state holds returned immutable `CareerSave` snapshots only.

- [ ] **Step 1: Write the user-flow component test**

Use Testing Library and `userEvent` to enter `林岳`, choose Shanghai, centre-back, right foot, academy background, composed personality, seed `demo-001`, submit, inspect the opportunity, click its first enabled option, and assert the summary shows age 16, an academy placement, week/date, and a completed-choice message. Assert the decision buttons are disabled immediately after the first click.

Add accessibility-oriented assertions for associated labels, a single level-one heading, keyboard submission, textual risk labels, and `aria-live="polite"` feedback.

- [ ] **Step 2: Verify the UI test fails**

Run: `pnpm test:unit -- apps/web/tests/bootstrap-flow.test.tsx`

Expected: FAIL because the React components do not exist.

- [ ] **Step 3: Implement the smallest complete UI**

Use controlled form fields and schema validation. Display validation messages adjacent to fields and focus the first invalid field. After creation, call `advanceToDecision` once and replace the form with the opportunity panel. When an option is clicked, synchronously lock the panel, call `submitYouthChoice`, then render the career summary. Do not add a second confirmation for this ordinary choice.

The visual treatment should use the approved sports-magazine direction: off-white editorial canvas, dark ink, restrained red accent, tabular statistics, strong headline hierarchy, and card layouts that collapse to one column below 720px. Do not use color alone for risk or outcome. Keep all copy explicit that clubs and people are fictional.

- [ ] **Step 4: Verify component behavior and types**

Run: `pnpm test:unit -- apps/web/tests/bootstrap-flow.test.tsx && pnpm --filter @football/web typecheck && pnpm --filter @football/web exec vite build`

Expected: tests PASS and Vite emits a production build without network-loaded assets.

- [ ] **Step 5: Commit**

```powershell
git add apps/web
git commit -m "feat: add playable career bootstrap interface"
```

---

### Task 10: Add Desktop/Mobile Acceptance Coverage and Final Verification

**Files:**

- Create: `playwright.config.ts`
- Create: `apps/web/tests/e2e/bootstrap-career.spec.ts`
- Create: `docs/vertical-slices/core-career-bootstrap.md`
- Modify: `package.json`

**Interfaces:**

- Consumes: the built web application and complete bootstrap flow.
- Produces: Chromium desktop/mobile acceptance tests and a short slice boundary document for the next plan.

- [ ] **Step 1: Write failing end-to-end acceptance tests**

Create one shared flow and run it in two Playwright projects: desktop Chromium at `1440x900` and mobile Chromium using a Pixel 7 device descriptor. Assert creation, opportunity choice, completed summary, no horizontal overflow, keyboard reachability, and identical displayed seed fingerprint for two same-seed runs.

- [ ] **Step 2: Verify the E2E test initially fails**

Run: `pnpm exec playwright install chromium && pnpm test:e2e`

Expected: FAIL until the web server and project configuration are wired.

- [ ] **Step 3: Configure Playwright and document the boundary**

Configure `webServer.command` as `pnpm --filter @football/web exec vite --host 127.0.0.1`, base URL `http://127.0.0.1:5173`, one retry in CI, traces on first retry, and the two required viewport projects. The slice document must list implemented behavior, deterministic guarantees, intentionally deferred systems, and the next recommended plan: ordinary match simulation, season loop, and Dexie atomic persistence.

- [ ] **Step 4: Run the full verification matrix**

Run:

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm --filter @football/web exec vite build
pnpm test:e2e
git diff --check
```

Expected: every command exits `0`; unit/architecture/E2E tests pass; both viewport projects pass; Git reports no whitespace errors.

- [ ] **Step 5: Review determinism with a serialized fixture**

Run the same input and seed twice through start → advance → choose, serialize both final saves with `JSON.stringify`, and assert exact equality. Run a table of 20 distinct seeds and assert at least two distinct offer/attribute fingerprints. Store no golden save file unless the project later needs schema migration fixtures.

- [ ] **Step 6: Commit**

```powershell
git add package.json playwright.config.ts apps/web/tests/e2e docs/vertical-slices
git commit -m "test: verify career bootstrap vertical slice"
```

---

## Completion Gate

This plan is complete only when:

- all ten tasks have independent passing tests and atomic commits;
- `CareerSaveSchema` accepts every produced state and rejects incomplete state;
- same seed plus same choice yields byte-equivalent mechanical state;
- homeland never affects hidden potential and no regional attribute bias exceeds three points;
- a player can complete creation and the first youth decision on desktop and mobile Chromium;
- web imports no simulation package directly and simulation imports no content, React, browser, persistence, or AI modules;
- the final verification matrix exits successfully from a clean worktree.

## Deferred Follow-Up Plans

1. Ordinary match simulation, season calendar, squad opportunity, and Dexie atomic save transactions.
2. General event selection, delayed effects, person memory, relationship graph, and template narration.
3. Monthly development, fatigue, injury, coaching trust, and club role.
4. Transfer market, active overseas leagues, and national team.
5. Important-match position moments, retirement evaluation, balance tooling, and optional local AI.
