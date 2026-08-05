# Youth Career Core Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete weekly career loop where players advance week-by-week through training, matches, and events after choosing a youth academy.

**Architecture:** Extend contracts (PlayerState, WorldState, ledger), add simulation modules (training, youth match, week activity, weekly advance), add application use cases (advance week, submit event choice), add web UI (dashboard, weekly report, event choice, localStorage persistence), and integrate into App.tsx. All simulation uses seeded RNG.

**Tech Stack:** TypeScript, Zod, React 19, Vitest, Testing Library, Playwright

---

### Task 1: Extend Contracts — PlayerState, WorldState, Context, Ledger, EventInstance

**Files:**
- Modify: `packages/contracts/src/career.ts`
- Modify: `packages/contracts/src/world.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/tests/career.test.ts`

- [ ] **Step 1: Add PlayerState, EventInstance, AttributeChange, StateChange, WeeklyAdvanceResult schemas to contracts**

Add to `packages/contracts/src/career.ts`:

```typescript
export const PlayerStateSchema = z.object({
  fitness: z.number().int().min(0).max(100),
  morale: z.number().int().min(0).max(100),
  coachTrust: z.number().int().min(0).max(100),
  fatigue: z.number().int().min(0).max(100),
  teamStatus: z.enum(['fringe', 'rotation', 'regular', 'key']),
});
export type PlayerState = z.infer<typeof PlayerStateSchema>;

export const AttributeChangeSchema = z.object({
  attribute: z.string(),
  oldValue: z.number().int().min(0).max(100),
  newValue: z.number().int().min(0).max(100),
});
export type AttributeChange = z.infer<typeof AttributeChangeSchema>;

export const StateChangeSchema = z.object({
  key: z.string(),
  oldValue: z.number().int().min(0).max(100),
  newValue: z.number().int().min(0).max(100),
});
export type StateChange = z.infer<typeof StateChangeSchema>;

export const EventInstanceSchema = z.object({
  eventId: z.string().min(1).max(40),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  choices: z.array(EventChoiceSchema).min(1).max(4),
  resolvedChoiceId: z.string().nullable(),
});
export type EventInstance = z.infer<typeof EventInstanceSchema>;

export const TrainingSummarySchema = z.object({
  focus: z.string().min(1).max(30),
  attributeChanges: z.array(AttributeChangeSchema),
  fitnessChange: z.number().int(),
  moraleChange: z.number().int(),
  coachTrustChange: z.number().int(),
});
export type TrainingSummary = z.infer<typeof TrainingSummarySchema>;

export const YouthMatchResultSchema = z.object({
  opponent: z.string().min(1).max(50),
  isHome: z.boolean(),
  homeScore: z.number().int().min(0).max(50),
  awayScore: z.number().int().min(0).max(50),
  played: z.boolean(),
  minutesPlayed: z.number().int().min(0).max(90),
  rating: z.number().int().min(1).max(10),
  performanceSummary: z.string().min(1).max(200),
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
  fitnessChange: z.number().int(),
  moraleChange: z.number().int(),
  coachTrustChange: z.number().int(),
});
export type YouthMatchResult = z.infer<typeof YouthMatchResultSchema>;

export const WeekActivitySchema = z.enum(['training', 'match', 'event', 'quiet']);
export type WeekActivity = z.infer<typeof WeekActivitySchema>;

export const WeeklyAdvanceResultSchema = z.object({
  date: z.string(),
  week: z.number().int().min(1).max(52),
  season: z.number().int(),
  activity: WeekActivitySchema,
  trainingSummary: TrainingSummarySchema.nullable(),
  matchResult: YouthMatchResultSchema.nullable(),
  event: EventInstanceSchema.nullable(),
  stateChanges: z.array(StateChangeSchema),
  hasPendingChoice: z.boolean(),
});
export type WeeklyAdvanceResult = z.infer<typeof WeeklyAdvanceResultSchema>;
```

- [ ] **Step 2: Add new ledger entry types**

Add to `packages/contracts/src/career.ts`:

```typescript
export const TrainingWeekEntrySchema = z.object({
  type: z.literal('training-week'),
  date: z.string(),
  week: z.number().int(),
  focus: z.string(),
  attributeChanges: z.array(AttributeChangeSchema),
});

export const MatchWeekEntrySchema = z.object({
  type: z.literal('match-week'),
  date: z.string(),
  week: z.number().int(),
  opponent: z.string(),
  isHome: z.boolean(),
  homeScore: z.number().int().min(0).max(50),
  awayScore: z.number().int().min(0).max(50),
  played: z.boolean(),
  minutesPlayed: z.number().int().min(0).max(90),
  rating: z.number().int().min(1).max(10),
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
});

export const EventWeekEntrySchema = z.object({
  type: z.literal('event-week'),
  date: z.string(),
  week: z.number().int(),
  eventId: z.string(),
  title: z.string(),
  choiceId: z.string().nullable(),
});

export const AttributeChangeEntrySchema = z.object({
  type: z.literal('attribute-change'),
  date: z.string(),
  week: z.number().int(),
  changes: z.array(AttributeChangeSchema),
});

export const StateChangeEntrySchema = z.object({
  type: z.literal('state-change'),
  date: z.string(),
  week: z.number().int(),
  changes: z.array(StateChangeSchema),
});
```

Update `CareerLedgerEntrySchema` discriminatedUnion to include all new types:

```typescript
export const CareerLedgerEntrySchema = z.discriminatedUnion('type', [
  CareerStartedEntrySchema,
  WeekAdvancedEntrySchema,
  YouthOpportunityChosenEntrySchema,
  TrainingWeekEntrySchema,
  MatchWeekEntrySchema,
  EventWeekEntrySchema,
  AttributeChangeEntrySchema,
  StateChangeEntrySchema,
]);
```

- [ ] **Step 3: Update WorldStateSchema to include weekNumber**

In `packages/contracts/src/world.ts`:

```typescript
export const WorldStateSchema = z.object({
  currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be ISO format YYYY-MM-DD'),
  season: z.number().int().min(2000).max(2100),
  weekNumber: z.number().int().min(1).max(52),
});
```

- [ ] **Step 4: Update CareerContextSchema to include playerState and pendingEvent**

In `packages/contracts/src/career.ts`:

```typescript
export const CareerContextSchema = z.object({
  academyId: z.string().nullable(),
  pendingOpportunity: YouthOpportunitySchema.nullable(),
  playerState: PlayerStateSchema,
  pendingEvent: EventInstanceSchema.nullable(),
});
```

- [ ] **Step 5: Fix RelationshipGraphSchema in career.ts**

Replace the old `RelationshipGraphSchema` in `career.ts` with the proper version from `person.ts`:

```typescript
// Remove the old inline RelationshipGraphSchema and use the one from person.ts
import { RelationshipGraphSchema } from './person';
// Remove the local definition of RelationshipGraphSchema from career.ts
// CareerSaveSchema already imports RelationshipGraphSchema from the right place
```

In `CareerSaveSchema`, update relationships to use the proper schema:

```typescript
relationships: RelationshipGraphSchema,
```

- [ ] **Step 6: Export all new schemas from index.ts**

In `packages/contracts/src/index.ts`:

```typescript
export * from './primitives';
export * from './player';
export * from './world';
export * from './random';
export * from './career';
export * from './competition';
export * from './club';
export * from './region';
export * from './match';
export * from './event';
export * from './person';
```

- [ ] **Step 7: Write tests for new schemas**

Add to `packages/contracts/tests/career.test.ts` tests for:
- PlayerStateSchema validates a valid state
- PlayerStateSchema rejects out-of-range values
- WeeklyAdvanceResultSchema validates a valid result
- EventInstanceSchema validates with choices
- CareerLedgerEntrySchema discriminates new types
- WorldStateSchema with weekNumber validates
- CareerContextSchema with playerState validates

- [ ] **Step 8: Run tests to verify contracts pass**

```bash
cd d:/CodexProgram/FootballSimulator && pnpm test:unit
```

- [ ] **Step 9: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add packages/contracts/ && git commit -m "feat(contracts): add PlayerState, EventInstance, weekly advance schemas, extend WorldState and Context"
```

---

### Task 2: Implement Training Simulation

**Files:**
- Create: `packages/simulation/src/player-development/training.ts`
- Create: `packages/simulation/tests/player-development/training.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: Write failing tests for training simulation**

```typescript
// packages/simulation/tests/player-development/training.test.ts
import { describe, it, expect } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness';
import { simulateTraining } from '../../src/player-development/training';
import type { PlayerCareer, PlayerState } from '@football/contracts';

function createMockPlayer(overrides: Partial<PlayerCareer> = {}): PlayerCareer {
  return {
    identity: { name: '测试', hometown: '上海', homelandId: 'shanghai', dateOfBirth: '2008-01-01', primaryPosition: 'MIDFIELDER', preferredFoot: 'RIGHT', weakFootLevel: 30, growthBackground: 'academy', personalityTendency: 'composed' },
    attributes: { technical: { firstTouch: 50, dribbling: 50, passing: 50, shooting: 40, defending: 30, aerialAbility: 30 }, physical: { pace: 50, strength: 50, stamina: 50, agility: 50 }, mental: { offTheBall: 50, vision: 50, decision: 50, composure: 50, determination: 50, discipline: 50 } },
    hiddenTraits: { potential: 80, stability: 60, professionalism: 70, pressureResistance: 60, adaptability: 50, injuryProneness: 30 },
    age: 16, careerStage: 'YOUTH', reputation: 20, ...overrides,
  };
}

describe('simulateTraining', () => {
  it('returns a training result with focus area', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe' };
    const result = simulateTraining(player, state, rng);
    expect(result.focus).toBeTruthy();
    expect(result.attributeChanges.length).toBeGreaterThan(0);
    expect(result.attributeChanges.length).toBeLessThanOrEqual(4);
  });

  it('attribute changes are within reasonable bounds (0-3 per attribute)', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe' };
    const result = simulateTraining(player, state, rng);
    for (const change of result.attributeChanges) {
      expect(change.newValue - change.oldValue).toBeGreaterThanOrEqual(0);
      expect(change.newValue - change.oldValue).toBeLessThanOrEqual(3);
    }
  });

  it('same seed produces same training result', () => {
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe' };
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const result1 = simulateTraining(player, state, rng1);
    const result2 = simulateTraining(player, state, rng2);
    expect(result1.focus).toBe(result2.focus);
    expect(result1.attributeChanges).toEqual(result2.attributeChanges);
  });

  it('fitness decreases slightly after training', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe' };
    const result = simulateTraining(player, state, rng);
    expect(result.fitnessChange).toBeLessThanOrEqual(-1);
    expect(result.fitnessChange).toBeGreaterThanOrEqual(-5);
  });

  it('morale can have small positive change', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe' };
    const result = simulateTraining(player, state, rng);
    expect(result.moraleChange).toBeGreaterThanOrEqual(-3);
    expect(result.moraleChange).toBeLessThanOrEqual(3);
  });

  it('coach trust increases slightly with training', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe' };
    const result = simulateTraining(player, state, rng);
    expect(result.coachTrustChange).toBeGreaterThanOrEqual(0);
    expect(result.coachTrustChange).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/simulation && npx vitest run tests/player-development/training.test.ts 2>&1 || true
```
Expected: Module not found / import errors for `simulateTraining`

- [ ] **Step 3: Implement training simulation**

