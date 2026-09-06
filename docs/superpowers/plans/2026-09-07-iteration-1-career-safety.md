# Iteration 1 Career Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every career path, make local multi-career saves trustworthy, and repair the blocking event-feedback readability defects without changing simulation balance or monthly gameplay.

**Architecture:** Add a v6 terminal-outcome envelope on top of the current v5 save, create application-owned career-ending use cases, and keep simulation review generation pure. Retain localStorage for this iteration, but replace fire-and-forget UI persistence with an awaited commit boundary and add a save-selector presentation layer that isolates valid and damaged slots.

**Tech Stack:** TypeScript 6/7, Zod 4, React 19, Vitest 4, Testing Library, Playwright, pnpm workspace, browser localStorage.

## Global Constraints

- `spec.md` is the long-term product baseline, `docs/ROADMAP.md` is the only progress entry, and this file is the single active plan under `docs/superpowers/plans/`.
- Keep the v3 player-facing monthly flow. Do not add weekly advance, fast-forward, or auto-season controls.
- `packages/simulation` stays deterministic and has no external runtime dependency beyond `@football/contracts`; do not consume browser, storage, React, or AI APIs there.
- `packages/application` owns career-phase transitions and pause/resume behavior; web components never assign `careerPhase` directly.
- A save becomes player-visible only after schema validation and successful storage. A failed write retains the previously committed save, route, report, pending event, and random position.
- Do not change match counts, appearance rules, growth, training, injuries, graduation eligibility, offer generation, event selection, or random-sequence semantics.
- New terminal data must migrate v1-v5 saves deterministically; no historical result may be regenerated.
- Use the existing design tokens for the event-feedback contrast repair. Do not perform the Iteration 4 visual redesign.
- Add a failing regression test before every behavior change.
- Before completion run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test:e2e`, and the 1,000-career balance command from the final task.
- Preserve the user's pre-existing changes in `packages/simulation/tests/player-development/player-factory.test.ts` and `packages/content/play-to-retirement.mts`; never stage them with an Iteration 1 commit unless the user explicitly changes scope.

---

## File and Interface Map

### New files

- `packages/contracts/src/career-end.ts`: v6 save, terminal reason schema, migration, and invariants.
- `packages/contracts/tests/career-v6.test.ts`: v6 parsing and v1-v5 migration regression tests.
- `packages/application/src/use-cases/end-career.ts`: all new terminal eligibility and transition functions; retains a compatibility `retire` wrapper.
- `packages/application/tests/use-cases/end-career.test.ts`: stage, idempotency, ledger, and RNG tests.
- `apps/web/src/career-saves/career-save-summary.ts`: pure conversion from a loaded slot to player-facing metadata.
- `apps/web/src/career-saves/CareerSaveSelector.tsx`: valid/damaged slot list and delete confirmation.
- `apps/web/src/career-saves/SaveStatusIndicator.tsx`: `saving`/`saved`/`error` feedback and retry.
- `apps/web/tests/career-saves/CareerSaveSelector.test.tsx`: selector behavior tests.
- `apps/web/tests/career-saves/SaveStatusIndicator.test.tsx`: persistence-status behavior tests.
- `apps/web/tests/e2e/career-safety.spec.ts`: full terminal and multi-save journeys.

### Modified files

- `packages/contracts/src/index.ts`: export v6 contracts.
- `packages/application/src/index.ts`: export terminal use cases.
- `packages/application/src/use-cases/load-career.ts`: normalize all loads to v6.
- `packages/application/src/use-cases/transfer-flow.ts`: remove the age-gated terminal implementation and delegate/export compatibility from `end-career.ts`.
- `packages/simulation/src/career/career-review.ts`: accept v6 and expose terminal presentation data.
- `packages/simulation/tests/career/career-review.test.ts`: cover a youth-only terminal save.
- `apps/web/src/persistence/local-storage-save.ts`: v6 wrapper, typed slot listing, safe write/delete errors.
- `apps/web/tests/persistence/local-storage-save.test.ts`: v6, sorting, damaged-slot, quota, and delete errors.
- `apps/web/src/app/App.tsx`: archive route, awaited commits, retry, and terminal routing.
- `apps/web/tests/app/App.test.tsx`: archive startup and commit-boundary regressions.
- `apps/web/src/career-dashboard/CareerDashboard.tsx`: replace destructive “新生涯” intent with archive navigation.
- `apps/web/src/career-dashboard/ProDashboard.tsx`: replace destructive “新生涯” intent with archive navigation.
- `apps/web/src/career-dashboard/OffseasonBriefing.tsx`: expose the youth terminal action only when eligible.
- `apps/web/src/career-dashboard/ProOffseasonPanel.tsx`: allow confirmed retirement below age 30.
- `apps/web/src/career-dashboard/CareerReviewPage.tsx`: display the ending and return to archives without deleting it.
- Related dashboard tests: update callbacks and assert terminal actions.
- `apps/web/src/event-choice/EventFeedbackPanel.tsx`: translate the remaining `NEXT` label.
- `apps/web/src/app/app.css`: token-based next-clue contrast and responsive text.
- `apps/web/tests/event-choice/EventFeedbackPanel.test.tsx`: localized clue regression.
- `spec.md`: replace inaccurate persistence wording and document terminal outcomes.
- `docs/ROADMAP.md`: record completion only after all gates pass.

---

### Task 1: Add the v6 career-ending contract and migration

**Files:**

- Create: `packages/contracts/src/career-end.ts`
- Create: `packages/contracts/tests/career-v6.test.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**

