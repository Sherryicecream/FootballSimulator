# 球员成长与训练系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow players to control training focus (position-specific) and intensity (light/normal/intense), with intense training introducing a small injury risk.

**Architecture:** Extend CareerContext with training focus/intensity, modify simulateTraining() to accept parameters with intensity-based growth multipliers, add injury boolean to TrainingSummary, and add a TrainingSettings UI panel to the dashboard.

**Tech Stack:** TypeScript, Zod, React 19, Vitest

---

## File Structure

### Files to Modify:
- `packages/contracts/src/career.ts` — Add TrainingIntensitySchema, extend CareerContextSchema, TrainingSummarySchema
- `packages/simulation/src/player-development/training.ts` — Add focus/intensity params, injury logic
- `packages/simulation/src/career/weekly-advance.ts` — Pass training settings from save context
- `packages/application/src/use-cases/advance-career-week.ts` — Pass training context
- `packages/application/src/use-cases/batch-advance.ts` — Pass training context
- `apps/web/src/career-dashboard/CareerDashboard.tsx` — Add TrainingSettings panel
- `packages/simulation/tests/player-development/training.test.ts` — Add intensity/injury tests
- `packages/application/tests/use-cases/advance-career-week.test.ts` — Update mock for new context fields

### Files to Create:
- `apps/web/src/career-dashboard/TrainingSettings.tsx` — Training settings UI component

---

### Task 1: Extend Contracts

**Files:**
- Modify: `packages/contracts/src/career.ts:33-41` (add TrainingIntensitySchema)
- Modify: `packages/contracts/src/career.ts:82-88` (add injury to TrainingSummarySchema)
- Modify: `packages/contracts/src/career.ts:235-240` (extend CareerContextSchema)

- [ ] **Step 1: Add TrainingIntensitySchema and extend TrainingSummarySchema**

Add after `PlayerStateSchema` (around line 41):

```typescript
/**
 * 训练强度
 */
export const TrainingIntensitySchema = z.enum(['light', 'normal', 'intense']);
export type TrainingIntensity = z.infer<typeof TrainingIntensitySchema>;
```

Add `injury` to `TrainingSummarySchema`:

```typescript
export const TrainingSummarySchema = z.object({
  focus: z.string().min(1).max(30),
  attributeChanges: z.array(AttributeChangeSchema),
  fitnessChange: z.number().int(),
  moraleChange: z.number().int(),
  coachTrustChange: z.number().int(),
  injury: z.boolean().default(false),
});
```

Extend `CareerContextSchema`:

```typescript
export const CareerContextSchema = z.object({
  academyId: z.string().nullable(),
  pendingOpportunity: YouthOpportunitySchema.nullable(),
  playerState: PlayerStateSchema,
  pendingEvent: EventInstanceSchema.nullable(),
  trainingFocus: z.string().nullable().default(null),
  trainingIntensity: TrainingIntensitySchema.default('normal'),
});
```

- [ ] **Step 2: Run typecheck**

```bash
cd d:/CodexProgram/FootballSimulator && pnpm --filter @football/contracts typecheck
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/src/career.ts
git commit -m "feat(contracts): add TrainingIntensity, injury field, and training settings to CareerContext"
```

---

### Task 2: Update simulateTraining() with Focus and Intensity

**Files:**
- Modify: `packages/simulation/src/player-development/training.ts` — Add focus/intensity params, injury logic
- Test: `packages/simulation/tests/player-development/training.test.ts` — Add tests

- [ ] **Step 1: Write the failing tests**

Add to `packages/simulation/tests/player-development/training.test.ts`:

```typescript
import type { PlayerCareer, PlayerState, TrainingIntensity } from '@football/contracts';

it('uses specified focus when provided', () => {
  const rng = createSeededRandomSource(42);
  const player = createMockPlayer();
  const state: PlayerState = {
    fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe',
  };
  const result = simulateTraining(player, state, rng, '射门');
  expect(result.focus).toBe('射门');
});

it('light intensity reduces growth and fatigue', () => {
  const rng = createSeededRandomSource(42);
  const player = createMockPlayer();
  const state: PlayerState = {
    fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe',
  };
  const result = simulateTraining(player, state, rng, '速度', 'light');
  // Attribute changes should be ≤ 2 (light has 0.5x multiplier, max base is 3)
  for (const change of result.attributeChanges) {
    expect(change.newValue - change.oldValue).toBeLessThanOrEqual(2);
  }
  // Fitness change should be ≥ -2 (light has 0.5x multiplier, normal min is -4)
  expect(result.fitnessChange).toBeGreaterThanOrEqual(-2);
});

it('intense intensity increases growth ceiling', () => {
  const rng = createSeededRandomSource(42);
  // Use high professionalism player to ensure growth triggers
  const player = createMockPlayer({
    hiddenTraits: {
      potential: 95, stability: 60, professionalism: 95,
      pressureResistance: 60, adaptability: 50, injuryProneness: 30,
    },
  });
  const state: PlayerState = {
    fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe',
  };
  const result = simulateTraining(player, state, rng, '速度', 'intense');
  // Intense has 1.5x multiplier, max base is 3, so max is 4
  for (const change of result.attributeChanges) {
    expect(change.newValue - change.oldValue).toBeLessThanOrEqual(4);
  }
});

it('intense training can cause injury', () => {
  // Run many iterations to hit the 5% chance
  const state: PlayerState = {
    fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe',
  };
  let injuryFound = false;
  for (let seed = 0; seed < 200; seed++) {
    const rng = createSeededRandomSource(seed);
    const player = createMockPlayer();
    const result = simulateTraining(player, state, rng, '速度', 'intense');
    if (result.injury) { injuryFound = true; break; }
  }
  expect(injuryFound).toBe(true);
});

it('light and normal training never cause injury', () => {
  const state: PlayerState = {
    fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe',
  };
  for (const intensity of ['light' as TrainingIntensity, 'normal' as TrainingIntensity]) {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createSeededRandomSource(seed);
      const player = createMockPlayer();
      const result = simulateTraining(player, state, rng, '速度', intensity);
      expect(result.injury).toBe(false);
    }
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/simulation/tests/player-development/training.test.ts`
Expected: FAIL (4 new tests, `simulateTraining` doesn't accept focus/intensity params yet)

- [ ] **Step 3: Modify simulateTraining()**

Update `packages/simulation/src/player-development/training.ts`:

```typescript
import type {
  PlayerCareer,
  PlayerState,
  TrainingSummary,
  AttributeChange,
  TrainingIntensity,
} from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';

const TRAINING_FOCUS: Record<string, string[]> = {
  CENTER_BACK: ['防守', '空中', '力量'],
  FULL_BACK: ['速度', '耐力', '防守'],
  DEFENSIVE_MIDFIELDER: ['防守', '传球', '耐力'],
  MIDFIELDER: ['传球', '视野', '技术'],
  WINGER: ['盘带', '速度', '射门'],
  FORWARD: ['射门', '跑位', '盘带'],
};

const ATTR_MAP: Record<string, string[]> = {
  防守: ['defending', 'discipline'],
  空中: ['aerialAbility', 'strength'],
  力量: ['strength', 'aerialAbility'],
  速度: ['pace', 'agility'],
  耐力: ['stamina', 'determination'],
  传球: ['passing', 'vision'],
  视野: ['vision', 'decision'],
  技术: ['firstTouch', 'dribbling'],
  盘带: ['dribbling', 'agility'],
  射门: ['shooting', 'composure'],
  跑位: ['offTheBall', 'decision'],
  战术: ['decision', 'discipline'],
  体能: ['stamina', 'pace'],
  灵活: ['agility', 'pace'],
};

/** 强度倍率配置 */
const INTENSITY_MULTIPLIERS: Record<TrainingIntensity, { growth: number; fatigue: number; fitness: number; injuryChance: number }> = {
  light: { growth: 0.5, fatigue: 0.5, fitness: 0.5, injuryChance: 0 },
  normal: { growth: 1.0, fatigue: 1.0, fitness: 1.0, injuryChance: 0 },
  intense: { growth: 1.5, fatigue: 1.5, fitness: 1.5, injuryChance: 0.05 },
};

/**
 * 根据位置和种子训练模拟
 * 属性增长缓慢，受潜力和职业素养影响
 * 可指定训练重点和强度
 */
export function simulateTraining(
  player: PlayerCareer,
  state: PlayerState,
  rng: SeededRandomSource,
  focus?: string,
  intensity: TrainingIntensity = 'normal',
): TrainingSummary {
  const position = player.identity.primaryPosition;
  const focusOptions = TRAINING_FOCUS[position] ?? ['技术', '体能', '战术'];
  const selectedFocus = focus && focusOptions.includes(focus) ? focus : rng.pick(focusOptions);

  const attributeChanges: AttributeChange[] = [];
  const professionalism = player.hiddenTraits.professionalism;
  const potential = player.hiddenTraits.potential;
  const growthModifier = (professionalism / 100) * (potential / 100);
  const multiplier = INTENSITY_MULTIPLIERS[intensity];

  const candidates = ATTR_MAP[selectedFocus] ?? ['determination', 'discipline'];
  const count = rng.nextInt(1, Math.min(3, candidates.length));
  const trainedAttrs = rng.shuffle(candidates).slice(0, count);

  const allAttrs: Record<string, number> = {
    ...player.attributes.technical,
    ...player.attributes.physical,
    ...player.attributes.mental,
  };

  for (const attrKey of trainedAttrs) {
    const oldValue = allAttrs[attrKey];
    if (oldValue === undefined) continue;
    const growth = rng.next() < growthModifier ? rng.nextInt(1, 3) : rng.nextInt(0, 2);
    const adjustedGrowth = Math.round(growth * multiplier.growth);
    const newValue = Math.min(100, oldValue + adjustedGrowth);
    if (newValue !== oldValue) {
      attributeChanges.push({ attribute: attrKey, oldValue, newValue });
    }
  }

  const fitnessChange = -Math.round(rng.nextInt(1, 4) * multiplier.fitness);
  const moraleChange = rng.nextInt(-1, 2);
  const coachTrustChange = rng.nextInt(0, 1);

  // Injury check: only for intense training
  const injury = intensity === 'intense' && rng.next() < 0.05;

  return { focus: selectedFocus, attributeChanges, fitnessChange, moraleChange, coachTrustChange, injury };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/simulation/tests/player-development/training.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/simulation/src/player-development/training.ts packages/simulation/tests/player-development/training.test.ts
git commit -m "feat(simulation): add training focus and intensity control with injury risk"
```

---

### Task 3: Update Weekly Advance to Pass Training Settings

**Files:**
- Modify: `packages/simulation/src/career/weekly-advance.ts` — Read training settings from save context, apply injury

- [ ] **Step 1: Modify advanceCareerWeek()**

Update `packages/simulation/src/career/weekly-advance.ts` to pass training settings:

Change the training call (around line 49-51):

```typescript
  // Execute training
  const trainingSummary = weekActivity.hasTraining
    ? simulateTraining(save.player, save.context.playerState, rng, save.context.trainingFocus ?? undefined, save.context.trainingIntensity)
    : null;
```

Add injury effect after training effects (around line 73-74, after fatigue accumulation):

```typescript
  // 1. Training effects
  if (trainingSummary) {
    playerState = applyDelta(playerState, stateChanges, 'fitness', trainingSummary.fitnessChange);
    playerState = applyDelta(playerState, stateChanges, 'morale', trainingSummary.moraleChange);
    playerState = applyDelta(
      playerState,
      stateChanges,
      'coachTrust',
      trainingSummary.coachTrustChange,
    );
    // Fatigue accumulation: training
    playerState = applyDelta(playerState, stateChanges, 'fatigue', rng.nextInt(2, 4));

    // Injury effects from intense training
    if (trainingSummary.injury) {
      playerState = applyDelta(playerState, stateChanges, 'fatigue', rng.nextInt(10, 15));
      playerState = applyDelta(playerState, stateChanges, 'fitness', -rng.nextInt(10, 15));
      playerState = applyDelta(playerState, stateChanges, 'morale', rng.nextInt(-5, -3));
    }
  }
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run packages/simulation/tests/`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/simulation/src/career/weekly-advance.ts
git commit -m "feat(simulation): pass training settings from save context and apply injury effects"
```

---

### Task 4: Update Application Layer

**Files:**
- Modify: `packages/application/src/use-cases/advance-career-week.ts` — No change needed (training settings are on save.context, passed through weekly-advance)
- Modify: `packages/application/src/use-cases/batch-advance.ts` — No change needed (same reason)
- Modify: `packages/application/tests/use-cases/advance-career-week.test.ts` — Update mock for new context fields

- [ ] **Step 1: Update test mock**

Find the `context` object in `packages/application/tests/use-cases/advance-career-week.test.ts` (around line 75) and add:

```typescript
context: {
  academyId: 'shanghai-pujiang',
  pendingOpportunity: null,
  playerState: { fitness: 65, morale: 60, coachTrust: 35, fatigue: 8, teamStatus: 'fringe' },
  pendingEvent: null,
  trainingFocus: null,
  trainingIntensity: 'normal',
},
```

- [ ] **Step 2: Run tests and typecheck**

Run: `npx vitest run packages/application/tests/use-cases/advance-career-week.test.ts`
Expected: PASS

Run: `pnpm --filter @football/application typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/application/tests/use-cases/advance-career-week.test.ts
git commit -m "test(application): update mock for training context fields"
```

---

### Task 5: TrainingSettings UI Component

**Files:**
- Create: `apps/web/src/career-dashboard/TrainingSettings.tsx`
- Modify: `apps/web/src/career-dashboard/CareerDashboard.tsx` — Integrate TrainingSettings panel

- [ ] **Step 1: Create TrainingSettings component**

Create `apps/web/src/career-dashboard/TrainingSettings.tsx`:

```tsx
import type { TrainingIntensity } from '@football/contracts';

interface TrainingSettingsProps {
  trainingFocus: string | null;
  trainingIntensity: TrainingIntensity;
  onFocusChange: (focus: string | null) => void;
  onIntensityChange: (intensity: TrainingIntensity) => void;
  position: string;
}

const POSITION_FOCUS_OPTIONS: Record<string, string[]> = {
  CENTER_BACK: ['防守', '空中', '力量'],
  FULL_BACK: ['速度', '耐力', '防守'],
  DEFENSIVE_MIDFIELDER: ['防守', '传球', '耐力'],
  MIDFIELDER: ['传球', '视野', '技术'],
  WINGER: ['盘带', '速度', '射门'],
  FORWARD: ['射门', '跑位', '盘带'],
};

const INTENSITY_LABELS: Record<TrainingIntensity, string> = {
  light: '轻量',
  normal: '普通',
  intense: '加练',
};

const INTENSITY_DESCRIPTIONS: Record<TrainingIntensity, string> = {
  light: '↓ 成长慢 · 恢复快 · 低疲劳',
  normal: '适中成长 · 适中消耗',
  intense: '↑ 成长快 · 疲劳高 · ⚠️ 受伤风险',
};

const FOCUS_LABELS: Record<string, string> = {
  '防守': '防守',
  '空中': '空中能力',
  '力量': '力量',
  '速度': '速度',
  '耐力': '耐力',
  '传球': '传球',
  '视野': '视野',
  '技术': '技术',
  '盘带': '盘带',
  '射门': '射门',
  '跑位': '跑位',
};

export function TrainingSettings({
  trainingFocus,
  trainingIntensity,
  onFocusChange,
  onIntensityChange,
  position,
}: TrainingSettingsProps) {
  const focusOptions = POSITION_FOCUS_OPTIONS[position] ?? ['技术', '体能', '战术'];
  const intensityOptions: TrainingIntensity[] = ['light', 'normal', 'intense'];

  const focusLabel = trainingFocus ? (FOCUS_LABELS[trainingFocus] ?? trainingFocus) : '自动';

  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-lg)',
        marginBottom: 'var(--space-lg)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 'bold',
          color: 'var(--color-ink)',
          marginBottom: 'var(--space-md)',
        }}
      >
        ⚙️ 训练设置
      </div>

      {/* Training Focus */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          训练重点
        </div>
        <select
          value={trainingFocus ?? ''}
          onChange={(e) => onFocusChange(e.target.value || null)}
          style={{
            width: '100%',
            padding: 'var(--space-sm) var(--space-md)',
            fontSize: 'var(--text-base)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-card)',
            color: 'var(--color-ink)',
            cursor: 'pointer',
          }}
        >
          <option value="">自动</option>
          {focusOptions.map((f) => (
            <option key={f} value={f}>
              {FOCUS_LABELS[f] ?? f}
            </option>
          ))}
        </select>
      </div>

      {/* Training Intensity */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          训练强度
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {intensityOptions.map((intensity) => (
            <button
              key={intensity}
              onClick={() => onIntensityChange(intensity)}
              style={{
                flex: 1,
                padding: 'var(--space-sm) var(--space-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: trainingIntensity === intensity ? 'bold' : 'normal',
                border: `2px solid ${
                  trainingIntensity === intensity ? 'var(--color-accent)' : 'var(--color-border)'
                }`,
                borderRadius: 'var(--radius-sm)',
                background:
                  trainingIntensity === intensity ? 'var(--color-accent)' : 'var(--color-card)',
                color: trainingIntensity === intensity ? '#fff' : 'var(--color-ink)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {INTENSITY_LABELS[intensity]}
            </button>
          ))}
        </div>
      </div>

      {/* Current Settings Preview */}
      <div
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
          padding: 'var(--space-sm)',
          background: 'var(--color-bg-muted)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div>💡 当前设置：{focusLabel}训练 · {INTENSITY_LABELS[trainingIntensity]}强度</div>
        <div>📊 {INTENSITY_DESCRIPTIONS[trainingIntensity]}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate into CareerDashboard**

Add import and state management to `apps/web/src/career-dashboard/CareerDashboard.tsx`:

Add import:
```tsx
import { TrainingSettings } from './TrainingSettings';
```

Add state management (after the existing state declarations, around line 43):
```tsx
const [trainingFocus, setTrainingFocus] = useState<string | null>(save.context.trainingFocus ?? null);
const [trainingIntensity, setTrainingIntensity] = useState<TrainingIntensity>(save.context.trainingIntensity ?? 'normal');
```

Add the TrainingSettings panel in the JSX (between the Player State Bars section and the Relationships section, before the Attributes section):

```tsx
      {/* Training Settings */}
      <TrainingSettings
        trainingFocus={trainingFocus}
        trainingIntensity={trainingIntensity}
        onFocusChange={(focus) => {
          setTrainingFocus(focus);
          onSaveUpdate({
            ...save,
            context: {
              ...save.context,
              trainingFocus: focus,
              trainingIntensity,
            },
          });
        }}
        onIntensityChange={(intensity) => {
          setTrainingIntensity(intensity);
          onSaveUpdate({
            ...save,
            context: {
              ...save.context,
              trainingFocus,
              trainingIntensity: intensity,
            },
          });
        }}
        position={player.identity.primaryPosition}
      />
```

- [ ] **Step 3: Run typecheck and tests**

Run: `pnpm --filter @football/web typecheck`
Expected: PASS

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/career-dashboard/TrainingSettings.tsx apps/web/src/career-dashboard/CareerDashboard.tsx
git commit -m "feat(web): add TrainingSettings UI with focus and intensity controls"
```

---

### Task 6: Run Final Verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: PASS (all tests)

- [ ] **Step 2: Run all typechecks**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS (0 warnings)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass"
```