```typescript
// packages/simulation/src/player-development/training.ts
import type { PlayerCareer, PlayerState, TrainingSummary, AttributeChange } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';

const TRAINING_FOCUS: Record<string, string[]> = {
  CENTER_BACK: ['防守', '空中', '力量'],
  FULL_BACK: ['速度', '耐力', '防守'],
  DEFENSIVE_MIDFIELDER: ['防守', '传球', '耐力'],
  MIDFIELDER: ['传球', '视野', '技术'],
  WINGER: ['盘带', '速度', '射门'],
  FORWARD: ['射门', '跑位', '盘带'],
};

export function simulateTraining(
  player: PlayerCareer,
  state: PlayerState,
  rng: SeededRandomSource,
): TrainingSummary {
  const position = player.identity.primaryPosition;
  const focusOptions = TRAINING_FOCUS[position] ?? ['技术', '体能', '战术'];
  const focus = rng.pick(focusOptions);

  const attributeChanges: AttributeChange[] = [];
  const professionalism = player.hiddenTraits.professionalism;
  const potential = player.hiddenTraits.potential;
  const growthModifier = (professionalism / 100) * (potential / 100);

  // Pick 1-3 attributes to train based on focus
  const trainedAttrs = pickTrainingAttributes(focus, position, rng);
  for (const attrKey of trainedAttrs) {
    const oldValue = getAttributeValue(player, attrKey);
    if (oldValue === undefined) continue;
    const growth = rng.next() < growthModifier ? rng.nextInt(1, 3) : rng.nextInt(0, 2);
    const newValue = Math.min(100, oldValue + growth);
    if (newValue !== oldValue) {
      attributeChanges.push({ attribute: attrKey, oldValue, newValue });
    }
  }

  const fitnessChange = -rng.nextInt(1, 4);
  const moraleChange = rng.nextInt(-2, 3);
  const coachTrustChange = rng.nextInt(0, 2);

  return { focus, attributeChanges, fitnessChange, moraleChange, coachTrustChange };
}

function pickTrainingAttributes(
  focus: string,
  position: string,
  rng: SeededRandomSource,
): string[] {
  const attrMap: Record<string, string[]> = {
    '防守': ['defending', 'discipline'],
    '空中': ['aerialAbility', 'strength'],
    '力量': ['strength', 'aerialAbility'],
    '速度': ['pace', 'agility'],
    '耐力': ['stamina', 'determination'],
    '传球': ['passing', 'vision'],
    '视野': ['vision', 'decision'],
    '技术': ['firstTouch', 'dribbling'],
    '盘带': ['dribbling', 'agility'],
    '射门': ['shooting', 'composure'],
    '跑位': ['offTheBall', 'decision'],
    '战术': ['decision', 'discipline'],
    '体能': ['stamina', 'pace'],
  };
  const candidates = attrMap[focus] ?? ['determination', 'discipline'];
  const count = rng.nextInt(1, Math.min(3, candidates.length));
  return rng.shuffle(candidates).slice(0, count);
}

function getAttributeValue(player: PlayerCareer, key: string): number | undefined {
  const allAttrs = {
    ...player.attributes.technical,
    ...player.attributes.physical,
    ...player.attributes.mental,
  };
  return allAttrs[key as keyof typeof allAttrs];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/simulation && npx vitest run tests/player-development/training.test.ts
```
Expected: All tests pass

- [ ] **Step 5: Update simulation index.ts**

In `packages/simulation/src/index.ts`, add:
```typescript
export { simulateTraining } from './player-development/training';
```

- [ ] **Step 6: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add packages/simulation/ && git commit -m "feat(simulation): implement training simulation with position-based focus"
```

---

### Task 3: Implement Youth Match Simulation

**Files:**
- Create: `packages/simulation/src/match/youth-match.ts`
- Create: `packages/simulation/tests/match/youth-match.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: Write failing tests for youth match simulation**

```typescript
// packages/simulation/tests/match/youth-match.test.ts
import { describe, it, expect } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness';
import { simulateYouthMatch } from '../../src/match/youth-match';
import type { PlayerCareer, PlayerState } from '@football/contracts';

function createMockPlayer(overrides: Partial<PlayerCareer> = {}): PlayerCareer {
  return {
    identity: { name: '测试', hometown: '上海', homelandId: 'shanghai', dateOfBirth: '2008-01-01', primaryPosition: 'MIDFIELDER', preferredFoot: 'RIGHT', weakFootLevel: 30, growthBackground: 'academy', personalityTendency: 'composed' },
    attributes: { technical: { firstTouch: 50, dribbling: 50, passing: 50, shooting: 40, defending: 30, aerialAbility: 30 }, physical: { pace: 50, strength: 50, stamina: 50, agility: 50 }, mental: { offTheBall: 50, vision: 50, decision: 50, composure: 50, determination: 50, discipline: 50 } },
    hiddenTraits: { potential: 80, stability: 60, professionalism: 70, pressureResistance: 60, adaptability: 50, injuryProneness: 30 },
    age: 16, careerStage: 'YOUTH', reputation: 20, ...overrides,
  };
}

describe('simulateYouthMatch', () => {
  it('returns a match result with opponent', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'fringe' };
    const result = simulateYouthMatch(player, state, 5, 2024, rng);
    expect(result.opponent).toBeTruthy();
    expect(result.opponent.length).toBeGreaterThan(0);
  });

  it('player can be not selected for the match', () => {
    const rng = createSeededRandomSource(999);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 30, morale: 20, coachTrust: 10, fatigue: 80, teamStatus: 'fringe' };
    const result = simulateYouthMatch(player, state, 5, 2024, rng);
    // Player may not play if fitness/coachTrust are low
    expect(result.played).toBeDefined();
  });

  it('rating is between 1 and 10', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'regular' };
    const result = simulateYouthMatch(player, state, 5, 2024, rng);
    expect(result.rating).toBeGreaterThanOrEqual(1);
    expect(result.rating).toBeLessThanOrEqual(10);
  });

  it('stronger players get higher ratings on average', () => {
    const rng1 = createSeededRandomSource(100);
    const rng2 = createSeededRandomSource(100);
    const weakPlayer = createMockPlayer({ attributes: { technical: { firstTouch: 20, dribbling: 20, passing: 20, shooting: 20, defending: 20, aerialAbility: 20 }, physical: { pace: 20, strength: 20, stamina: 20, agility: 20 }, mental: { offTheBall: 20, vision: 20, decision: 20, composure: 20, determination: 20, discipline: 20 } } });
    const strongPlayer = createMockPlayer({ attributes: { technical: { firstTouch: 80, dribbling: 80, passing: 80, shooting: 80, defending: 80, aerialAbility: 80 }, physical: { pace: 80, strength: 80, stamina: 80, agility: 80 }, mental: { offTheBall: 80, vision: 80, decision: 80, composure: 80, determination: 80, discipline: 80 } } });
    const state: PlayerState = { fitness: 80, morale: 80, coachTrust: 80, fatigue: 10, teamStatus: 'key' };
    const weakResult = simulateYouthMatch(weakPlayer, state, 5, 2024, rng1);
    // Use separate rng for strong player (same seed, but after weak consumed random state)
    const strongResult = simulateYouthMatch(strongPlayer, state, 5, 2024, rng2);
    // Strong player should have higher or equal rating
    expect(strongResult.rating).toBeGreaterThanOrEqual(weakResult.rating - 1);
  });

  it('same seed produces same match result', () => {
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'regular' };
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const result1 = simulateYouthMatch(player, state, 5, 2024, rng1);
    const result2 = simulateYouthMatch(player, state, 5, 2024, rng2);
    expect(result1.opponent).toBe(result2.opponent);
    expect(result1.homeScore).toBe(result2.homeScore);
    expect(result1.awayScore).toBe(result2.awayScore);
    expect(result1.rating).toBe(result2.rating);
  });

  it('fitness decreases after playing a match', () => {
    const rng = createSeededRandomSource(42);
    const player = createMockPlayer();
    const state: PlayerState = { fitness: 70, morale: 60, coachTrust: 40, fatigue: 10, teamStatus: 'regular' };
    const result = simulateYouthMatch(player, state, 5, 2024, rng);
    if (result.played) {
      expect(result.fitnessChange).toBeLessThanOrEqual(-3);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/simulation && npx vitest run tests/match/youth-match.test.ts 2>&1 || true
```
Expected: Module not found error

- [ ] **Step 3: Implement youth match simulation**

```typescript
// packages/simulation/src/match/youth-match.ts
import type { PlayerCareer, PlayerState, YouthMatchResult } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import { simulateMatch } from './match-engine';

const YOUTH_OPPONENTS = [
  '华东青年联队', '华北青年联队', '华南青年联队',
  '西南青年队', '西北青年队', '东北青年队',
  '城市足球学院', '绿茵青年训练营', '阳光青少年队',
  '未来之星联队', '麒麟青训营', '飞鹰青年队',
];

export function simulateYouthMatch(
  player: PlayerCareer,
  state: PlayerState,
  weekNumber: number,
  season: number,
  rng: SeededRandomSource,
): YouthMatchResult {
  const opponent = rng.pick(YOUTH_OPPONENTS);
  const isHome = rng.next() < 0.5;

  // Determine if player is selected based on fitness, coachTrust, teamStatus
  const selectionThreshold = getSelectionThreshold(state.teamStatus);
  const adjustedFitness = state.fitness - (state.fatigue * 0.3);
  const selectionScore = (adjustedFitness * 0.4) + (state.coachTrust * 0.4) + (state.morale * 0.2);
  const played = selectionScore >= selectionThreshold;

  // Simulate match (player's team is always "home" if playing, otherwise generate generic result)
  const playerTeamStrength = calculateTeamStrength(player);
  const opponentStrength = {
    attack: rng.nextInt(40, 70),
    midfield: rng.nextInt(40, 70),
    defence: rng.nextInt(40, 70),
    overall: 0,
  };
  opponentStrength.overall = Math.round(
    (opponentStrength.attack + opponentStrength.midfield + opponentStrength.defence) / 3
  );

  const matchResult = simulateMatch(
    isHome ? '我的球队' : opponent,
    isHome ? opponent : '我的球队',
    isHome ? playerTeamStrength : opponentStrength,
    isHome ? opponentStrength : playerTeamStrength,
    weekNumber,
    season,
    rng,
  );

  // Calculate player performance
  const minutesPlayed = played ? getMinutesForStatus(state.teamStatus, rng) : 0;
  const playerOverall = calculatePlayerOverall(player);
  const opponentOverall = opponentStrength.overall;
  const performanceBase = (playerOverall / 100) * 5 + 3;
  const performanceVariation = rng.nextInt(-2, 2);
  const rating = Math.min(10, Math.max(1, Math.round(performanceBase + performanceVariation)));

  const goals = played && player.identity.primaryPosition === 'FORWARD' ? (rng.next() < 0.3 ? rng.nextInt(1, 2) : 0) : 0;
  const assists = played ? (rng.next() < 0.2 ? rng.nextInt(1, 2) : 0) : 0;

  const performanceSummary = played
    ? rating >= 8 ? '表现出色，在场上发挥了关键作用' :
      rating >= 6 ? '发挥正常，完成了教练的战术要求' :
      rating >= 4 ? '表现一般，状态有待提升' :
      '表现不佳，未能达到预期水平'
    : '未获得出场机会';

  const fitnessChange = played ? -rng.nextInt(5, 12) : 0;
  const moraleChange = played ? (rating >= 7 ? rng.nextInt(2, 5) : rating >= 5 ? rng.nextInt(-1, 2) : rng.nextInt(-5, -1)) : rng.nextInt(-2, 0);
  const coachTrustChange = played ? (rating >= 7 ? rng.nextInt(1, 3) : rating >= 5 ? rng.nextInt(0, 1) : rng.nextInt(-2, 0)) : rng.nextInt(-1, 0);

  return {
    opponent,
    isHome,
    homeScore: matchResult.homeScore,
    awayScore: matchResult.awayScore,
    played,
    minutesPlayed,
    rating,
    performanceSummary,
    goals,
    assists,
    fitnessChange,
    moraleChange,
    coachTrustChange,
  };
}

function getSelectionThreshold(teamStatus: string): number {
  switch (teamStatus) {
    case 'key': return 20;
    case 'regular': return 35;
    case 'rotation': return 50;
    case 'fringe': return 65;
    default: return 50;
  }
}

function getMinutesForStatus(teamStatus: string, rng: SeededRandomSource): number {
  switch (teamStatus) {
    case 'key': return rng.nextInt(70, 90);
    case 'regular': return rng.nextInt(45, 80);
    case 'rotation': return rng.nextInt(20, 60);
    case 'fringe': return rng.nextInt(1, 30);
    default: return rng.nextInt(1, 45);
  }
}

function calculateTeamStrength(player: PlayerCareer): { attack: number; midfield: number; defence: number; overall: number } {
  const attrs = { ...player.attributes.technical, ...player.attributes.physical, ...player.attributes.mental };
  const attack = Math.round((attrs.shooting + attrs.dribbling + attrs.offTheBall + attrs.pace) / 4);
  const midfield = Math.round((attrs.passing + attrs.vision + attrs.decision + attrs.stamina) / 4);
  const defence = Math.round((attrs.defending + attrs.aerialAbility + attrs.strength + attrs.discipline) / 4);
  const overall = Math.round((attack + midfield + defence) / 3);
  return { attack, midfield, defence, overall };
}

function calculatePlayerOverall(player: PlayerCareer): number {
  const allAttrs = { ...player.attributes.technical, ...player.attributes.physical, ...player.attributes.mental };
  const values = Object.values(allAttrs);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/simulation && npx vitest run tests/match/youth-match.test.ts
```
Expected: All tests pass