- Consumes: `CareerSaveV5Schema`, `CareerSaveV5`, `migrateCareerSaveV5` from `career-expansion.ts`.
- Produces: `CareerEndKind`, `CareerEnd`, `CareerSaveV6`, `CareerSaveV6Like`, `CareerEndSchema`, `CareerSaveV6Schema`, `migrateCareerSaveV6(raw: unknown): CareerSaveV6`.
- Invariant: `careerPhase === 'retired'` exactly when `careerEnd !== null`, and `retiredOn === careerEnd.endedOn` for a terminal v6 save.

- [ ] **Step 1: Write the v6 regression tests**

Create tests covering an active v5 save, a retired v5 save, valid v6 terminal kinds, a mismatched `retiredOn`, and deterministic v1-to-v6 migration:

```ts
import { describe, expect, it } from 'vitest';
import {
  CareerSaveV5Schema,
  CareerSaveV6Schema,
  migrateCareerSaveV6,
} from '../src/index';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

describe('CareerSaveV6 terminal boundary', () => {
  it('migrates an active v5 save with no career ending', () => {
    const v5 = CareerSaveV5Schema.parse({
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5,
      careerPhase: 'offseason',
    });
    const v6 = migrateCareerSaveV6(v5);
    expect(v6).toMatchObject({ schemaVersion: 6, careerPhase: 'offseason', careerEnd: null });
    expect(v6.randomState).toEqual(v5.randomState);
    expect(v6.ledger).toEqual(v5.ledger);
  });

  it('migrates a retired v5 save into a voluntary retirement ending', () => {
    const v5 = CareerSaveV5Schema.parse({
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5,
      careerPhase: 'retired',
      retiredOn: '2040-06-30',
    });
    expect(migrateCareerSaveV6(v5).careerEnd).toMatchObject({
      kind: 'voluntary-retirement',
      endedOn: '2040-06-30',
    });
  });

  it('rejects terminal fields that disagree', () => {
    const parsed = CareerSaveV6Schema.safeParse({
      ...migrateCareerSaveV6(buildYouthSaveV2Fixture()),
      careerPhase: 'retired',
      retiredOn: '2027-06-30',
      careerEnd: {
        kind: 'youth-no-contract',
        endedOn: '2027-06-29',
        summary: '青训年龄窗口结束，未获得职业合同。',
        evidenceIds: ['season-outcome-youth-2026'],
      },
    });
    expect(parsed.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the new contract test and verify it fails**

Run: `pnpm exec vitest run --project domain packages/contracts/tests/career-v6.test.ts`

Expected: FAIL because `CareerSaveV6Schema` and `migrateCareerSaveV6` are not exported.

- [ ] **Step 3: Implement the v6 schema and deterministic migration**

Create `career-end.ts` with strict schemas and `superRefine` invariants:

```ts
import { z } from 'zod';
import { CareerSaveV5Schema, migrateCareerSaveV5 } from './career-expansion';

const IdSchema = z.string().min(1).max(60);
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const CareerEndKindSchema = z.enum([
  'youth-no-contract',
  'voluntary-retirement',
  'market-exit',
]);
export type CareerEndKind = z.infer<typeof CareerEndKindSchema>;

export const CareerEndSchema = z.strictObject({
  kind: CareerEndKindSchema,
  endedOn: IsoDateSchema,
  summary: z.string().min(1).max(300),
  evidenceIds: z.array(IdSchema).max(20),
});
export type CareerEnd = z.infer<typeof CareerEndSchema>;

export const CareerSaveV6Schema = CareerSaveV5Schema.omit({ schemaVersion: true })
  .extend({
    schemaVersion: z.literal(6),
    careerEnd: CareerEndSchema.nullable().default(null),
  })
  .superRefine((save, ctx) => {
    const terminal = save.careerPhase === 'retired';
    if (terminal !== (save.careerEnd !== null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '终局阶段与终局原因不一致' });
    }
    if (save.careerEnd && save.retiredOn !== save.careerEnd.endedOn) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '终局日期与退役日期不一致' });
    }
  });

export type CareerSaveV6 = z.infer<typeof CareerSaveV6Schema>;
export type CareerSaveV6Like = Omit<CareerSaveV6, 'schemaVersion'> & { schemaVersion: number };

export const migrateCareerSaveV6 = (raw: unknown): CareerSaveV6 => {
  const existing = CareerSaveV6Schema.safeParse(raw);
  if (existing.success) return existing.data;
  const v5 = migrateCareerSaveV5(raw);
  const endedOn = v5.retiredOn ?? v5.proSeason?.endDate ?? v5.season.endDate;
  const retirementFacts = v5.ledger.filter(({ type }) => type === 'retirement').slice(-1);
  return CareerSaveV6Schema.parse({
    ...v5,
    schemaVersion: 6,
    careerEnd:
      v5.careerPhase === 'retired'
        ? {
            kind: 'voluntary-retirement',
            endedOn,
            summary: '球员正式结束了自己的足球生涯。',
            evidenceIds: retirementFacts.map(({ id }) => id),
          }
        : null,
    retiredOn: v5.careerPhase === 'retired' ? endedOn : v5.retiredOn,
  });
};
```

Export the file from `packages/contracts/src/index.ts`.

- [ ] **Step 4: Run contract and migration coverage**

Run: `pnpm exec vitest run --project domain packages/contracts/tests/career-v6.test.ts packages/contracts/tests/career-v5.test.ts packages/contracts/tests/save-migration.test.ts`

Expected: PASS with v1-v6 identity, ledger, and random state preserved.

- [ ] **Step 5: Commit the contract slice**

```bash
git add packages/contracts/src/career-end.ts packages/contracts/src/index.ts packages/contracts/tests/career-v6.test.ts
git commit -m "feat: add versioned career endings"
```

---

### Task 2: Add application-owned career-ending use cases

**Files:**

- Create: `packages/application/src/use-cases/end-career.ts`
- Create: `packages/application/tests/use-cases/end-career.test.ts`
- Modify: `packages/application/src/use-cases/transfer-flow.ts`
- Modify: `packages/application/src/use-cases/load-career.ts`
- Modify: `packages/application/src/index.ts`
- Modify: `tools/balance/src/run-youth-seasons.ts`

**Interfaces:**

- Consumes: `CareerSaveV6Like`, `CareerSaveV6Schema`, `migrateCareerSaveV6`, and `canContinueYouthSeason`.
- Produces:
  - `canEndYouthCareer(save: CareerSaveV6Like): boolean`
  - `endYouthCareer(save: CareerSaveV6Like): CareerSaveV6`
  - `endProfessionalCareer(save: CareerSaveV6Like, endedOn: string, kind?: 'voluntary-retirement' | 'market-exit'): CareerSaveV6`
  - `retire(save: CareerSaveV6Like, endedOn: string): CareerSaveV6` as the compatibility wrapper used by web and balance code.
- `loadCareer(raw, content)` now returns `CareerSaveV6`.

- [ ] **Step 1: Write failing terminal-use-case tests**

Cover the final youth failure, non-final youth rejection, under-30 professional retirement, mid-season rejection, market-exit restriction, idempotency, and random-state preservation:

Define `finalYouthOffseason` locally by composing the existing `createSave`, `finishSeason`, `completeYouthSeason`, and `enterOffseason` helpers from `packages/application/tests/fixtures/youth-save.ts`; override only `player.age` and the resulting `offseason.graduationEligible`. Define `professionalOffseason` by moving that save through the existing contract-flow and `startProfessionalSeason`, following `professionalOffseasonSave` in `transfer-market.test.ts`, then override only the requested age. Do not add production-only fixture builders.

```ts
it('ends a final youth window without a professional contract', () => {
  const save = finalYouthOffseason({ graduationEligible: false });
  const ended = endYouthCareer(save);
  expect(ended).toMatchObject({
    careerPhase: 'retired',
    retiredOn: save.season.endDate,
    careerEnd: { kind: 'youth-no-contract', endedOn: save.season.endDate },
  });
  expect(ended.randomState).toEqual(save.randomState);
  expect(ended.ledger.at(-1)).toMatchObject({
    type: 'retirement',
    id: `career-end-youth-${save.season.endDate}`,
  });
});

it('allows a 22-year-old professional to retire only in the offseason', () => {
  const save = professionalOffseason({ age: 22 });
  expect(endProfessionalCareer(save, '2030-06-30').careerEnd?.kind).toBe(
    'voluntary-retirement',
  );
  expect(() => endProfessionalCareer({ ...save, careerPhase: 'pro-season' }, '2030-06-30'))
    .toThrow('职业赛季进行中不能结束生涯');
});

it('keeps duplicate terminal submission idempotent', () => {
  const first = endYouthCareer(finalYouthOffseason({ graduationEligible: false }));
  expect(endYouthCareer(first)).toEqual(first);
});
```

- [ ] **Step 2: Run the use-case test and verify it fails**

Run: `pnpm exec vitest run --project domain packages/application/tests/use-cases/end-career.test.ts`

Expected: FAIL because the new terminal use cases do not exist.

- [ ] **Step 3: Implement one terminal transition function and thin public wrappers**

Use one internal constructor so every terminal path closes club history, clears offers, appends one fact, and validates v6:

```ts
const commitCareerEnd = (
  save: CareerSaveV6Like,
  ending: CareerEnd,
  fact: CareerLedgerEntryV2,
): CareerSaveV6 => {
  if (save.careerPhase === 'retired') return CareerSaveV6Schema.parse(save);
  return CareerSaveV6Schema.parse({
    ...save,
    schemaVersion: 6,
    careerPhase: 'retired',
    retiredOn: ending.endedOn,
    careerEnd: ending,
    pendingOffers: [],
    clubHistory: save.clubHistory.map((entry) =>
      entry.to === null ? { ...entry, to: ending.endedOn } : entry,
    ),
    ledger: save.ledger.some(({ id }) => id === fact.id) ? save.ledger : [...save.ledger, fact],
  });
};
```

Implement explicit eligibility checks. `endYouthCareer` must require final youth offseason plus failed eligibility. `market-exit` must require `free-agent`; voluntary retirement accepts only `pro-offseason` or `free-agent`. Keep the exported `retire` name as a wrapper so current balance behavior remains source-compatible, but remove the age check.

Update `loadCareer` to call `migrateCareerSaveV6`, and update the balance runner's save type/migration entry without changing its policy or retirement-age target.

- [ ] **Step 4: Run terminal, transfer, contract-flow, and balance unit regressions**

Run: `pnpm exec vitest run --project domain packages/application/tests/use-cases/end-career.test.ts packages/application/tests/use-cases/transfer-market.test.ts packages/application/tests/use-cases/contract-flow.test.ts`

Expected: PASS; existing `retire(save, date)` callers compile and behave as before except the removed age floor.

- [ ] **Step 5: Commit the application slice**

```bash
git add packages/application/src/use-cases/end-career.ts packages/application/src/use-cases/transfer-flow.ts packages/application/src/use-cases/load-career.ts packages/application/src/index.ts packages/application/tests/use-cases/end-career.test.ts tools/balance/src/run-youth-seasons.ts
git commit -m "feat: close failed and voluntary career paths"
```

---

### Task 3: Make career review honest for youth-only endings

**Files:**

- Modify: `packages/simulation/src/career/career-review.ts`
- Modify: `packages/simulation/tests/career/career-review.test.ts`
- Modify: `apps/web/src/career-dashboard/CareerReviewPage.tsx`
- Modify: `apps/web/tests/career-dashboard/CareerReviewPage.test.tsx`

**Interfaces:**

- Consumes: `CareerSaveV6Like.careerEnd`.
- Produces: `CareerReviewData.ending` with `{ kind: CareerEndKind; label: string; summary: string; endedOn: string }`.
- Keeps existing tier, dimensions, goals, replay, totals, honours, and behind-the-scenes fields stable.

- [ ] **Step 1: Write failing simulation and page tests for a youth-only ending**

Add a local test fixture by migrating the existing youth review fixture to v6 and setting `careerPhase`, `retiredOn`, `careerEnd`, and one matching retirement ledger fact. Keep this package test independent from `@football/application`: it must not import `endYouthCareer`. The fixture has zero clubs, zero professional seasons, `careerEnd.kind === 'youth-no-contract'`, and a retirement ledger fact:

```ts
it('builds an honest review for a youth career without a contract', () => {
  const ended = youthNoContractReviewSave();
  const review = buildCareerReview(ended);
  expect(review.ending).toEqual({
    kind: 'youth-no-contract',
    label: '青训生涯结束',
    summary: ended.careerEnd!.summary,
    endedOn: ended.careerEnd!.endedOn,
  });
  expect(review.clubs).toBe(0);
  expect(review.totals).toEqual({ appearances: 0, goals: 0, assists: 0, minutes: 0 });
  expect(review.replay.some(({ evidenceId }) => evidenceId.startsWith('career-end-youth-')))
    .toBe(true);
});
```

In the component test, assert “青训生涯结束” and the ending summary, and assert that the page does not claim a professional career.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `pnpm exec vitest run --project domain packages/simulation/tests/career/career-review.test.ts && pnpm exec vitest run --project web apps/web/tests/career-dashboard/CareerReviewPage.test.tsx`

Expected: FAIL because `CareerReviewData` has no `ending` and the retirement fact is not mapped to replay.

- [ ] **Step 3: Add terminal presentation and replay mapping**

Extend the review interface and derive the label without changing scoring formulas:

```ts
const END_LABELS: Record<CareerEndKind, string> = {
  'youth-no-contract': '青训生涯结束',
  'voluntary-retirement': '主动退役',
  'market-exit': '离开职业足坛',
};