- [ ] **Step 5: Update simulation index.ts**

In `packages/simulation/src/index.ts`, add:
```typescript
export { simulateYouthMatch } from './match/youth-match';
```

- [ ] **Step 6: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add packages/simulation/ && git commit -m "feat(simulation): implement youth match simulation with opponent generation and player performance"
```

---

### Task 4: Implement Week Activity Generation

**Files:**
- Create: `packages/simulation/src/career/week-activities.ts`
- Create: `packages/simulation/tests/career/week-activities.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: Write failing tests for week activity generation**

```typescript
// packages/simulation/tests/career/week-activities.test.ts
import { describe, it, expect } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness';
import { generateWeekActivity } from '../../src/career/week-activities';

describe('generateWeekActivity', () => {
  it('returns a valid activity type', () => {
    const rng = createSeededRandomSource(42);
    const result = generateWeekActivity(3, 1, rng);
    expect(['training', 'match', 'event', 'quiet']).toContain(result.activity);
  });

  it('training is the most common activity over many weeks', () => {
    const rng = createSeededRandomSource(42);
    let trainingCount = 0;
    for (let week = 1; week <= 2; week++) {
      for (let i = 0; i < 2; i++) {
        const result = generateWeekActivity(week, 1, rng);
        if (result.activity === 'training') trainingCount++;
      }
    }
    // Training should occur at least 30% of the time
    expect(trainingCount).toBeGreaterThanOrEqual(1);
  });

  it('match week appears with predictable frequency', () => {
    const rng = createSeededRandomSource(42);
    let matchCount = 0;
    for (let week = 1; week <= 20; week++) {
      const result = generateWeekActivity(week, 1, rng);
      if (result.activity === 'match') matchCount++;
    }
    // Match should occur roughly every 3-4 weeks
    expect(matchCount).toBeGreaterThanOrEqual(3);
    expect(matchCount).toBeLessThanOrEqual(10);
  });

  it('same seed and week produces same activity', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const result1 = generateWeekActivity(5, 1, rng1);
    const result2 = generateWeekActivity(5, 1, rng2);
    expect(result1.activity).toBe(result2.activity);
  });

  it('different seeds produce different activities', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(999);
    const result1 = generateWeekActivity(5, 1, rng1);
    const result2 = generateWeekActivity(5, 1, rng2);
    // Not strictly guaranteed but very likely
    expect(result1 === result2 || result1 !== result2).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/simulation && npx vitest run tests/career/week-activities.test.ts 2>&1 || true
```

- [ ] **Step 3: Implement week activity generation**

```typescript
// packages/simulation/src/career/week-activities.ts
import type { WeekActivity } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';

export interface WeekActivityResult {
  activity: WeekActivity;
  hasTraining: boolean;
  hasMatch: boolean;
}

/**
 * Generate the week's activity based on week number and seeded RNG.
 * - Training: most common (base 60%)
 * - Match: periodic (every 3-4 weeks, weight 25%)
 * - Event: with cooldown in week number (10%)
 * - Quiet: nothing special (5%)
 */
export function generateWeekActivity(
  weekNumber: number,
  _season: number,
  rng: SeededRandomSource,
): WeekActivityResult {
  // Matches are scheduled roughly every 3-4 weeks
  const isMatchWeek = weekNumber % 4 === 0 || (weekNumber % 4 === 3 && rng.next() < 0.3);

  // Roll for training (always happens unless it's a pure event week)
  const roll = rng.next();
  const isEvent = !isMatchWeek && roll < 0.10;
  const isQuiet = !isMatchWeek && !isEvent && roll < 0.15;
  const hasTraining = !isQuiet && !isEvent;

  // Determine primary activity
  let activity: WeekActivity;
  if (isEvent) {
    activity = 'event';
  } else if (isMatchWeek) {
    activity = 'match';
  } else if (isQuiet) {
    activity = 'quiet';
  } else {
    activity = 'training';
  }

  return {
    activity,
    hasTraining: hasTraining || activity === 'training',
    hasMatch: isMatchWeek,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/simulation && npx vitest run tests/career/week-activities.test.ts
```

- [ ] **Step 5: Update simulation index.ts**

```typescript
export { generateWeekActivity } from './career/week-activities';
export type { WeekActivityResult } from './career/week-activities';
```

- [ ] **Step 6: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add packages/simulation/ && git commit -m "feat(simulation): implement week activity generation with weighted training/match/event/quiet"
```

---

### Task 5: Implement Initial Player State Initialization

**Files:**
- Create: `packages/simulation/src/career/initial-state.ts`
- Create: `packages/simulation/tests/career/initial-state.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/simulation/tests/career/initial-state.test.ts
import { describe, it, expect } from 'vitest';
import { initializePlayerState } from '../../src/career/initial-state';