const ending = save.careerEnd
  ? {
      kind: save.careerEnd.kind,
      label: END_LABELS[save.careerEnd.kind],
      summary: save.careerEnd.summary,
      endedOn: save.careerEnd.endedOn,
    }
  : null;
```

Add `retirement: 'milestone'` to `REPLAY_KIND_BY_LEDGER_TYPE`. Render `review.ending` near the top of `CareerReviewPage`, using the existing empty states for clubs, honours, loans, and national-team data.

- [ ] **Step 4: Run all review tests**

Run: `pnpm exec vitest run --project domain packages/simulation/tests/career/career-review.test.ts && pnpm exec vitest run --project web apps/web/tests/career-dashboard/CareerReviewPage.test.tsx`

Expected: PASS for youth-only and existing professional profiles; dimension scores remain unchanged for existing fixtures.

- [ ] **Step 5: Commit the review slice**

```bash
git add packages/simulation/src/career/career-review.ts packages/simulation/tests/career/career-review.test.ts apps/web/src/career-dashboard/CareerReviewPage.tsx apps/web/tests/career-dashboard/CareerReviewPage.test.tsx
git commit -m "feat: review careers that end before turning pro"
```

---

### Task 4: Replace the legacy v5 storage adapter with a typed v6 slot catalog

**Files:**

- Modify: `apps/web/src/persistence/local-storage-save.ts`
- Modify: `apps/web/tests/persistence/local-storage-save.test.ts`
- Modify: `apps/web/src/app/App.tsx` only for the adapter rename needed to keep compilation green; routing changes remain in later tasks.

**Interfaces:**

- Produces:
  - `CareerSlotLoadResult = { status: 'loaded'; slotId: string; savedAt: string; save: CareerSaveV6 } | { status: 'empty'; slotId: string } | { status: 'invalid'; slotId: string; savedAt: string | null; reason: string }`
  - `CareerSlotRecord = Exclude<CareerSlotLoadResult, { status: 'empty' }>`
  - `LoadedCareerSlot = Extract<CareerSlotRecord, { status: 'loaded' }>`
  - `LocalStorageCareerPort.save(slotId: string, save: CareerSaveV6): Promise<void>`
  - `LocalStorageCareerPort.load(slotId: string): Promise<CareerSlotLoadResult>`
  - `LocalStorageCareerPort.list(): Promise<CareerSlotRecord[]>`
  - `LocalStorageCareerPort.delete(slotId: string): Promise<void>`
  - `createLocalStorageCareerPort(): LocalStorageCareerPort`
- The wrapper stored at `football-save-${slotId}` is `{ version: 6, savedAt, data }`.

- [ ] **Step 1: Expand persistence tests before changing the adapter**

Add assertions for wrapper v6, savedAt, newest-first ordering, damaged slots, quota failures, and delete failures:

```ts
it('lists valid saves newest first and keeps damaged slots isolated', async () => {
  localStorage.setItem('football-save-broken', '{damaged');
  storeWrapped('older', migrateCareerSaveV6(mockSave), '2026-01-01T00:00:00.000Z');
  storeWrapped('newer', migrateCareerSaveV6({ ...mockSave, careerId: 'newer' }),
    '2026-02-01T00:00:00.000Z');
  const slots = await createLocalStorageCareerPort().list();
  expect(slots.map(({ slotId }) => slotId)).toEqual(['newer', 'older', 'broken']);
  expect(slots.at(-1)).toMatchObject({ status: 'invalid', slotId: 'broken' });
});

it('reports a failed write without replacing the previous raw save', async () => {
  const raw = localStorage.getItem('football-save-test-career');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new DOMException('quota', 'QuotaExceededError');
  });
  await expect(port.save('test-career', nextSave)).rejects.toThrow(
    '存储空间不足，无法保存生涯',
  );
  expect(localStorage.getItem('football-save-test-career')).toBe(raw);
});
```

- [ ] **Step 2: Run the persistence test and verify it fails**

Run: `pnpm exec vitest run --project web apps/web/tests/persistence/local-storage-save.test.ts`

Expected: FAIL because `createLocalStorageCareerPort` and typed slot records do not exist.

- [ ] **Step 3: Implement the v6 adapter and remove duplicate legacy behavior**

Use `migrateCareerSaveV6` on load, parse `savedAt` separately, and have `list()` call `load()` for every prefixed key. Sort loaded records by descending ISO `savedAt`, then invalid records by slot ID. Wrap write/delete exceptions with player-safe messages. Keep a temporary named export alias only if an untouched caller still requires it during this task; remove the alias by Task 6.

Do not silently rewrite a v1-v5 raw wrapper during read. The next successful player action writes a v6 wrapper.

- [ ] **Step 4: Run persistence and App compilation tests**

Run: `pnpm exec vitest run --project web apps/web/tests/persistence/local-storage-save.test.ts apps/web/tests/app/App.test.tsx`

Expected: PASS with legacy wrappers still readable and damaged wrappers retained.

- [ ] **Step 5: Commit the storage slice**

```bash
git add apps/web/src/persistence/local-storage-save.ts apps/web/tests/persistence/local-storage-save.test.ts apps/web/src/app/App.tsx
git commit -m "feat: catalog versioned local career saves"
```

---

### Task 5: Build the save-selector and save-status presentation components

**Files:**

- Create: `apps/web/src/career-saves/career-save-summary.ts`
- Create: `apps/web/src/career-saves/CareerSaveSelector.tsx`
- Create: `apps/web/src/career-saves/SaveStatusIndicator.tsx`
- Create: `apps/web/tests/career-saves/CareerSaveSelector.test.tsx`
- Create: `apps/web/tests/career-saves/SaveStatusIndicator.test.tsx`
- Modify: `apps/web/src/app/app.css`

**Interfaces:**

- `CareerSaveSummary = { slotId; playerName; age; location; phaseLabel; currentDate; savedAt; terminal }`.
- `buildCareerSaveSummary(record: LoadedCareerSlot, academyNames: ReadonlyMap<string, string>): CareerSaveSummary`.
- `CareerSaveSelectorProps = { records: readonly CareerSlotRecord[]; academyNames: ReadonlyMap<string, string>; busy: boolean; onContinue(slotId: string): void; onCreate(): void; onDelete(slotId: string): Promise<void> }`.
- `SaveCommitState = { status: 'idle' | 'saving' | 'saved' | 'error'; message?: string }`.
- `SaveStatusIndicatorProps = { state: SaveCommitState; onRetry(): void }`.

- [ ] **Step 1: Write selector and status component tests**

Cover a youth save, professional save, terminal save, damaged slot, create intent, delete confirmation/cancel, saving, saved, and retry:

```tsx
it('requires confirmation before deleting a named career', async () => {
  const onDelete = vi.fn().mockResolvedValue(undefined);
  render(<CareerSaveSelector records={[loadedSlot]} academyNames={academyNames}
    busy={false} onContinue={vi.fn()} onCreate={vi.fn()} onDelete={onDelete} />);
  await user.click(screen.getByRole('button', { name: '删除林岳的生涯' }));
  expect(onDelete).not.toHaveBeenCalled();
  expect(screen.getByRole('alertdialog', { name: '删除生涯确认' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: '确认删除' }));
  expect(onDelete).toHaveBeenCalledWith(loadedSlot.slotId);
});