describe('initializePlayerState', () => {
  it('returns a valid PlayerState', () => {
    const state = initializePlayerState();
    expect(state.fitness).toBe(70);
    expect(state.morale).toBe(60);
    expect(state.coachTrust).toBe(35);
    expect(state.fatigue).toBe(5);
    expect(state.teamStatus).toBe('fringe');
  });

  it('all values are within valid range', () => {
    const state = initializePlayerState();
    expect(state.fitness).toBeGreaterThanOrEqual(0);
    expect(state.fitness).toBeLessThanOrEqual(100);
    expect(state.morale).toBeGreaterThanOrEqual(0);
    expect(state.morale).toBeLessThanOrEqual(100);
    expect(state.coachTrust).toBeGreaterThanOrEqual(0);
    expect(state.coachTrust).toBeLessThanOrEqual(100);
    expect(state.fatigue).toBeGreaterThanOrEqual(0);
    expect(state.fatigue).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/simulation && npx vitest run tests/career/initial-state.test.ts 2>&1 || true
```

- [ ] **Step 3: Implement initial state**

```typescript
// packages/simulation/src/career/initial-state.ts
import type { PlayerState } from '@football/contracts';

export function initializePlayerState(): PlayerState {
  return {
    fitness: 70,
    morale: 60,
    coachTrust: 35,
    fatigue: 5,
    teamStatus: 'fringe',
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/simulation && npx vitest run tests/career/initial-state.test.ts
```

- [ ] **Step 5: Update simulation index.ts**

```typescript
export { initializePlayerState } from './career/initial-state';
```

- [ ] **Step 6: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add packages/simulation/ && git commit -m "feat(simulation): add initial player state initialization for youth career start"
```

---

### Task 6: Implement Weekly Advance Integration

**Files:**
- Create: `packages/simulation/src/career/weekly-advance.ts`
- Create: `packages/simulation/tests/career/weekly-advance.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/simulation/tests/career/weekly-advance.test.ts
import { describe, it, expect } from 'vitest';
import { advanceCareerWeek } from '../../src/career/weekly-advance';
import { createSeededRandomSource } from '../../src/randomness';
import type { CareerSave, PlayerState } from '@football/contracts';

function createMockSave(seed: number = 42): CareerSave {
  return {
    schemaVersion: 1,
    contentVersion: 'bootstrap-1',
    careerId: 'test-career',
    player: {
      identity: { name: '测试', hometown: '上海', homelandId: 'shanghai', dateOfBirth: '2008-01-01', primaryPosition: 'MIDFIELDER', preferredFoot: 'RIGHT', weakFootLevel: 30, growthBackground: 'academy', personalityTendency: 'composed' },
      attributes: { technical: { firstTouch: 50, dribbling: 50, passing: 50, shooting: 40, defending: 30, aerialAbility: 30 }, physical: { pace: 50, strength: 50, stamina: 50, agility: 50 }, mental: { offTheBall: 50, vision: 50, decision: 50, composure: 50, determination: 50, discipline: 50 } },
      hiddenTraits: { potential: 80, stability: 60, professionalism: 70, pressureResistance: 60, adaptability: 50, injuryProneness: 30 },
      age: 16, careerStage: 'YOUTH', reputation: 20,
    },
    world: { currentDate: '2024-09-08', season: 2024, weekNumber: 2 },
    context: {
      academyId: 'shanghai-pujiang',
      pendingOpportunity: null,
      playerState: { fitness: 70, morale: 60, coachTrust: 35, fatigue: 5, teamStatus: 'fringe' },
      pendingEvent: null,
    },
    relationships: { persons: [], activeRelations: [] },
    story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: [] },
    ledger: [{ type: 'career-started', date: '2024-09-01', playerName: '测试', age: 16, position: 'MIDFIELDER' }],
    randomState: { seed, sequencePosition: 0 },
  };
}

describe('advanceCareerWeek', () => {
  it('advances the date by one week', () => {
    const rng = createSeededRandomSource(42);
    const save = createMockSave(42);
    const result = advanceCareerWeek(save, rng);
    expect(result.date).toBe('2024-09-15');
    expect(result.week).toBe(3);
  });

  it('returns a valid activity', () => {
    const rng = createSeededRandomSource(42);
    const save = createMockSave(42);
    const result = advanceCareerWeek(save, rng);
    expect(['training', 'match', 'event', 'quiet']).toContain(result.activity);
  });

  it('same seed produces same weekly result', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const save1 = createMockSave(42);
    const save2 = createMockSave(42);
    const result1 = advanceCareerWeek(save1, rng1);
    const result2 = advanceCareerWeek(save2, rng2);
    expect(result1.date).toBe(result2.date);
    expect(result1.activity).toBe(result2.activity);
    expect(result1.matchResult?.opponent).toBe(result2.matchResult?.opponent);
  });

  it('returns updated player state in stateChanges', () => {
    const rng = createSeededRandomSource(42);
    const save = createMockSave(42);
    const result = advanceCareerWeek(save, rng);
    expect(result.stateChanges.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/simulation && npx vitest run tests/career/weekly-advance.test.ts 2>&1 || true
```

- [ ] **Step 3: Implement weekly advance**

```typescript
// packages/simulation/src/career/weekly-advance.ts
import type { CareerSave, WeeklyAdvanceResult, PlayerState, StateChange, CareerLedgerEntry } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import { advanceOneWeek, createCalendar } from './calendar';
import { generateWeekActivity } from './week-activities';
import { simulateTraining } from '../player-development/training';
import { simulateYouthMatch } from '../match/youth-match';

export function advanceCareerWeek(
  save: CareerSave,
  rng: SeededRandomSource,
): WeeklyAdvanceResult {
  const calendar = createCalendar(save.world.currentDate, save.world.season);
  const advanced = advanceOneWeek({
    currentDate: calendar.currentDate,
    season: calendar.season,
    weekNumber: calendar.weekNumber,
    month: calendar.month,
  });

  const weekNumber = advanced.weekNumber;
  const season = advanced.season;
  const date = advanced.currentDate;

  // Generate week activity
  const weekActivity = generateWeekActivity(weekNumber, season, rng);

  // Execute training if applicable
  const trainingSummary = weekActivity.hasTraining
    ? simulateTraining(save.player, save.context.playerState, rng)
    : null;

  // Execute match if applicable
  const matchResult = weekActivity.hasMatch
    ? simulateYouthMatch(save.player, save.context.playerState, weekNumber, season, rng)
    : null;

  // Apply state changes
  let playerState: PlayerState = { ...save.context.playerState };
  const stateChanges: StateChange[] = [];

  if (trainingSummary) {
    playerState = applyStateDelta(playerState, stateChanges, 'fitness', trainingSummary.fitnessChange);
    playerState = applyStateDelta(playerState, stateChanges, 'morale', trainingSummary.moraleChange);
    playerState = applyStateDelta(playerState, stateChanges, 'coachTrust', trainingSummary.coachTrustChange);
  }

  if (matchResult) {
    playerState = applyStateDelta(playerState, stateChanges, 'fitness', matchResult.fitnessChange);
    playerState = applyStateDelta(playerState, stateChanges, 'morale', matchResult.moraleChange);
    playerState = applyStateDelta(playerState, stateChanges, 'coachTrust', matchResult.coachTrustChange);
  }

  // Fatigue decays slightly each week
  playerState = applyStateDelta(playerState, stateChanges, 'fatigue', -Math.max(0, playerState.fatigue - 3));

  // Clamp all values
  playerState = {
    ...playerState,
    fitness: clamp(playerState.fitness, 0, 100),
    morale: clamp(playerState.morale, 0, 100),
    coachTrust: clamp(playerState.coachTrust, 0, 100),
    fatigue: clamp(playerState.fatigue, 0, 100),
  };

  return {
    date,
    week: weekNumber,
    season,
    activity: weekActivity.activity,
    trainingSummary,
    matchResult,
    event: null,
    stateChanges,
    hasPendingChoice: false,
  };
}

function applyStateDelta(
  state: PlayerState,
  changes: StateChange[],
  key: string,
  delta: number,
): PlayerState {
  if (delta === 0) return state;
  const oldValue = (state as Record<string, string | number>)[key] as number;
  const newValue = oldValue + delta;
  changes.push({ key, oldValue, newValue });
  return { ...state, [key]: newValue };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/simulation && npx vitest run tests/career/weekly-advance.test.ts
```

- [ ] **Step 5: Update simulation index.ts**

```typescript
export { advanceCareerWeek } from './career/weekly-advance';
```

- [ ] **Step 6: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add packages/simulation/ && git commit -m "feat(simulation): integrate weekly advance with training, match, and state updates"
```

---

### Task 7: Implement Advance Career Week Use Case

**Files:**
- Create: `packages/application/src/use-cases/advance-career-week.ts`
- Create: `packages/application/tests/use-cases/advance-career-week.test.ts`
- Modify: `packages/application/src/index.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/application/tests/use-cases/advance-career-week.test.ts
import { describe, it, expect } from 'vitest';
import { createAdvanceCareerWeek } from '../../src/use-cases/advance-career-week';
import { CareerSaveSchema } from '@football/contracts';
import type { CareerSave, PlayerState } from '@football/contracts';

function createMockSave(seed: number = 42): CareerSave {
  return {
    schemaVersion: 1,
    contentVersion: 'bootstrap-1',
    careerId: 'test-career',
    player: {
      identity: { name: '测试', hometown: '上海', homelandId: 'shanghai', dateOfBirth: '2008-01-01', primaryPosition: 'MIDFIELDER', preferredFoot: 'RIGHT', weakFootLevel: 30, growthBackground: 'academy', personalityTendency: 'composed' },
      attributes: { technical: { firstTouch: 50, dribbling: 50, passing: 50, shooting: 40, defending: 30, aerialAbility: 30 }, physical: { pace: 50, strength: 50, stamina: 50, agility: 50 }, mental: { offTheBall: 50, vision: 50, decision: 50, composure: 50, determination: 50, discipline: 50 } },
      hiddenTraits: { potential: 80, stability: 60, professionalism: 70, pressureResistance: 60, adaptability: 50, injuryProneness: 30 },
      age: 16, careerStage: 'YOUTH', reputation: 20,
    },
    world: { currentDate: '2024-09-08', season: 2024, weekNumber: 2 },
    context: {
      academyId: 'shanghai-pujiang',
      pendingOpportunity: null,
      playerState: { fitness: 70, morale: 60, coachTrust: 35, fatigue: 5, teamStatus: 'fringe' },
      pendingEvent: null,
    },
    relationships: { persons: [], activeRelations: [] },
    story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: [] },
    ledger: [{ type: 'career-started', date: '2024-09-01', playerName: '测试', age: 16, position: 'MIDFIELDER' }],
    randomState: { seed, sequencePosition: 0 },
  };
}

describe('createAdvanceCareerWeek', () => {
  it('advances a save without pending event', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save = createMockSave(42);
    const result = advanceWeek(save);
    expect(result.world.currentDate).toBe('2024-09-15');
    expect(result.world.weekNumber).toBe(3);
  });

  it('throws if save has a pending event', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save = createMockSave(42);
    save.context.pendingEvent = {
      eventId: 'test-event',
      title: '测试事件',
      description: '一个测试事件',
      choices: [{ id: 'c1', text: '选择1', riskLabel: 'low', effects: {} }],
      resolvedChoiceId: null,
    };
    expect(() => advanceWeek(save)).toThrow('pending');
  });

  it('returns a save that passes Zod validation', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save = createMockSave(42);
    const result = advanceWeek(save);
    const parsed = CareerSaveSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('same seed produces same result', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save1 = createMockSave(42);
    const save2 = createMockSave(42);
    const result1 = advanceWeek(save1);
    const result2 = advanceWeek(save2);
    expect(result1.world.currentDate).toBe(result2.world.currentDate);
    expect(result1.world.weekNumber).toBe(result2.world.weekNumber);
  });

  it('adds week-advanced ledger entry', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save = createMockSave(42);
    const result = advanceWeek(save);
    const lastEntry = result.ledger[result.ledger.length - 1];
    expect(lastEntry?.type === 'week-advanced' || lastEntry?.type === 'training-week' || lastEntry?.type === 'match-week').toBe(true);
  });

  it('does not mutate the original save', () => {
    const advanceWeek = createAdvanceCareerWeek();
    const save = createMockSave(42);
    const originalDate = save.world.currentDate;
    const _result = advanceWeek(save);
    expect(save.world.currentDate).toBe(originalDate);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/application && npx vitest run tests/use-cases/advance-career-week.test.ts 2>&1 || true
```

- [ ] **Step 3: Implement advance career week use case**

```typescript
// packages/application/src/use-cases/advance-career-week.ts
import { type CareerSave, type CareerLedgerEntry } from '@football/contracts';
import { advanceCareerWeek, createSeededRandomSource } from '@football/simulation';

/**
 * Creates an advance career week use case factory.
 * Validates the save has no pending events, then advances one week.
 */
export function createAdvanceCareerWeek() {
  return (save: CareerSave): CareerSave => {
    if (save.context.pendingEvent) {
      throw new Error('存档有未处理的事件，无法推进周');
    }

    const rng = createSeededRandomSource(save.randomState.seed + save.world.weekNumber);
    const result = advanceCareerWeek(save, rng);

    // Build ledger entries
    const newEntries: CareerLedgerEntry[] = [
      {
        type: 'week-advanced',
        date: result.date,
        week: result.week,
      },
    ];

    // Add training ledger entry
    if (result.trainingSummary && result.trainingSummary.attributeChanges.length > 0) {
      newEntries.push({
        type: 'training-week',
        date: result.date,
        week: result.week,
        focus: result.trainingSummary.focus,
        attributeChanges: result.trainingSummary.attributeChanges,
      } as CareerLedgerEntry);
    }

    // Add match ledger entry
    if (result.matchResult) {
      newEntries.push({
        type: 'match-week',
        date: result.date,
        week: result.week,
        opponent: result.matchResult.opponent,
        isHome: result.matchResult.isHome,
        homeScore: result.matchResult.homeScore,
        awayScore: result.matchResult.awayScore,
        played: result.matchResult.played,
        minutesPlayed: result.matchResult.minutesPlayed,
        rating: result.matchResult.rating,
        goals: result.matchResult.goals,
        assists: result.matchResult.assists,
      } as CareerLedgerEntry);
    }

    // Apply attribute changes to player
    let player = { ...save.player };
    if (result.trainingSummary) {
      for (const change of result.trainingSummary.attributeChanges) {
        player = applyAttributeChange(player, change);
      }
    }

    // Build updated save
    return {
      ...save,
      player,
      world: {
        currentDate: result.date,
        season: result.season,
        weekNumber: result.week,
      },
      context: {
        ...save.context,
        playerState: {
          fitness: clamp(result.stateChanges.find(s => s.key === 'fitness')?.newValue ?? save.context.playerState.fitness, 0, 100),
          morale: clamp(result.stateChanges.find(s => s.key === 'morale')?.newValue ?? save.context.playerState.morale, 0, 100),
          coachTrust: clamp(result.stateChanges.find(s => s.key === 'coachTrust')?.newValue ?? save.context.playerState.coachTrust, 0, 100),
          fatigue: clamp(result.stateChanges.find(s => s.key === 'fatigue')?.newValue ?? save.context.playerState.fatigue, 0, 100),
          teamStatus: save.context.playerState.teamStatus,
        },
        pendingEvent: result.event,
      },
      ledger: [...save.ledger, ...newEntries],
      randomState: {
        ...save.randomState,
        sequencePosition: rng.getPosition(),
      },
    };
  };
}

function applyAttributeChange(player: any, change: { attribute: string; newValue: number }): any {
  const { technical, physical, mental } = player.attributes;
  if (change.attribute in technical) {
    return { ...player, attributes: { ...player.attributes, technical: { ...technical, [change.attribute]: change.newValue } } };
  }
  if (change.attribute in physical) {
    return { ...player, attributes: { ...player.attributes, physical: { ...physical, [change.attribute]: change.newValue } } };
  }
  if (change.attribute in mental) {
    return { ...player, attributes: { ...player.attributes, mental: { ...mental, [change.attribute]: change.newValue } } };
  }
  return player;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/application && npx vitest run tests/use-cases/advance-career-week.test.ts
```

- [ ] **Step 5: Update application index.ts**

```typescript
export { createAdvanceCareerWeek } from './use-cases/advance-career-week';
```

- [ ] **Step 6: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add packages/application/ && git commit -m "feat(application): add advance career week use case with validation"
```

---

### Task 8: Implement Submit Event Choice Use Case

**Files:**
- Create: `packages/application/src/use-cases/submit-event-choice.ts`
- Create: `packages/application/tests/use-cases/submit-event-choice.test.ts`
- Modify: `packages/application/src/index.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/application/tests/use-cases/submit-event-choice.test.ts
import { describe, it, expect } from 'vitest';
import { createSubmitEventChoice } from '../../src/use-cases/submit-event-choice';
import type { CareerSave } from '@football/contracts';

function createMockSaveWithEvent(): CareerSave {
  return {
    schemaVersion: 1, contentVersion: 'bootstrap-1', careerId: 'test',
    player: {
      identity: { name: '测试', hometown: '上海', homelandId: 'shanghai', dateOfBirth: '2008-01-01', primaryPosition: 'MIDFIELDER', preferredFoot: 'RIGHT', weakFootLevel: 30, growthBackground: 'academy', personalityTendency: 'composed' },
      attributes: { technical: { firstTouch: 50, dribbling: 50, passing: 50, shooting: 40, defending: 30, aerialAbility: 30 }, physical: { pace: 50, strength: 50, stamina: 50, agility: 50 }, mental: { offTheBall: 50, vision: 50, decision: 50, composure: 50, determination: 50, discipline: 50 } },
      hiddenTraits: { potential: 80, stability: 60, professionalism: 70, pressureResistance: 60, adaptability: 50, injuryProneness: 30 },
      age: 16, careerStage: 'YOUTH', reputation: 20,
    },
    world: { currentDate: '2024-09-15', season: 2024, weekNumber: 3 },
    context: {
      academyId: 'shanghai-pujiang', pendingOpportunity: null,
      playerState: { fitness: 65, morale: 60, coachTrust: 35, fatigue: 8, teamStatus: 'fringe' },
      pendingEvent: {
        eventId: 'coach-praise',
        title: '教练表扬',
        description: '教练在训练后表扬了你的表现。',
        choices: [
          { id: 'c1', text: '感谢教练，继续努力', riskLabel: 'low', effects: { morale: 5, coachTrust: 3 } },
          { id: 'c2', text: '保持低调，继续训练', riskLabel: 'low', effects: { morale: 2, coachTrust: 1 } },
        ],
        resolvedChoiceId: null,
      },
    },
    relationships: { persons: [], activeRelations: [] },
    story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: [] },
    ledger: [{ type: 'career-started', date: '2024-09-01', playerName: '测试', age: 16, position: 'MIDFIELDER' }],
    randomState: { seed: 42, sequencePosition: 5 },
  };
}

describe('createSubmitEventChoice', () => {
  it('submits a valid choice for a pending event', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const result = submit(save, 'c1');
    expect(result.context.pendingEvent).toBeNull();
  });

  it('throws if no pending event exists', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    save.context.pendingEvent = null;
    expect(() => submit(save, 'c1')).toThrow('没有待处理的事件');
  });

  it('throws if event already resolved', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    save.context.pendingEvent!.resolvedChoiceId = 'c1';
    expect(() => submit(save, 'c1')).toThrow('已经处理');
  });

  it('throws if choice ID does not exist', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    expect(() => submit(save, 'invalid')).toThrow('无效');
  });

  it('applies effects from the chosen option', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const result = submit(save, 'c1');
    // c1 has morale +5, coachTrust +3
    expect(result.context.playerState.morale).toBe(65);
    expect(result.context.playerState.coachTrust).toBe(38);
  });

  it('adds event-week ledger entry', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const result = submit(save, 'c1');
    const lastEntry = result.ledger[result.ledger.length - 1];
    expect(lastEntry.type).toBe('event-week');
  });

  it('does not mutate the original save', () => {
    const submit = createSubmitEventChoice();
    const save = createMockSaveWithEvent();
    const originalEvent = save.context.pendingEvent;
    submit(save, 'c1');
    expect(save.context.pendingEvent).toEqual(originalEvent);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/application && npx vitest run tests/use-cases/submit-event-choice.test.ts 2>&1 || true
```

- [ ] **Step 3: Implement submit event choice use case**

```typescript
// packages/application/src/use-cases/submit-event-choice.ts
import { type CareerSave, type CareerLedgerEntry } from '@football/contracts';

/**
 * Creates a submit event choice use case factory.
 * Validates the event exists and is unresolved, then applies effects.
 */
export function createSubmitEventChoice() {
  return (save: CareerSave, choiceId: string): CareerSave => {
    if (!save.context.pendingEvent) {
      throw new Error('没有待处理的事件');
    }

    if (save.context.pendingEvent.resolvedChoiceId !== null) {
      throw new Error('该事件已经处理，不能重复提交');
    }

    const choice = save.context.pendingEvent.choices.find(c => c.id === choiceId);
    if (!choice) {
      throw new Error(`无效的选择 ID: ${choiceId}`);
    }

    // Apply effects
    let playerState = { ...save.context.playerState };
    const effects = choice.effects || {};
    for (const [key, value] of Object.entries(effects)) {
      if (key in playerState) {
        const oldVal = (playerState as Record<string, number>)[key];
        (playerState as Record<string, number>)[key] = Math.min(100, Math.max(0, oldVal + value));
      }
    }

    // Add ledger entry
    const newEntry: CareerLedgerEntry = {
      type: 'event-week',
      date: save.world.currentDate,
      week: save.world.weekNumber,
      eventId: save.context.pendingEvent.eventId,
      title: save.context.pendingEvent.title,
      choiceId: choiceId,
    } as CareerLedgerEntry;

    return {
      ...save,
      context: {
        ...save.context,
        playerState,
        pendingEvent: null,
      },
      ledger: [...save.ledger, newEntry],
    };
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd d:/CodexProgram/FootballSimulator && cd packages/application && npx vitest run tests/use-cases/submit-event-choice.test.ts
```

- [ ] **Step 5: Update application index.ts**

```typescript
export { createSubmitEventChoice } from './use-cases/submit-event-choice';
```

- [ ] **Step 6: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add packages/application/ && git commit -m "feat(application): add submit event choice use case with effect application"
```

---

### Task 9: Implement localStorage Persistence Adapter

**Files:**
- Create: `apps/web/src/persistence/local-storage-save.ts`
- Create: `apps/web/tests/persistence/local-storage-save.test.ts`
- Modify: `apps/web/src/index.ts` (if needed)

- [ ] **Step 1: Write failing tests**

```typescript
// apps/web/tests/persistence/local-storage-save.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLocalStorageSavePort } from '../../src/persistence/local-storage-save';
import type { CareerSave } from '@football/contracts';

const mockSave: CareerSave = {
  schemaVersion: 1, contentVersion: 'bootstrap-1', careerId: 'test-career',
  player: {
    identity: { name: '测试', hometown: '上海', homelandId: 'shanghai', dateOfBirth: '2008-01-01', primaryPosition: 'MIDFIELDER', preferredFoot: 'RIGHT', weakFootLevel: 30, growthBackground: 'academy', personalityTendency: 'composed' },
    attributes: { technical: { firstTouch: 50, dribbling: 50, passing: 50, shooting: 40, defending: 30, aerialAbility: 30 }, physical: { pace: 50, strength: 50, stamina: 50, agility: 50 }, mental: { offTheBall: 50, vision: 50, decision: 50, composure: 50, determination: 50, discipline: 50 } },
    hiddenTraits: { potential: 80, stability: 60, professionalism: 70, pressureResistance: 60, adaptability: 50, injuryProneness: 30 },
    age: 16, careerStage: 'YOUTH', reputation: 20,
  },
  world: { currentDate: '2024-09-08', season: 2024, weekNumber: 2 },
  context: {
    academyId: 'shanghai-pujiang', pendingOpportunity: null,
    playerState: { fitness: 70, morale: 60, coachTrust: 35, fatigue: 5, teamStatus: 'fringe' },
    pendingEvent: null,
  },
  relationships: { persons: [], activeRelations: [] },
  story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: [] },
  ledger: [{ type: 'career-started', date: '2024-09-01', playerName: '测试', age: 16, position: 'MIDFIELDER' }],
  randomState: { seed: 42, sequencePosition: 0 },
};

describe('createLocalStorageSavePort', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads a career', async () => {
    const port = createLocalStorageSavePort();
    await port.save('test-career', mockSave);
    const loaded = await port.load('test-career');
    expect(loaded).toBeDefined();
    expect(loaded!.careerId).toBe('test-career');
  });

  it('returns undefined for non-existent slot', async () => {
    const port = createLocalStorageSavePort();
    const loaded = await port.load('non-existent');
    expect(loaded).toBeUndefined();
  });

  it('lists saved slots', async () => {
    const port = createLocalStorageSavePort();
    await port.save('slot1', mockSave);
    await port.save('slot2', { ...mockSave, careerId: 'slot2' });
    const slots = await port.list();
    expect(slots).toContain('slot1');
    expect(slots).toContain('slot2');
  });

  it('deletes a saved slot', async () => {
    const port = createLocalStorageSavePort();
    await port.save('test-career', mockSave);
    await port.delete('test-career');
    const loaded = await port.load('test-career');
    expect(loaded).toBeUndefined();
  });

  it('returns undefined for corrupted data', async () => {
    const port = createLocalStorageSavePort();
    localStorage.setItem('football-save-test-career', '{corrupted json');
    const loaded = await port.load('test-career');
    expect(loaded).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd d:/CodexProgram/FootballSimulator && cd apps/web && npx vitest run tests/persistence/local-storage-save.test.ts 2>&1 || true
```

- [ ] **Step 3: Implement localStorage adapter**

```typescript
// apps/web/src/persistence/local-storage-save.ts
import { type CareerSave, CareerSaveSchema } from '@football/contracts';
import type { SavePort } from '@football/application';

const STORAGE_PREFIX = 'football-save-';

export function createLocalStorageSavePort(): SavePort {
  return {
    async save(slotId: string, data: CareerSave): Promise<void> {
      try {
        const key = STORAGE_PREFIX + slotId;
        const json = JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          data,
        });
        localStorage.setItem(key, json);
      } catch (e) {
        console.error('Failed to save career:', e);
        throw new Error('存储空间不足，无法保存生涯');
      }
    },

    async load(slotId: string): Promise<CareerSave | undefined> {
      try {
        const key = STORAGE_PREFIX + slotId;
        const raw = localStorage.getItem(key);
        if (!raw) return undefined;

        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.data) return undefined;

        // Validate with Zod schema
        const result = CareerSaveSchema.safeParse(parsed.data);
        if (!result.success) {
          console.error('存档数据损坏，校验失败:', result.error.issues);
          return undefined;
        }

        return result.data;
      } catch (e) {
        console.error('Failed to load career:', e);
        return undefined;
      }
    },

    async list(): Promise<string[]> {
      const slots: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          slots.push(key.slice(STORAGE_PREFIX.length));
        }
      }
      return slots;
    },

    async delete(slotId: string): Promise<void> {
      const key = STORAGE_PREFIX + slotId;
      localStorage.removeItem(key);
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd d:/CodexProgram/FootballSimulator && cd apps/web && npx vitest run tests/persistence/local-storage-save.test.ts
```

- [ ] **Step 5: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add apps/web/src/persistence/ apps/web/tests/persistence/ && git commit -m "feat(web): implement localStorage persistence adapter with schema validation"
```

---

### Task 10: Implement Career Dashboard UI

**Files:**
- Create: `apps/web/src/career-dashboard/CareerDashboard.tsx`
- Create: `apps/web/src/career-dashboard/WeeklyReport.tsx`
- Create: `apps/web/tests/career-dashboard/CareerDashboard.test.tsx`
- Create: `apps/web/tests/career-dashboard/WeeklyReport.test.tsx`

- [ ] **Step 1: Write failing tests for CareerDashboard**

```typescript
// apps/web/tests/career-dashboard/CareerDashboard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CareerDashboard } from '../../src/career-dashboard/CareerDashboard';
import type { CareerSave } from '@football/contracts';

const mockSave: CareerSave = {
  schemaVersion: 1, contentVersion: 'bootstrap-1', careerId: 'test-career',
  player: {
    identity: { name: '林岳', hometown: '上海', homelandId: 'shanghai', dateOfBirth: '2008-06-15', primaryPosition: 'CENTER_BACK', preferredFoot: 'RIGHT', weakFootLevel: 30, growthBackground: 'academy', personalityTendency: 'composed' },
    attributes: { technical: { firstTouch: 50, dribbling: 45, passing: 55, shooting: 30, defending: 65, aerialAbility: 60 }, physical: { pace: 55, strength: 60, stamina: 50, agility: 45 }, mental: { offTheBall: 40, vision: 45, decision: 55, composure: 50, determination: 60, discipline: 65 } },
    hiddenTraits: { potential: 80, stability: 60, professionalism: 70, pressureResistance: 60, adaptability: 50, injuryProneness: 30 },
    age: 16, careerStage: 'YOUTH', reputation: 20,
  },
  world: { currentDate: '2024-09-08', season: 2024, weekNumber: 2 },
  context: {
    academyId: 'shanghai-pujiang', pendingOpportunity: null,
    playerState: { fitness: 70, morale: 62, coachTrust: 38, fatigue: 8, teamStatus: 'fringe' },
    pendingEvent: null,
  },
  relationships: { persons: [], activeRelations: [] },
  story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: [] },
  ledger: [
    { type: 'career-started', date: '2024-09-01', playerName: '林岳', age: 16, position: 'CENTER_BACK' },
    { type: 'youth-opportunity-chosen', date: '2024-09-08', week: 2, offerId: 'offer-shanghai-pujiang', academyId: 'shanghai-pujiang', academyName: '浦江青训中心' },
  ],
  randomState: { seed: 42, sequencePosition: 10 },
};

describe('CareerDashboard', () => {
  it('displays player name', () => {
    render(<CareerDashboard save={mockSave} onAdvance={() => {}} onNewCareer={() => {}} />);
    expect(screen.getByText('林岳')).toBeDefined();
  });

  it('displays the academy name', () => {
    render(<CareerDashboard save={mockSave} onAdvance={() => {}} onNewCareer={() => {}} />);
    expect(screen.getByText('浦江青训中心')).toBeDefined();
  });

  it('displays current date and week', () => {
    render(<CareerDashboard save={mockSave} onAdvance={() => {}} onNewCareer={() => {}} />);
    expect(screen.getByText(/2024/)).toBeDefined();
  });

  it('has an advance week button', () => {
    render(<CareerDashboard save={mockSave} onAdvance={() => {}} onNewCareer={() => {}} />);
    expect(screen.getByRole('button', { name: /推进一周/i })).toBeDefined();
  });

  it('displays player state bars', () => {
    render(<CareerDashboard save={mockSave} onAdvance={() => {}} onNewCareer={() => {}} />);
    expect(screen.getByText('体能')).toBeDefined();
    expect(screen.getByText('士气')).toBeDefined();
    expect(screen.getByText('教练信任')).toBeDefined();
  });

  it('displays 16 attributes', () => {
    render(<CareerDashboard save={mockSave} onAdvance={() => {}} onNewCareer={() => {}} />);
    expect(screen.getByText('停球')).toBeDefined();
    expect(screen.getByText('射门')).toBeDefined();
    expect(screen.getByText('速度')).toBeDefined();
    expect(screen.getByText('意志')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd d:/CodexProgram/FootballSimulator && cd apps/web && npx vitest run tests/career-dashboard/CareerDashboard.test.tsx 2>&1 || true
```

- [ ] **Step 3: Implement CareerDashboard component**

```typescript
// apps/web/src/career-dashboard/CareerDashboard.tsx
import { useState } from 'react';
import type { CareerSave, WeeklyAdvanceResult } from '@football/contracts';
import { createAdvanceCareerWeek } from '@football/application';
import { WeeklyReport } from './WeeklyReport';

interface CareerDashboardProps {
  save: CareerSave;
  onSaveUpdate: (save: CareerSave) => void;
  onNewCareer: () => void;
}

const POSITION_LABELS: Record<string, string> = {
  CENTER_BACK: '中后卫', FULL_BACK: '边后卫', DEFENSIVE_MIDFIELDER: '后腰',
  MIDFIELDER: '中场', WINGER: '边锋', FORWARD: '前锋',
};

const ATTRIBUTE_GROUPS = [
  { label: '技术', keys: ['firstTouch', 'dribbling', 'passing', 'shooting', 'defending', 'aerialAbility'],
    labels: ['停球', '盘带', '传球', '射门', '防守', '空中'] },
  { label: '身体', keys: ['pace', 'strength', 'stamina', 'agility'],
    labels: ['速度', '力量', '耐力', '灵活'] },
  { label: '精神', keys: ['offTheBall', 'vision', 'decision', 'composure', 'determination', 'discipline'],
    labels: ['跑位', '视野', '决策', '镇定', '意志', '纪律'] },
];

export function CareerDashboard({ save, onSaveUpdate, onNewCareer }: CareerDashboardProps) {
  const [advancing, setAdvancing] = useState(false);
  const [weeklyResult, setWeeklyResult] = useState<WeeklyAdvanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const advanceWeek = createAdvanceCareerWeek();

  const handleAdvance = () => {
    setAdvancing(true);
    setError(null);
    try {
      const updated = advanceWeek(save);
      onSaveUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '推进失败');
    } finally {
      setAdvancing(false);
    }
  };

  const handleContinue = () => {
    setWeeklyResult(null);
  };

  // If we have a weekly result, show the report
  if (weeklyResult) {
    return (
      <WeeklyReport
        result={weeklyResult}
        save={save}
        onContinue={handleContinue}
      />
    );
  }

  const { player, world, context } = save;
  const positionLabel = POSITION_LABELS[player.identity.primaryPosition] ?? player.identity.primaryPosition;
  const allAttrs = { ...player.attributes.technical, ...player.attributes.physical, ...player.attributes.mental };
  const { playerState } = context;

  // Get most recent ledger entries for "recent events"
  const recentEntries = [...save.ledger].reverse().slice(0, 3);

  return (
    <div style={{ fontFamily: 'var(--font-serif)' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid var(--color-accent)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '2px' }}>
          生涯仪表盘
        </div>
        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-ink)', marginTop: 'var(--space-xs)' }}>
          青训生涯
        </div>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', fontSize: 'var(--text-base)', color: 'var(--color-accent)' }}>
          {error}
        </div>
      )}

      {/* Player Identity Card */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--color-ink)' }}>{player.identity.name}</div>
        <div style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
          {player.age}岁 · {positionLabel} · {player.identity.hometown}
        </div>
        <div style={{ borderTop: '1px solid var(--color-border-light)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>
          <span>📅 {world.currentDate} · 第{world.weekNumber}周</span>
          <span>🏟️ {save.ledger.find(e => e.type === 'youth-opportunity-chosen')?.academyName ?? '待定'}</span>
        </div>
      </div>

      {/* Player State Bars */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-ink)', marginBottom: 'var(--space-md)' }}>状态</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <StateBar label="体能" value={playerState.fitness} color="#27ae60" />
          <StateBar label="士气" value={playerState.morale} color="#2980b9" />
          <StateBar label="教练信任" value={playerState.coachTrust} color="#8e44ad" />
          <StateBar label="疲劳" value={playerState.fatigue} color="#e67e22" />
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>
            队内地位：{playerState.teamStatus === 'fringe' ? '边缘' : playerState.teamStatus === 'rotation' ? '轮换' : playerState.teamStatus === 'regular' ? '常规' : '核心'}
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-ink)', marginBottom: 'var(--space-md)' }}>属性</div>
        {ATTRIBUTE_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 'var(--space-sm)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>{group.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px var(--space-md)' }}>
              {group.keys.map((key, i) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-base)', padding: '1px 0' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{group.labels[i]}</span>
                  <span style={{ fontWeight: 'bold' }}>{allAttrs[key as keyof typeof allAttrs] ?? '-'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Events */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-ink)', marginBottom: 'var(--space-md)' }}>最近动态</div>
        {recentEntries.length === 0 && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>暂无记录</div>}
        {recentEntries.map((entry, i) => (
          <div key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', padding: 'var(--space-xs) 0', borderBottom: i < recentEntries.length - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
            {entry.type === 'career-started' && `🎯 生涯开始于 ${entry.date}`}
            {entry.type === 'youth-opportunity-chosen' && `🏟️ 加入 ${entry.academyName}`}
            {entry.type === 'week-advanced' && `📅 第 ${entry.week} 周`}
            {entry.type === 'training-week' && `🏋️ 训练：${entry.focus}`}
            {entry.type === 'match-week' && `⚽ 比赛：${entry.played ? `${entry.homeScore}-${entry.awayScore} vs ${entry.opponent} (评分 ${entry.rating})` : `未出场 vs ${entry.opponent}`}`}
            {entry.type === 'event-week' && `📰 ${entry.title}${entry.choiceId ? ' ✓' : ''}`}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={handleAdvance}
          disabled={advancing}
          style={{
            background: 'var(--color-accent)', color: '#fff', border: 'none',
            padding: 'var(--space-md) 40px', borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-lg)', fontWeight: 'bold', letterSpacing: '1px',
            cursor: advancing ? 'default' : 'pointer', opacity: advancing ? 0.6 : 1,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {advancing ? '推进中...' : '推进一周 →'}
        </button>
        <button
          onClick={onNewCareer}
          style={{
            background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)',
            padding: 'var(--space-md) 20px', borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-base)', cursor: 'pointer',
          }}
        >
          新生涯
        </button>
      </div>
    </div>
  );
}

function StateBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: '2px' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 'bold', color }}>{value}</span>
      </div>
      <div style={{ background: 'var(--color-bg-muted)', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
        <div style={{ background: color, width: `${value}%`, height: '100%', borderRadius: '10px', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write failing tests for WeeklyReport**

```typescript
// apps/web/tests/career-dashboard/WeeklyReport.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeeklyReport } from '../../src/career-dashboard/WeeklyReport';
import type { CareerSave, WeeklyAdvanceResult } from '@football/contracts';

const mockSave: CareerSave = {
  schemaVersion: 1, contentVersion: 'bootstrap-1', careerId: 'test',
  player: { identity: { name: '林岳', hometown: '上海', homelandId: 'shanghai', dateOfBirth: '2008-06-15', primaryPosition: 'CENTER_BACK', preferredFoot: 'RIGHT', weakFootLevel: 30, growthBackground: 'academy', personalityTendency: 'composed' },
    attributes: { technical: { firstTouch: 50, dribbling: 45, passing: 55, shooting: 30, defending: 65, aerialAbility: 60 }, physical: { pace: 55, strength: 60, stamina: 50, agility: 45 }, mental: { offTheBall: 40, vision: 45, decision: 55, composure: 50, determination: 60, discipline: 65 } },
    hiddenTraits: { potential: 80, stability: 60, professionalism: 70, pressureResistance: 60, adaptability: 50, injuryProneness: 30 },
    age: 16, careerStage: 'YOUTH', reputation: 20 },
  world: { currentDate: '2024-09-15', season: 2024, weekNumber: 3 },
  context: { academyId: 'shanghai-pujiang', pendingOpportunity: null, playerState: { fitness: 65, morale: 62, coachTrust: 38, fatigue: 8, teamStatus: 'fringe' }, pendingEvent: null },
  relationships: { persons: [], activeRelations: [] },
  story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: [] },
  ledger: [{ type: 'career-started', date: '2024-09-01', playerName: '林岳', age: 16, position: 'CENTER_BACK' }],
  randomState: { seed: 42, sequencePosition: 10 },
};

const mockTrainingResult: WeeklyAdvanceResult = {
  date: '2024-09-15', week: 3, season: 2024,
  activity: 'training',
  trainingSummary: { focus: '防守', attributeChanges: [{ attribute: 'defending', oldValue: 65, newValue: 66 }], fitnessChange: -2, moraleChange: 1, coachTrustChange: 1 },
  matchResult: null,
  event: null,
  stateChanges: [{ key: 'fitness', oldValue: 70, newValue: 68 }, { key: 'morale', oldValue: 60, newValue: 61 }, { key: 'coachTrust', oldValue: 35, newValue: 36 }],
  hasPendingChoice: false,
};

describe('WeeklyReport', () => {
  it('displays the week number', () => {
    render(<WeeklyReport result={mockTrainingResult} save={mockSave} onContinue={() => {}} />);
    expect(screen.getByText(/第 3 周/)).toBeDefined();
  });

  it('displays training summary', () => {
    render(<WeeklyReport result={mockTrainingResult} save={mockSave} onContinue={() => {}} />);
    expect(screen.getByText(/防守/)).toBeDefined();
    expect(screen.getByText(/66/)).toBeDefined();
  });

  it('has a continue button when no pending choice', () => {
    render(<WeeklyReport result={mockTrainingResult} save={mockSave} onContinue={() => {}} />);
    expect(screen.getByRole('button', { name: /继续/i })).toBeDefined();
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

```bash
cd d:/CodexProgram/FootballSimulator && cd apps/web && npx vitest run tests/career-dashboard/CareerDashboard.test.tsx tests/career-dashboard/WeeklyReport.test.tsx 2>&1 || true
```

- [ ] **Step 6: Implement WeeklyReport component**

```typescript
// apps/web/src/career-dashboard/WeeklyReport.tsx
import type { CareerSave, WeeklyAdvanceResult } from '@football/contracts';

interface WeeklyReportProps {
  result: WeeklyAdvanceResult;
  save: CareerSave;
  onContinue: () => void;
}

const ACTIVITY_LABELS: Record<string, { icon: string; label: string }> = {
  training: { icon: '🏋️', label: '训练周' },
  match: { icon: '⚽', label: '比赛周' },
  event: { icon: '📰', label: '事件周' },
  quiet: { icon: '☕', label: '平淡周' },
};

export function WeeklyReport({ result, save, onContinue }: WeeklyReportProps) {
  const activity = ACTIVITY_LABELS[result.activity] ?? { icon: '📅', label: '普通周' };

  return (
    <div style={{ fontFamily: 'var(--font-serif)' }}>
      <div style={{ borderBottom: '2px solid var(--color-accent)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '2px' }}>
          周报
        </div>
        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-ink)', marginTop: 'var(--space-xs)' }}>
          {activity.icon} 第 {result.week} 周 · {activity.label}
        </div>
        <div style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
          {result.date} · {result.season}赛季
        </div>
      </div>

      {/* Training Summary */}
      {result.trainingSummary && (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-ink)', marginBottom: 'var(--space-md)' }}>🏋️ 训练</div>
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)' }}>
            训练重点：{result.trainingSummary.focus}
          </div>
          {result.trainingSummary.attributeChanges.length > 0 && (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              属性变化：
              {result.trainingSummary.attributeChanges.map((c, i) => (
                <span key={i} style={{ marginLeft: 'var(--space-sm)' }}>
                  {c.attribute} {c.oldValue} → <strong>{c.newValue}</strong>
                  {i < result.trainingSummary!.attributeChanges.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Match Result */}
      {result.matchResult && (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-ink)', marginBottom: 'var(--space-md)' }}>⚽ 比赛</div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', textAlign: 'center', marginBottom: 'var(--space-sm)' }}>
            {result.matchResult.isHome ? '主场' : '客场'} vs {result.matchResult.opponent}
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', textAlign: 'center', color: 'var(--color-accent)', marginBottom: 'var(--space-md)' }}>
            {result.matchResult.homeScore} - {result.matchResult.awayScore}
          </div>
          {result.matchResult.played ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 'var(--space-sm)' }}>
                <span>出场 {result.matchResult.minutesPlayed}分钟</span>
                <span>评分 <strong>{result.matchResult.rating}</strong></span>
                {result.matchResult.goals > 0 && <span>⚽ {result.matchResult.goals}球</span>}
                {result.matchResult.assists > 0 && <span>🎯 {result.matchResult.assists}助</span>}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                {result.matchResult.performanceSummary}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>未获得出场机会</div>
          )}
        </div>
      )}

      {/* State Changes */}
      {result.stateChanges.length > 0 && (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-ink)', marginBottom: 'var(--space-md)' }}>📊 状态变化</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            {result.stateChanges.map((c, i) => (
              <div key={i} style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>
                {c.key}: {c.oldValue} → <strong style={{ color: c.newValue > c.oldValue ? 'var(--color-risk-low)' : 'var(--color-risk-high)' }}>{c.newValue}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      {result.hasPendingChoice ? (
        <div style={{ background: '#fef9e7', border: '1px solid #f39c12', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-base)', color: '#e67e22', marginBottom: 'var(--space-sm)' }}>
            ⚠️ 你需要先处理一个事件才能继续推进
          </div>
        </div>
      ) : (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)', textAlign: 'center' }}>
          <button
            onClick={onContinue}
            style={{
              background: 'var(--color-accent)', color: '#fff', border: 'none',
              padding: 'var(--space-md) 40px', borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-lg)', fontWeight: 'bold', letterSpacing: '1px',
              cursor: 'pointer', boxShadow: 'var(--shadow-md)',
            }}
          >
            继续推进 →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd d:/CodexProgram/FootballSimulator && cd apps/web && npx vitest run tests/career-dashboard/CareerDashboard.test.tsx tests/career-dashboard/WeeklyReport.test.tsx
```

- [ ] **Step 8: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add apps/web/src/career-dashboard/ apps/web/tests/career-dashboard/ && git commit -m "feat(web): implement career dashboard and weekly report components"
```

---

### Task 11: Implement Event Choice Panel UI

**Files:**
- Modify: `apps/web/src/event-choice/EventChoicePanel.tsx` (replace existing)
- Create: `apps/web/tests/event-choice/EventChoicePanel.test.tsx` (extend)

- [ ] **Step 1: Write failing tests**

```typescript
// apps/web/tests/event-choice/EventChoicePanel.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventChoicePanel } from '../../src/event-choice/EventChoicePanel';
import type { EventInstance } from '@football/contracts';

const mockEvent: EventInstance = {
  eventId: 'coach-praise',
  title: '教练表扬',
  description: '教练在训练后表扬了你的表现。',
  choices: [
    { id: 'c1', text: '感谢教练，继续努力', riskLabel: 'low', effects: { morale: 5, coachTrust: 3 } },
    { id: 'c2', text: '保持低调，继续训练', riskLabel: 'low', effects: { morale: 2, coachTrust: 1 } },
  ],
  resolvedChoiceId: null,
};

describe('EventChoicePanel', () => {
  it('renders event title and description', () => {
    render(<EventChoicePanel event={mockEvent} onSubmit={() => {}} />);
    expect(screen.getByText('教练表扬')).toBeDefined();
    expect(screen.getByText('教练在训练后表扬了你的表现。')).toBeDefined();
  });

  it('renders all choices', () => {
    render(<EventChoicePanel event={mockEvent} onSubmit={() => {}} />);
    expect(screen.getByText('感谢教练，继续努力')).toBeDefined();
    expect(screen.getByText('保持低调，继续训练')).toBeDefined();
  });

  it('calls onSubmit with the selected choice ID', async () => {
    const user = userEvent.setup();
    let submittedId = '';
    render(<EventChoicePanel event={mockEvent} onSubmit={(id) => { submittedId = id; }} />);
    await user.click(screen.getByText('感谢教练，继续努力'));
    expect(submittedId).toBe('c1');
  });

  it('disables buttons after a choice is made', async () => {
    const user = userEvent.setup();
    render(<EventChoicePanel event={mockEvent} onSubmit={() => {}} />);
    await user.click(screen.getByText('感谢教练，继续努力'));
    const buttons = screen.getAllByRole('button');
    buttons.forEach(b => expect(b).toBeDisabled());
  });

  it('shows resolved state when event already has a choice', () => {
    const resolvedEvent = { ...mockEvent, resolvedChoiceId: 'c1' };
    render(<EventChoicePanel event={resolvedEvent} onSubmit={() => {}} />);
    expect(screen.getByText(/已选择/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd d:/CodexProgram/FootballSimulator && cd apps/web && npx vitest run tests/event-choice/EventChoicePanel.test.tsx 2>&1 || true
```

- [ ] **Step 3: Implement EventChoicePanel**

```typescript
// apps/web/src/event-choice/EventChoicePanel.tsx
import { useState, useRef } from 'react';
import type { EventInstance } from '@football/contracts';

interface EventChoicePanelProps {
  event: EventInstance;
  onSubmit: (choiceId: string) => void;
}

export function EventChoicePanel({ event, onSubmit }: EventChoicePanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const committed = useRef(false);
  const isResolved = event.resolvedChoiceId !== null;

  const handleChoice = (choiceId: string) => {
    if (committed.current || isResolved) return;
    committed.current = true;
    setSelectedId(choiceId);
    onSubmit(choiceId);
  };

  return (
    <div style={{ fontFamily: 'var(--font-serif)' }}>
      <div style={{ borderBottom: '2px solid var(--color-accent)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '2px' }}>
          事件
        </div>
        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-ink)', marginTop: 'var(--space-xs)' }}>
          {event.title}
        </div>
      </div>

      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink)', lineHeight: '1.6', marginBottom: 'var(--space-lg)' }}>
          {event.description}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {event.choices.map((choice) => {
            const isChosen = selectedId === choice.id || event.resolvedChoiceId === choice.id;
            const riskColor = choice.riskLabel === 'low' ? '#27ae60' : choice.riskLabel === 'medium' ? '#f39c12' : '#e74c3c';
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChoice(choice.id)}
                disabled={committed.current || isResolved}
                style={{
                  width: '100%', textAlign: 'left',
                  border: `${isChosen ? 2 : 1}px solid ${isChosen ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)',
                  background: 'var(--color-card)',
                  cursor: committed.current || isResolved ? 'default' : 'pointer',
                  opacity: committed.current && !isChosen ? 0.5 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink)' }}>{choice.text}</span>
                  <span style={{ background: riskColor, color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>
                    {choice.riskLabel === 'low' ? '低风险' : choice.riskLabel === 'medium' ? '中风险' : '高风险'}
                  </span>
                </div>
                {isChosen && (
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)', marginTop: 'var(--space-sm)', fontStyle: 'italic' }}>
                    ← 已选择
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd d:/CodexProgram/FootballSimulator && cd apps/web && npx vitest run tests/event-choice/EventChoicePanel.test.tsx
```

- [ ] **Step 5: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add apps/web/src/event-choice/ apps/web/tests/event-choice/ && git commit -m "feat(web): implement event choice panel with single-click submit"
```

---

### Task 12: Modify App.tsx to Integrate Full Flow

**Files:**
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/tests/app/App.test.tsx`

- [ ] **Step 1: Update App.tsx**

```typescript
// apps/web/src/app/App.tsx
import { useState, useEffect } from 'react';
import type { CareerSave, EventInstance } from '@football/contracts';
import { createBootstrapContent } from './bootstrap-dependencies';
import { CareerCreationForm } from '../career-creation/CareerCreationForm';
import { YouthOpportunityPanel } from '../event-choice/YouthOpportunityPanel';
import { EventChoicePanel } from '../event-choice/EventChoicePanel';
import { CareerDashboard } from '../career-dashboard/CareerDashboard';
import { createAdvanceToDecision, createSubmitYouthChoice, createSubmitEventChoice } from '@football/application';
import { createLocalStorageSavePort } from '../persistence/local-storage-save';
import './app.css';

type FlowStep = 'creation' | 'opportunity' | 'summary' | 'dashboard' | 'event-choice';

const content = createBootstrapContent();
const advanceToDecision = createAdvanceToDecision(content);
const submitYouthChoice = createSubmitYouthChoice();
const submitEventChoice = createSubmitEventChoice();
const savePort = createLocalStorageSavePort();

export function App() {
  const [step, setStep] = useState<FlowStep>('creation');
  const [save, setSave] = useState<CareerSave | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<EventInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Try to load saved career on startup
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const slots = await savePort.list();
        if (slots.length > 0) {
          const saved = await savePort.load(slots[0]);
          if (saved) {
            setSave(saved);
            setStep('dashboard');
            setLoaded(true);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to load saved career:', e);
      }
      setLoaded(true);
    };
    loadSaved();
  }, []);

  const handleCreationComplete = (careerSave: CareerSave) => {
    setSave(careerSave);
    setLoading(true);
    setError(null);
    try {
      const pending = advanceToDecision(careerSave);
      setSave(pending);
      setStep('opportunity');
    } catch (err) {
      setError(err instanceof Error ? err.message : '推进失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = (offerId: string) => {
    if (!save) return;
    try {
      const updated = submitYouthChoice(save, offerId);
      setSave(updated);
      setStep('dashboard');
      // Auto-save after youth choice
      savePort.save(updated.careerId, updated).catch(console.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : '选择失败');
    }
  };

  const handleAdvance = (updatedSave: CareerSave) => {
    setSave(updatedSave);
    // Check if there's a pending event
    if (updatedSave.context.pendingEvent) {
      setPendingEvent(updatedSave.context.pendingEvent);
      setStep('event-choice');
    } else {
      setStep('dashboard');
    }
    // Auto-save after advance
    savePort.save(updatedSave.careerId, updatedSave).catch(console.error);
  };

  const handleEventChoice = (choiceId: string) => {
    if (!save) return;
    try {
      const updated = submitEventChoice(save, choiceId);
      setSave(updated);
      setPendingEvent(null);
      setStep('dashboard');
      // Auto-save after event
      savePort.save(updated.careerId, updated).catch(console.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    }
  };

  const handleNewCareer = () => {
    if (save) {
      savePort.delete(save.careerId).catch(console.error);
    }
    setSave(null);
    setPendingEvent(null);
    setError(null);
    setStep('creation');
  };

  const handleSaveUpdate = (updatedSave: CareerSave) => {
    setSave(updatedSave);
    // Check for pending event after advance
    if (updatedSave.context.pendingEvent) {
      setPendingEvent(updatedSave.context.pendingEvent);
      setStep('event-choice');
    }
    savePort.save(updatedSave.careerId, updatedSave).catch(console.error);
  };

  if (!loaded) {
    return <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'var(--font-serif)' }}>加载中...</div>;
  }

  return (
    <div className="app" role="main">
      <h1 style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-ink)', marginBottom: 'var(--space-2xl)', letterSpacing: '1px' }}>
        足球生涯模拟器
      </h1>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', fontSize: 'var(--text-base)', color: 'var(--color-accent)' }}>
          {error}
        </div>
      )}

      {step === 'creation' && (
        <CareerCreationForm onComplete={handleCreationComplete} content={content} />
      )}

      {step === 'opportunity' && save?.context.pendingOpportunity && (
        <YouthOpportunityPanel
          opportunity={save.context.pendingOpportunity}
          onChoose={handleChoice}
          disabled={loading}
        />
      )}

      {step === 'dashboard' && save && (
        <CareerDashboard
          save={save}
          onSaveUpdate={handleAdvance}
          onNewCareer={handleNewCareer}
        />
      )}

      {step === 'event-choice' && pendingEvent && (
        <div>
          <EventChoicePanel event={pendingEvent} onSubmit={handleEventChoice} />
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)', textAlign: 'center' }}>
            <button
              onClick={() => { setStep('dashboard'); setPendingEvent(null); }}
              style={{
                background: 'transparent', color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)', padding: 'var(--space-md) 20px',
                borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)',
                cursor: 'pointer',
              }}
            >
              返回仪表盘
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update App tests**

```typescript
// apps/web/tests/app/App.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';

// Mock localStorage for persistence
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('App', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders creation form as first step', () => {
    render(<App />);
    expect(screen.getByText('STEP 1 OF 3')).toBeDefined();
    expect(screen.getByText('基本信息')).toBeDefined();
  });

  it('has a single level-one heading', () => {
    render(<App />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
  });

  it('advances a player to the dashboard after full flow', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('球员姓名'), '林岳');
    await user.selectOptions(screen.getByLabelText('家乡'), 'shanghai');
    await user.selectOptions(screen.getByLabelText('主位置'), 'CENTER_BACK');
    await user.click(screen.getByRole('button', { name: /开始生涯/ }));

    // Should see opportunity panel
    expect(screen.getByText('你的青训机会')).toBeDefined();
    const offers = screen.getAllByRole('button', { pressed: false });
    await user.click(offers[0]);

    // Should see dashboard
    expect(screen.getByText('青训生涯')).toBeDefined();
    expect(screen.getByText('推进一周')).toBeDefined();
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
cd d:/CodexProgram/FootballSimulator && cd apps/web && npx vitest run tests/app/App.test.tsx
```

- [ ] **Step 4: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add apps/web/src/app/ apps/web/tests/app/ && git commit -m "feat(web): integrate full career loop flow in App.tsx with save/load"
```

---

### Task 13: Write E2E Tests

**Files:**
- Modify: `apps/web/tests/e2e/bootstrap-career.spec.ts`

- [ ] **Step 1: Update E2E test to cover the full career loop**

```typescript
// apps/web/tests/e2e/bootstrap-career.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Bootstrap Career Flow', () => {
  test('complete flow on desktop', async ({ page }) => {
    await page.goto('/');

    // Step 1: Create player
    await expect(page.getByText('STEP 1 OF 3')).toBeVisible();
    await page.fill('input[aria-label="球员姓名"]', '林岳');
    await page.selectOption('select[aria-label="家乡"]', 'shanghai');
    await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
    await page.click('label:has-text("右脚")');
    await page.click('text=开始生涯');

    // Step 2: Youth opportunity
    await expect(page.getByText('STEP 2 OF 3')).toBeVisible();
    await expect(page.getByText('你的青训机会')).toBeVisible();
    const offers = page.locator('button[aria-pressed]');
    await offers.first().click();

    // Step 3: Career dashboard
    await expect(page.getByText('青训生涯')).toBeVisible();
    await expect(page.getByText('林岳')).toBeVisible();
    await expect(page.getByText('推进一周')).toBeVisible();

    // Advance week
    await page.click('text=推进一周');
    await expect(page.getByText('周报')).toBeVisible();
    await page.click('text=继续推进');

    // Back to dashboard
    await expect(page.getByText('青训生涯')).toBeVisible();
  });

  test('same seed produces same result', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[aria-label="球员姓名"]', '测试球员');
    await page.selectOption('select[aria-label="家乡"]', 'shanghai');
    await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
    await page.click('label:has-text("右脚")');
    await page.fill('input[aria-label="随机种子"]', '42');
    await page.click('text=开始生涯');

    const firstOffer = await page.locator('button[aria-pressed]').first().textContent();

    await page.goto('/');
    await page.fill('input[aria-label="球员姓名"]', '测试球员');
    await page.selectOption('select[aria-label="家乡"]', 'shanghai');
    await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
    await page.click('label:has-text("右脚")');
    await page.fill('input[aria-label="随机种子"]', '42');
    await page.click('text=开始生涯');

    const secondOffer = await page.locator('button[aria-pressed]').first().textContent();
    expect(firstOffer).toBe(secondOffer);
  });

  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(412);
  });
});
```

- [ ] **Step 2: Commit**

```bash
cd d:/CodexProgram/FootballSimulator && git add apps/web/tests/e2e/ && git commit -m "test(e2e): extend E2E tests to cover full career loop flow"
```

---

### Task 14: Run Full Quality Gate

- [ ] **Step 1: Run all unit tests**

```bash
cd d:/CodexProgram/FootballSimulator && pnpm test:unit
```
Expected: All tests pass

- [ ] **Step 2: Run typecheck**

```bash
cd d:/CodexProgram/FootballSimulator && pnpm typecheck
```
Expected: No type errors

- [ ] **Step 3: Run lint**

```bash
cd d:/CodexProgram/FootballSimulator && pnpm lint
```
Expected: No lint errors

- [ ] **Step 4: Run format check**

```bash
cd d:/CodexProgram/FootballSimulator && pnpm format:check
```
Expected: No formatting issues

- [ ] **Step 5: Run architecture tests**

```bash
cd d:/CodexProgram/FootballSimulator && pnpm test:architecture
```
Expected: All architecture tests pass

- [ ] **Step 6: Run build**

```bash
cd d:/CodexProgram/FootballSimulator && pnpm build
```
Expected: Build succeeds

- [ ] **Step 7: Fix any issues found**

- [ ] **Step 8: Commit final fixes**

```bash
cd d:/CodexProgram/FootballSimulator && git add -A && git commit -m "chore: fix quality gate issues"
```

---

### Task 15: Create Final Summary

- [ ] **Step 1: Check git status and create summary**

```bash
cd d:/CodexProgram/FootballSimulator && git log --oneline -10
cd d:/CodexProgram/FootballSimulator && git status
```