it('offers retry after a failed save', async () => {
  const onRetry = vi.fn();
  render(<SaveStatusIndicator state={{ status: 'error', message: '保存失败' }}
    onRetry={onRetry} />);
  await user.click(screen.getByRole('button', { name: '重试保存' }));
  expect(onRetry).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the new component tests and verify they fail**

Run: `pnpm exec vitest run --project web apps/web/tests/career-saves/CareerSaveSelector.test.tsx apps/web/tests/career-saves/SaveStatusIndicator.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement pure summaries and controlled components**

Derive location in this order: terminal label, active loan club, current contract club, academy name, “尚未选择球队”. Derive current date from `proSeason.currentDate`, `offseason.nextSeasonStart`, or `season.currentDate`. Never expose raw internal IDs when a player-facing name exists.

Keep deletion state inside `CareerSaveSelector`, but keep slot mutations in App. The status indicator uses `role="status"` for saving/saved and `role="alert"` for error; the retry button exists only in error state.

- [ ] **Step 4: Run the component tests and web typecheck**

Run: `pnpm exec vitest run --project web apps/web/tests/career-saves/CareerSaveSelector.test.tsx apps/web/tests/career-saves/SaveStatusIndicator.test.tsx && pnpm --filter @football/web typecheck`

Expected: PASS with keyboard-accessible confirmation and no direct storage access in either component.

- [ ] **Step 5: Commit the presentation slice**

```bash
git add apps/web/src/career-saves apps/web/tests/career-saves apps/web/src/app/app.css
git commit -m "feat: add local career archive controls"
```

---

### Task 6: Introduce the awaited App commit boundary and archive startup

**Files:**

- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/tests/app/App.test.tsx`
- Modify: `apps/web/src/career-dashboard/CareerDashboard.tsx`
- Modify: `apps/web/src/career-dashboard/ProDashboard.tsx`
- Modify: corresponding dashboard component tests.

**Interfaces:**

- Add App step `'archives'`.
- `commitCareer(candidate: CareerSaveV5Like | CareerSaveV6Like, transition: (saved: CareerSaveV6) => void): Promise<void>` validates and writes before changing `save`, `report`, `outcome`, or `step`.
- `retryCommit(): Promise<void>` retries the exact normalized candidate and transition stored in a ref.
- Dashboards replace `onNewCareer` with `onOpenArchives`.

- [ ] **Step 1: Write App regressions for archive startup and failed writes**

Update the empty-store test to expect creation, and add existing-store, multi-store, and failed-write cases:

Extend the file-local storage mock with `failNextSetItem(error = new DOMException('Quota exceeded', 'QuotaExceededError'))`, implemented as a one-shot error consumed by the next `setItem`. Add `storeSave(save)` beside it to write the exact `{ version: 6, savedAt: '2030-06-30T12:00:00.000Z', data: save }` wrapper under `football-save-${save.careerId}`. Build `startParams` from the same explicit name, hometown, position, academy, and seed values used by the existing full-flow test; `createSaveWithPendingEvent` must reuse that test's deterministic pending-event setup.

```tsx
it('opens the archive when at least one career exists', async () => {
  storeSave(migrateCareerSaveV6(createCareerSave(startParams)));
  render(<App />);
  expect(await screen.findByRole('region', { name: '生涯档案' })).toBeVisible();
  expect(screen.getByRole('button', { name: /继续林岳的生涯/ })).toBeVisible();
});

it('does not leave the current event when saving its choice fails', async () => {
  storeSave(createSaveWithPendingEvent());
  failNextStorageWrite();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: '继续' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
  expect(screen.getByText('必须处理的事件')).toBeVisible();
  expect(screen.queryByRole('region', { name: '事件反馈' })).toBeNull();
});
```

- [ ] **Step 2: Run App tests and verify the new cases fail**

Run: `pnpm exec vitest run --project web apps/web/tests/app/App.test.tsx`

Expected: FAIL because App auto-loads the first slot and changes view before persistence completes.

- [ ] **Step 3: Implement archive loading and one awaited commit helper**

On mount, call `savePort.list()`. Route to creation for zero records and archives otherwise. Continue a valid slot only after selecting it. Refresh slot records after save and delete.

Use a retry ref holding the exact normalized save and transition:

```ts
type PendingCommit = {
  save: CareerSaveV6;
  transition: (saved: CareerSaveV6) => void;
};

const writeCommit = async ({ save: candidate, transition }: PendingCommit) => {
  setCommitState({ status: 'saving' });
  try {
    await savePort.save(candidate.careerId, candidate);
    setSave(candidate);
    transition(candidate);
    pendingCommit.current = null;
    setCommitState({ status: 'saved' });
  } catch (caught) {
    setCommitState({ status: 'error', message: message(caught) });
  }
};

const commitCareer = async (
  raw: CareerSaveV5Like | CareerSaveV6Like,
  transition: (saved: CareerSaveV6) => void,
) => {
  const pending = { save: migrateCareerSaveV6(raw), transition };
  pendingCommit.current = pending;
  await writeCommit(pending);
};
```

Convert every mutating handler—academy choice, month advance, event choice, feedback clear, training plan, offseason entry, next season, preferences/offers, contract signing/rejection, professional start/advance/settlement, national decision, renewal, market request/signing, wait window, and retirement—to await `commitCareer`. Set route/report/outcome changes only in the transition callback. Disable all mutation controls while saving.

Replace dashboard “新生涯” callbacks with archive navigation; creation from archives clears only in-memory selection and never calls delete.

- [ ] **Step 4: Run App, dashboard, persistence, and type checks**

Run: `pnpm exec vitest run --project web apps/web/tests/app/App.test.tsx apps/web/tests/persistence/local-storage-save.test.ts apps/web/tests/career-dashboard/CareerDashboard.test.tsx apps/web/tests/career-dashboard/pro-dashboard.test.tsx && pnpm --filter @football/web typecheck`

Expected: PASS; no `void savePort.save`, destructive `newCareer`, or `createLocalStorageCareerV4Port` reference remains.

- [ ] **Step 5: Commit the reliable commit boundary**

```bash
git add apps/web/src/app/App.tsx apps/web/tests/app/App.test.tsx apps/web/src/career-dashboard/CareerDashboard.tsx apps/web/src/career-dashboard/ProDashboard.tsx apps/web/tests/career-dashboard
git commit -m "fix: await autosave before changing career views"
```

---

### Task 7: Wire terminal actions into youth, professional, free-agent, and review screens

**Files:**

- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/career-dashboard/OffseasonBriefing.tsx`
- Modify: `apps/web/src/career-dashboard/ProOffseasonPanel.tsx`
- Modify: `apps/web/src/career-dashboard/CareerReviewPage.tsx`
- Modify: `apps/web/tests/career-dashboard/CareerReviewPage.test.tsx`
- Modify: `apps/web/tests/career-dashboard/contract-ui.test.tsx`
- Modify: `apps/web/tests/app/App.test.tsx`

**Interfaces:**

- `OffseasonBriefing` adds `onEndYouthCareer(): void` and shows it only when `canEndYouthCareer(save)` is true.
- `ProOffseasonPanel.onRetire()` remains the intent callback but its button is available at any age and always uses confirmation.
- The free-agent screen offers `onRetire` at any age; use `market-exit` only for the explicit “结束职业生涯” action when no offer is selected.
- `CareerReviewPage` replaces `onNewCareer` with `onOpenArchives`.

- [ ] **Step 1: Write failing UI terminal tests**

Cover a failed final youth window, cancellation, confirmed youth ending, age-22 professional retirement, free-agent market exit, and archive navigation from review:

```tsx
it('offers an explicit ending instead of a dead end after the final youth window', async () => {
  render(<OffseasonBriefing save={failedFinalYouthSave} outcome={outcome}
    academies={academies} canContinueYouth={false}
    onEndYouthCareer={onEndYouthCareer} />);
  expect(screen.getByRole('button', { name: '结束青训生涯' })).toBeVisible();
  expect(screen.queryByText('请先处理职业市场机会')).toBeNull();
});

it('allows a professional under 30 to open but cancel retirement confirmation', async () => {
  render(<ProOffseasonPanel save={age22Offseason} onRetire={onRetire}
    onStartNextSeason={vi.fn()} onAcceptRenewal={vi.fn()} onDeclineRenewal={vi.fn()}
    onRequestMarket={vi.fn()} onSignMarketOffer={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: '宣布退役' }));
  expect(screen.getByRole('alertdialog', { name: '退役确认' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: '继续职业生涯' }));
  expect(onRetire).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the focused UI tests and verify they fail**

Run: `pnpm exec vitest run --project web apps/web/tests/app/App.test.tsx apps/web/tests/career-dashboard/CareerReviewPage.test.tsx apps/web/tests/career-dashboard/contract-ui.test.tsx`

Expected: FAIL because the youth action is absent and retirement is hidden below age 30.

- [ ] **Step 3: Implement terminal confirmations and archive-safe review navigation**

Use `canEndYouthCareer` in App to pass an explicit action flag; the component itself renders copy and confirmation but never assigns a phase. Route confirmed actions through Task 2 use cases and Task 6 `commitCareer`.

Use distinct copy:

- youth: “结束青训生涯” / “确认结束并查看回顾”;
- voluntary retirement: “宣布退役” / “确认退役”;
- empty free-agent market: “结束职业生涯” / “确认离开职业足坛”.

After successful storage, route to `retired`. From the review page, “返回生涯档案” routes to archives and retains the terminal save.

- [ ] **Step 4: Run terminal UI and application regressions**

Run: `pnpm exec vitest run --project domain packages/application/tests/use-cases/end-career.test.ts && pnpm exec vitest run --project web apps/web/tests/app/App.test.tsx apps/web/tests/career-dashboard/CareerReviewPage.test.tsx apps/web/tests/career-dashboard/contract-ui.test.tsx`

Expected: PASS; no final-youth warning appears without a valid action.

- [ ] **Step 5: Commit the terminal UI slice**

```bash
git add apps/web/src/app/App.tsx apps/web/src/career-dashboard/OffseasonBriefing.tsx apps/web/src/career-dashboard/ProOffseasonPanel.tsx apps/web/src/career-dashboard/CareerReviewPage.tsx apps/web/tests/app/App.test.tsx apps/web/tests/career-dashboard
git commit -m "feat: expose safe career ending actions"
```

---

### Task 8: Repair next-clue contrast and localization

**Files:**

- Modify: `apps/web/src/event-choice/EventFeedbackPanel.tsx`
- Modify: `apps/web/src/app/app.css`
- Modify: `apps/web/tests/event-choice/EventFeedbackPanel.test.tsx`

**Interfaces:**

- No data-contract changes.
- The player-facing badge text is exactly `下一幕`.
- `.event-feedback-next`, `.event-feedback-next-intro`, and `.event-feedback-next-card` use existing design tokens and remain readable at 320px and 200% zoom.

- [ ] **Step 1: Add the localization and semantic-class regression**

```tsx
it('renders localized, readable next-story clues', () => {
  renderPanel({ nextEvents: [{ id: 'follow-up', title: '第一次配合' }] });
  const clue = screen.getByRole('region', { name: '下一幕线索' });
  expect(within(clue).getByText('下一幕')).toBeVisible();
  expect(within(clue).queryByText('NEXT')).toBeNull();
  expect(clue).toHaveClass('event-feedback-next');
});
```

- [ ] **Step 2: Run the feedback test and verify it fails**

Run: `pnpm exec vitest run --project web apps/web/tests/event-choice/EventFeedbackPanel.test.tsx`

Expected: FAIL because `NEXT` is still rendered.

- [ ] **Step 3: Translate the badge and replace translucent hard-coded colors**

Change the badge to `下一幕`. Use opaque design-token-backed surfaces and explicit text colors; retain a visible border and allow the card to wrap:

```css
.event-feedback-next {
  border: 1px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-ink);
}

.event-feedback-next-intro {
  color: var(--color-text-secondary);
}

.event-feedback-next-card {
  flex-wrap: wrap;
  border: 1px solid var(--color-border);
  background: var(--color-bg-muted);
}

.event-feedback-next-card span,
.event-feedback-next-card strong {
  color: var(--color-ink);
}
```

These token names already exist in the current stylesheet. Do not add a one-off palette.

- [ ] **Step 4: Run feedback and visual component tests**

Run: `pnpm exec vitest run --project web apps/web/tests/event-choice/EventFeedbackPanel.test.tsx apps/web/tests/event-choice/EventChoiceVisuals.test.tsx apps/web/tests/career-dashboard/CareerDashboardVisuals.test.tsx`

Expected: PASS with no `NEXT` text in the rendered feedback route.

- [ ] **Step 5: Commit the readability fix**

```bash
git add apps/web/src/event-choice/EventFeedbackPanel.tsx apps/web/src/app/app.css apps/web/tests/event-choice/EventFeedbackPanel.test.tsx
git commit -m "fix: clarify and localize next-story clues"
```

---

### Task 9: Add end-to-end journeys, run release gates, and close documentation

**Files:**

- Create: `apps/web/tests/e2e/career-safety.spec.ts`
- Create: `apps/web/tests/fixtures/career-safety.ts`
- Create: `artifacts/youth-balance-iteration-1-career-safety.json`
- Modify: `spec.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/superpowers/specs/2026-09-07-iteration-1-career-safety-design.md` status line only after verification.

**Interfaces:**

- No new runtime interfaces.
- E2E fixtures inject valid v6 wrappers through `page.addInitScript` and never mutate application state from the web layer.
- `career-safety.ts` exports deterministic `failedFinalYouthOffseasonV6`, `firstCareerV6`, `secondCareerV6`, and `age22ProfessionalOffseasonV6` builders by composing public application use cases; every returned value passes `CareerSaveV6Schema.parse`.
- `injectSave(page, save)` delegates to `injectSaves(page, [save])`; `injectSaves` installs `{ version: 6, savedAt, data }` wrappers under `football-save-${careerId}` before navigation.
- ROADMAP records actual command results and metrics, not intended values.

- [ ] **Step 1: Write the failing E2E journeys**

First create `apps/web/tests/fixtures/career-safety.ts` with the four typed builders listed above. Use fixed seeds `101`, `102`, and `122`; complete the youth calendar through public monthly/season use cases, and build the professional fixture through preferences, offer generation, signing, and professional-season settlement. Assert `CareerSaveV6Schema.parse` at each builder return so invalid shortcuts fail in fixture setup.

Then cover these independent browser journeys:

```ts
test('failed final youth career ends with a review and survives refresh', async ({ page }) => {
  await injectSave(page, failedFinalYouthOffseasonV6());
  await page.goto('/');
  await page.getByRole('button', { name: /继续.*的生涯/ }).click();
  await page.getByRole('button', { name: '结束青训生涯' }).click();
  await page.getByRole('button', { name: '确认结束并查看回顾' }).click();
  await expect(page.getByRole('region', { name: '生涯回顾' })).toContainText('青训生涯结束');
  await page.reload();
  await page.getByRole('button', { name: /查看.*的回顾/ }).click();
  await expect(page.getByRole('region', { name: '生涯回顾' })).toBeVisible();
});

test('two careers remain independently selectable and deletion is scoped', async ({ page }) => {
  await injectSaves(page, [firstCareerV6(), secondCareerV6()]);
  await page.goto('/');
  await expect(page.getByRole('region', { name: '生涯档案' })).toContainText('林岳');
  await expect(page.getByRole('region', { name: '生涯档案' })).toContainText('周川');
  await page.getByRole('button', { name: '删除林岳的生涯' }).click();
  await page.getByRole('button', { name: '确认删除' }).click();
  await expect(page.getByText('林岳')).toHaveCount(0);
  await expect(page.getByText('周川')).toBeVisible();
});
```

Also cover under-30 retirement, canceling terminal confirmation, pending-event refresh, pending-feedback refresh, and mobile overflow. Keep quota-failure behavior in deterministic component/integration tests because browser storage failure injection is engine-specific.

- [ ] **Step 2: Run the new E2E file and fix only Iteration 1 failures**

Run: `pnpm exec playwright test apps/web/tests/e2e/career-safety.spec.ts`

Expected before final fixes: at least one new journey fails. Correct only terminal, archive, save-boundary, or clue-readability behavior; do not change balance or Iteration 2 screens.

- [ ] **Step 3: Run all repository release gates**

Run each command separately and record its exact result:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test:e2e
pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/youth-balance-iteration-1-career-safety.json
```

Expected: all commands exit 0. Compare the new report with `artifacts/youth-balance-m11-tournaments.json`; graduation, severe injury, professional promise, national-team, overseas, world-class, and existing retirement distributions must have no unexplained drift. Add separate terminal-kind counts if the runner now records new endings; do not classify `youth-no-contract` as a professional retirement.

- [ ] **Step 4: Update the product baseline, progress entry, and design status**

Update `spec.md` to state the implemented localStorage multi-career behavior instead of IndexedDB/Dexie, document the three terminal kinds, and keep IndexedDB as a future storage option rather than a current fact. Update `docs/ROADMAP.md` with the completed Iteration 1 scope, exact gate counts, exact balance metrics, known limitations, and “Iteration 2 not started”. Change the design status to “已完成并验收” only after Step 3 passes.

- [ ] **Step 5: Check scope and staged content before the final commit**

Run:

```bash
git status --short
git diff --check
git diff --stat
git diff -- packages/simulation/tests/player-development/player-factory.test.ts packages/content/play-to-retirement.mts
```

Expected: the two pre-existing user paths remain unstaged and unchanged by this iteration. The implementation diff contains no match, growth, training, injury, graduation-threshold, offer-balance, event-weight, AI, illustration, monthly-report, attribute-display, depth-chart, club-identity, or fast-forward behavior changes.

- [ ] **Step 6: Commit the verified integration and documentation**

```bash
git add apps/web/tests/e2e/career-safety.spec.ts apps/web/tests/fixtures/career-safety.ts artifacts/youth-balance-iteration-1-career-safety.json spec.md docs/ROADMAP.md docs/superpowers/specs/2026-09-07-iteration-1-career-safety-design.md
git commit -m "docs: record iteration one career safety"
```

- [ ] **Step 7: Perform the final completion audit**

Confirm all nine tasks are committed, every checkbox has evidence, `git status --short` shows only the user's pre-existing paths, the active plan remains this file until handoff, and Iteration 2 has not begun. Report the exact commands and results to the user; do not claim completion from partial or historical test output.

---

## Plan Self-Review Traceability

| Confirmed design requirement | Implemented by |
| --- | --- |
| v6 ending reason and v1-v5 migration | Tasks 1–2 |
| Failed final youth route | Tasks 2, 3, 7, 9 |
| Retirement below age 30 in valid phases | Tasks 2, 7, 9 |
| Market exit without forced retirement | Tasks 2, 7 |
| Youth-only review | Task 3 |
| Await storage before UI state | Tasks 4, 6 |
| Retry exact failed commit | Task 6 |
| Multi-career archive and safe delete | Tasks 4–6, 9 |
| Damaged slot isolation | Tasks 4–6 |
| Next-clue contrast and Chinese label | Task 8 |
| Mobile, refresh, and full E2E coverage | Task 9 |
| Full quality gates and 1,000 careers | Task 9 |
| Explicit Iteration 2–4 exclusion | Global Constraints and Task 9 scope audit |
