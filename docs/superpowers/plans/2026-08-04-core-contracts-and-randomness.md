# Core Contracts & Deterministic Random Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the foundational domain types (Zod-validated contracts) and a seed-based deterministic random number generator, forming the shared language that all simulation logic will build on.

**Architecture:** `packages/contracts` owns all shared types and Zod schemas — no other package defines domain types. `packages/simulation/src/randomness` owns the seeded PRNG and RandomState management. The simulation package depends on contracts, so randomness types live in contracts but the implementation lives in simulation.

**Tech Stack:** TypeScript, Zod (runtime validation + type inference), Vitest (unit tests)

---

### Task 1: Core Primitives & Enums

**Files:**
- Create: `packages/contracts/src/primitives.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/tests/primitives.test.ts`
- Modify: `packages/contracts/package.json`

- [ ] **Step 1: Write tests for primitive enums and basic types**

Create `packages/contracts/tests/primitives.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Position, Foot, CareerStage, PositionSchema, FootSchema, CareerStageSchema } from '../src/primitives';

describe('Position', () => {
  it('has all outfield positions excluding goalkeeper', () => {
    expect(Position.CenterBack).toBe('CENTER_BACK');
    expect(Position.FullBack).toBe('FULL_BACK');
    expect(Position.DefensiveMidfielder).toBe('DEFENSIVE_MIDFIELDER');
    expect(Position.Midfielder).toBe('MIDFIELDER');
    expect(Position.Winger).toBe('WINGER');
    expect(Position.Forward).toBe('FORWARD');
    // Goalkeeper explicitly excluded per spec §3.2
    expect(Object.keys(Position).length).toBe(6);
  });

  it('validates positions via Zod schema', () => {
    expect(PositionSchema.parse('CENTER_BACK')).toBe('CENTER_BACK');
    expect(() => PositionSchema.parse('GOALKEEPER')).toThrow();
    expect(() => PositionSchema.parse('INVALID')).toThrow();
  });
});

describe('Foot', () => {
  it('has left, right, and both', () => {
    expect(Foot.Left).toBe('LEFT');
    expect(Foot.Right).toBe('RIGHT');
    expect(Foot.Both).toBe('BOTH');
  });

  it('validates via Zod schema', () => {
    expect(FootSchema.parse('LEFT')).toBe('LEFT');
    expect(FootSchema.parse('RIGHT')).toBe('RIGHT');
    expect(FootSchema.parse('BOTH')).toBe('BOTH');
    expect(() => FootSchema.parse('AMBIDEXTROUS')).toThrow();
  });
});

describe('CareerStage', () => {
  it('has all career stages', () => {
    expect(CareerStage.Youth).toBe('YOUTH');
    expect(CareerStage.Professional).toBe('PROFESSIONAL');
    expect(CareerStage.Peak).toBe('PEAK');
    expect(CareerStage.Decline).toBe('DECLINE');
    expect(CareerStage.Retired).toBe('RETIRED');
  });

  it('validates via Zod schema', () => {
    expect(CareerStageSchema.parse('YOUTH')).toBe('YOUTH');
    expect(CareerStageSchema.parse('RETIRED')).toBe('RETIRED');
    expect(() => CareerStageSchema.parse('UNKNOWN')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:
```powershell
npx vitest run packages/contracts/tests/primitives.test.ts --reporter=verbose
```
Expected: FAIL — module not found errors for `../src/primitives`

- [ ] **Step 3: Implement primitive enums and Zod schemas**

Create `packages/contracts/src/primitives.ts`:

```typescript
import { z } from 'zod';

export const Position = {
  CenterBack: 'CENTER_BACK',
  FullBack: 'FULL_BACK',
  DefensiveMidfielder: 'DEFENSIVE_MIDFIELDER',
  Midfielder: 'MIDFIELDER',
  Winger: 'WINGER',
  Forward: 'FORWARD',
} as const;

export type Position = (typeof Position)[keyof typeof Position];

export const PositionSchema = z.enum([
  'CENTER_BACK',
  'FULL_BACK',
  'DEFENSIVE_MIDFIELDER',
  'MIDFIELDER',
  'WINGER',
  'FORWARD',
]);

export const Foot = {
  Left: 'LEFT',
  Right: 'RIGHT',
  Both: 'BOTH',
} as const;

export type Foot = (typeof Foot)[keyof typeof Foot];

export const FootSchema = z.enum(['LEFT', 'RIGHT', 'BOTH']);

export const CareerStage = {
  Youth: 'YOUTH',
  Professional: 'PROFESSIONAL',
  Peak: 'PEAK',
  Decline: 'DECLINE',
  Retired: 'RETIRED',
} as const;

export type CareerStage = (typeof CareerStage)[keyof typeof CareerStage];

export const CareerStageSchema = z.enum([
  'YOUTH',
  'PROFESSIONAL',
  'PEAK',
  'DECLINE',
  'RETIRED',
]);
```

Update `packages/contracts/src/index.ts`:

```typescript
export * from './primitives';
```

- [ ] **Step 4: Install vitest and Zod in contracts package**

Run:
```powershell
cd packages/contracts
pnpm add zod
pnpm add -D vitest
```

Add test script to `packages/contracts/package.json`:

```json
"scripts": {
  "typecheck": "tsc -p tsconfig.json",
  "test": "vitest run"
}
```

- [ ] **Step 5: Run tests and verify they pass**

Run:
```powershell
npx vitest run packages/contracts/tests/primitives.test.ts --reporter=verbose
```
Expected: PASS — 3 tests (Position, Foot, CareerStage)

- [ ] **Step 6: Commit**

```powershell
git add packages/contracts/src/primitives.ts packages/contracts/src/index.ts packages/contracts/tests/primitives.test.ts packages/contracts/package.json packages/contracts/tsconfig.json
git commit -m "feat(contracts): define core primitives and enums"
```

---

### Task 2: Player Attributes & Hidden Traits

**Files:**
- Create: `packages/contracts/src/player.ts`
- Create: `packages/contracts/tests/player.test.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Write tests for attributes and hidden traits**

Create `packages/contracts/tests/player.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  TechnicalAttributesSchema,
  PhysicalAttributesSchema,
  MentalAttributesSchema,
  PlayerAttributesSchema,
  HiddenTraitsSchema,
  PlayerIdentitySchema,
} from '../src/player';
import { PositionSchema } from '../src/primitives';

describe('TechnicalAttributes', () => {
  it('validates all 6 technical attributes (0-100)', () => {
    const valid = TechnicalAttributesSchema.parse({
      firstTouch: 65, dribbling: 70, passing: 75,
      shooting: 60, defending: 55, aerialAbility: 68,
    });
    expect(valid.firstTouch).toBe(65);
  });

  it('rejects values below 0', () => {
    expect(() => TechnicalAttributesSchema.parse({
      firstTouch: -1, dribbling: 50, passing: 50,
      shooting: 50, defending: 50, aerialAbility: 50,
    })).toThrow();
  });

  it('rejects values above 100', () => {
    expect(() => TechnicalAttributesSchema.parse({
      firstTouch: 101, dribbling: 50, passing: 50,
      shooting: 50, defending: 50, aerialAbility: 50,
    })).toThrow();
  });
});

describe('PhysicalAttributes', () => {
  it('validates all 4 physical attributes', () => {
    const valid = PhysicalAttributesSchema.parse({
      pace: 80, strength: 70, stamina: 75, agility: 78,
    });
    expect(valid.pace).toBe(80);
  });
});

describe('MentalAttributes', () => {
  it('validates all 6 mental attributes', () => {
    const valid = MentalAttributesSchema.parse({
      offTheBall: 65, vision: 70, decision: 68,
      composure: 72, determination: 80, discipline: 75,
    });
    expect(valid.offTheBall).toBe(65);
  });
});

describe('PlayerAttributes', () => {
  it('combines all 16 attributes into one structure', () => {
    const full = PlayerAttributesSchema.parse({
      technical: { firstTouch: 60, dribbling: 65, passing: 70, shooting: 55, defending: 50, aerialAbility: 62 },
      physical: { pace: 78, strength: 68, stamina: 72, agility: 74 },
      mental: { offTheBall: 60, vision: 65, decision: 63, composure: 67, determination: 75, discipline: 70 },
    });
    expect(full.technical.passing).toBe(70);
    expect(full.physical.pace).toBe(78);
    expect(full.mental.determination).toBe(75);
  });
});

describe('HiddenTraits', () => {
  it('validates all 6 hidden traits', () => {
    const valid = HiddenTraitsSchema.parse({
      potential: 85, stability: 70, professionalism: 75,
      pressureResistance: 65, adaptability: 60, injuryProneness: 40,
    });
    expect(valid.potential).toBe(85);
    expect(valid.injuryProneness).toBe(40);
  });
});

describe('PlayerIdentity', () => {
  it('validates a complete player identity', () => {
    const valid = PlayerIdentitySchema.parse({
      name: '张伟',
      hometown: '上海',
      dateOfBirth: '2008-06-15',
      primaryPosition: 'CENTER_BACK',
      secondaryPosition: 'FULL_BACK',
      preferredFoot: 'RIGHT',
      weakFootLevel: 30,
      growthBackground: '城市青训',
      personalityTendency: 'balanced',
    });
    expect(valid.name).toBe('张伟');
    expect(valid.primaryPosition).toBe('CENTER_BACK');
    expect(valid.secondaryPosition).toBe('FULL_BACK');
  });

  it('allows optional secondary position', () => {
    const valid = PlayerIdentitySchema.parse({
      name: '李强', hometown: '山东', dateOfBirth: '2008-03-20',
      primaryPosition: 'FORWARD', preferredFoot: 'LEFT',
      weakFootLevel: 20, growthBackground: '校园足球', personalityTendency: 'ambitious',
    });
    expect(valid.secondaryPosition).toBeUndefined();
  });

  it('rejects invalid weakFootLevel', () => {
    expect(() => PlayerIdentitySchema.parse({
      name: '王磊', hometown: '广东', dateOfBirth: '2008-01-01',
      primaryPosition: 'MIDFIELDER', preferredFoot: 'RIGHT',
      weakFootLevel: 150, growthBackground: '青训营', personalityTendency: 'balanced',
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:
```powershell
npx vitest run packages/contracts/tests/player.test.ts --reporter=verbose
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement player attribute and identity types**

Create `packages/contracts/src/player.ts`:

```typescript
import { z } from 'zod';
import { PositionSchema, FootSchema } from './primitives';

// Technical attributes (6): 停球、盘带、传球、射门、防守、空中能力
export const TechnicalAttributesSchema = z.object({
  firstTouch: z.number().int().min(0).max(100),
  dribbling: z.number().int().min(0).max(100),
  passing: z.number().int().min(0).max(100),
  shooting: z.number().int().min(0).max(100),
  defending: z.number().int().min(0).max(100),
  aerialAbility: z.number().int().min(0).max(100),
});

export type TechnicalAttributes = z.infer<typeof TechnicalAttributesSchema>;

// Physical attributes (4): 速度、力量、耐力、灵活
export const PhysicalAttributesSchema = z.object({
  pace: z.number().int().min(0).max(100),
  strength: z.number().int().min(0).max(100),
  stamina: z.number().int().min(0).max(100),
  agility: z.number().int().min(0).max(100),
});

export type PhysicalAttributes = z.infer<typeof PhysicalAttributesSchema>;

// Mental attributes (6): 跑位、视野、决策、镇定、意志、纪律
export const MentalAttributesSchema = z.object({
  offTheBall: z.number().int().min(0).max(100),
  vision: z.number().int().min(0).max(100),
  decision: z.number().int().min(0).max(100),
  composure: z.number().int().min(0).max(100),
  determination: z.number().int().min(0).max(100),
  discipline: z.number().int().min(0).max(100),
});

export type MentalAttributes = z.infer<typeof MentalAttributesSchema>;

// All 16 visible attributes
export const PlayerAttributesSchema = z.object({
  technical: TechnicalAttributesSchema,
  physical: PhysicalAttributesSchema,
  mental: MentalAttributesSchema,
});

export type PlayerAttributes = z.infer<typeof PlayerAttributesSchema>;

// Hidden traits (§7): 分项潜力、稳定性、职业素养、抗压能力、适应力、伤病倾向
export const HiddenTraitsSchema = z.object({
  potential: z.number().int().min(0).max(100),
  stability: z.number().int().min(0).max(100),
  professionalism: z.number().int().min(0).max(100),
  pressureResistance: z.number().int().min(0).max(100),
  adaptability: z.number().int().min(0).max(100),
  injuryProneness: z.number().int().min(0).max(100),
});

export type HiddenTraits = z.infer<typeof HiddenTraitsSchema>;

// Player identity (§6): 姓名、家乡、位置、惯用脚、背景、性格
export const PlayerIdentitySchema = z.object({
  name: z.string().min(1).max(50),
  hometown: z.string().min(1).max(30),
  dateOfBirth: z.string(), // ISO date string: "2008-06-15"
  primaryPosition: PositionSchema,
  secondaryPosition: PositionSchema.optional(),
  preferredFoot: FootSchema,
  weakFootLevel: z.number().int().min(0).max(100),
  growthBackground: z.string().min(1).max(50),
  personalityTendency: z.string().min(1).max(30),
});

export type PlayerIdentity = z.infer<typeof PlayerIdentitySchema>;
```

Update `packages/contracts/src/index.ts`:

```typescript
export * from './primitives';
export * from './player';
```

- [ ] **Step 4: Run tests and verify they pass**

Run:
```powershell
npx vitest run packages/contracts/tests/player.test.ts --reporter=verbose
```
Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts/src/player.ts packages/contracts/tests/player.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): define player attributes, hidden traits, and identity"
```

---

### Task 3: World State & Random State

**Files:**
- Create: `packages/contracts/src/world.ts`
- Create: `packages/contracts/src/random.ts`
- Create: `packages/contracts/tests/world.test.ts`
- Create: `packages/contracts/tests/random.test.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Write tests for world state**

Create `packages/contracts/tests/world.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { WorldStateSchema } from '../src/world';

describe('WorldState', () => {
  it('validates a minimal world state', () => {
    const valid = WorldStateSchema.parse({
      currentDate: '2024-09-01',
      season: 2024,
    });
    expect(valid.currentDate).toBe('2024-09-01');
    expect(valid.season).toBe(2024);
  });

  it('rejects missing season', () => {
    expect(() => WorldStateSchema.parse({ currentDate: '2024-09-01' })).toThrow();
  });

  it('rejects invalid date format', () => {
    expect(() => WorldStateSchema.parse({ currentDate: 'not-a-date', season: 2024 })).toThrow();
  });
});
```

- [ ] **Step 2: Write tests for RandomState**

Create `packages/contracts/tests/random.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { RandomStateSchema } from '../src/random';

describe('RandomState', () => {
  it('validates a random state with seed and position', () => {
    const valid = RandomStateSchema.parse({
      seed: 12345,
      sequencePosition: 0,
    });
    expect(valid.seed).toBe(12345);
    expect(valid.sequencePosition).toBe(0);
  });

  it('rejects negative seed', () => {
    expect(() => RandomStateSchema.parse({ seed: -1, sequencePosition: 0 })).toThrow();
  });

  it('rejects negative sequence position', () => {
    expect(() => RandomStateSchema.parse({ seed: 42, sequencePosition: -5 })).toThrow();
  });

  it('accepts 32-bit integer seed values', () => {
    const valid = RandomStateSchema.parse({ seed: 2147483647, sequencePosition: 100 });
    expect(valid.seed).toBe(2147483647);
  });
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run:
```powershell
npx vitest run packages/contracts/tests/world.test.ts packages/contracts/tests/random.test.ts --reporter=verbose
```
Expected: FAIL — module not found

- [ ] **Step 4: Implement world state**

Create `packages/contracts/src/world.ts`:

```typescript
import { z } from 'zod';

// Minimal world state — will expand in later phases
export const WorldStateSchema = z.object({
  currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be ISO format YYYY-MM-DD'),
  season: z.number().int().min(2000).max(2100),
});

export type WorldState = z.infer<typeof WorldStateSchema>;
```

- [ ] **Step 5: Implement RandomState**

Create `packages/contracts/src/random.ts`:

```typescript
import { z } from 'zod';

// RandomState tracks the seed and sequence position for deterministic RNG
export const RandomStateSchema = z.object({
  seed: z.number().int().min(0).max(2147483647),
  sequencePosition: z.number().int().min(0),
});

export type RandomState = z.infer<typeof RandomStateSchema>;
```

Update `packages/contracts/src/index.ts`:

```typescript
export * from './primitives';
export * from './player';
export * from './world';
export * from './random';
```

- [ ] **Step 6: Run tests and verify they pass**

Run:
```powershell
npx vitest run packages/contracts/tests/world.test.ts packages/contracts/tests/random.test.ts --reporter=verbose
```
Expected: PASS — 5 tests (WorldState: 3, RandomState: 4)

- [ ] **Step 7: Commit**

```powershell
git add packages/contracts/src/world.ts packages/contracts/src/random.ts packages/contracts/tests/world.test.ts packages/contracts/tests/random.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): define world state and random state"
```

---

### Task 4: PlayerCareer & CareerSave Aggregate

**Files:**
- Create: `packages/contracts/src/career.ts`
- Create: `packages/contracts/tests/career.test.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Write tests for PlayerCareer and CareerSave**

Create `packages/contracts/tests/career.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { PlayerCareerSchema, CareerSaveSchema } from '../src/career';

describe('PlayerCareer', () => {
  it('validates a complete player career state', () => {
    const valid = PlayerCareerSchema.parse({
      identity: {
        name: '张伟', hometown: '上海', dateOfBirth: '2008-06-15',
        primaryPosition: 'CENTER_BACK', secondaryPosition: 'FULL_BACK',
        preferredFoot: 'RIGHT', weakFootLevel: 30,
        growthBackground: '城市青训', personalityTendency: 'balanced',
      },
      attributes: {
        technical: { firstTouch: 60, dribbling: 65, passing: 70, shooting: 55, defending: 50, aerialAbility: 62 },
        physical: { pace: 78, strength: 68, stamina: 72, agility: 74 },
        mental: { offTheBall: 60, vision: 65, decision: 63, composure: 67, determination: 75, discipline: 70 },
      },
      hiddenTraits: {
        potential: 85, stability: 70, professionalism: 75,
        pressureResistance: 65, adaptability: 60, injuryProneness: 40,
      },
      age: 16,
      careerStage: 'YOUTH',
      reputation: 20,
    });
    expect(valid.age).toBe(16);
    expect(valid.careerStage).toBe('YOUTH');
    expect(valid.reputation).toBe(20);
  });

  it('rejects invalid career stage', () => {
    expect(() => PlayerCareerSchema.parse({
      identity: {
        name: '李强', hometown: '山东', dateOfBirth: '2008-03-20',
        primaryPosition: 'FORWARD', preferredFoot: 'LEFT',
        weakFootLevel: 20, growthBackground: '校园足球', personalityTendency: 'ambitious',
      },
      attributes: {
        technical: { firstTouch: 50, dribbling: 55, passing: 60, shooting: 65, defending: 30, aerialAbility: 58 },
        physical: { pace: 72, strength: 60, stamina: 65, agility: 70 },
        mental: { offTheBall: 55, vision: 60, decision: 58, composure: 62, determination: 70, discipline: 65 },
      },
      hiddenTraits: {
        potential: 80, stability: 65, professionalism: 70,
        pressureResistance: 60, adaptability: 55, injuryProneness: 45,
      },
      age: 16,
      careerStage: 'UNKNOWN',
      reputation: 15,
    })).toThrow();
  });
});

describe('CareerSave', () => {
  it('validates a complete career save', () => {
    const valid = CareerSaveSchema.parse({
      schemaVersion: 1,
      player: {
        identity: {
          name: '张伟', hometown: '上海', dateOfBirth: '2008-06-15',
          primaryPosition: 'CENTER_BACK', secondaryPosition: 'FULL_BACK',
          preferredFoot: 'RIGHT', weakFootLevel: 30,
          growthBackground: '城市青训', personalityTendency: 'balanced',
        },
        attributes: {
          technical: { firstTouch: 60, dribbling: 65, passing: 70, shooting: 55, defending: 50, aerialAbility: 62 },
          physical: { pace: 78, strength: 68, stamina: 72, agility: 74 },
          mental: { offTheBall: 60, vision: 65, decision: 63, composure: 67, determination: 75, discipline: 70 },
        },
        hiddenTraits: {
          potential: 85, stability: 70, professionalism: 75,
          pressureResistance: 65, adaptability: 60, injuryProneness: 40,
        },
        age: 16,
        careerStage: 'YOUTH',
        reputation: 20,
      },
      world: { currentDate: '2024-09-01', season: 2024 },
      randomState: { seed: 12345, sequencePosition: 0 },
    });
    expect(valid.schemaVersion).toBe(1);
    expect(valid.player.identity.name).toBe('张伟');
  });

  it('requires schemaVersion', () => {
    expect(() => CareerSaveSchema.parse({
      player: {}, world: {}, randomState: {},
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:
```powershell
npx vitest run packages/contracts/tests/career.test.ts --reporter=verbose
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement PlayerCareer and CareerSave**

Create `packages/contracts/src/career.ts`:

```typescript
import { z } from 'zod';
import { PlayerIdentitySchema, PlayerAttributesSchema, HiddenTraitsSchema } from './player';
import { CareerStageSchema } from './primitives';
import { WorldStateSchema } from './world';
import { RandomStateSchema } from './random';

// PlayerCareer: 身份、属性、隐藏特质、年龄、生涯阶段、声望 (§23)
export const PlayerCareerSchema = z.object({
  identity: PlayerIdentitySchema,
  attributes: PlayerAttributesSchema,
  hiddenTraits: HiddenTraitsSchema,
  age: z.number().int().min(14).max(50),
  careerStage: CareerStageSchema,
  reputation: z.number().int().min(0).max(100),
});

export type PlayerCareer = z.infer<typeof PlayerCareerSchema>;

// CareerSave: 一段生涯的一致性边界 (§23)
export const CareerSaveSchema = z.object({
  schemaVersion: z.literal(1),
  player: PlayerCareerSchema,
  world: WorldStateSchema,
  randomState: RandomStateSchema,
});

export type CareerSave = z.infer<typeof CareerSaveSchema>;
```

Update `packages/contracts/src/index.ts`:

```typescript
export * from './primitives';
export * from './player';
export * from './world';
export * from './random';
export * from './career';
```

- [ ] **Step 4: Run tests and verify they pass**

Run:
```powershell
npx vitest run packages/contracts/tests/career.test.ts --reporter=verbose
```
Expected: PASS — 4 tests (PlayerCareer: 2, CareerSave: 2)

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts/src/career.ts packages/contracts/tests/career.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): define PlayerCareer and CareerSave aggregate"
```

---

### Task 5: Season & Club Definitions (Static Content)

**Files:**
- Create: `packages/contracts/src/competition.ts`
- Create: `packages/contracts/src/club.ts`
- Create: `packages/contracts/tests/competition.test.ts`
- Create: `packages/contracts/tests/club.test.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Write tests for competition and club types**

Create `packages/contracts/tests/competition.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CompetitionDefinitionSchema } from '../src/competition';

describe('CompetitionDefinition', () => {
  it('validates a competition definition', () => {
    const valid = CompetitionDefinitionSchema.parse({
      id: 'csl',
      name: '中国足球协会超级联赛',
      country: 'China',
      tier: 1,
      type: 'LEAGUE',
    });
    expect(valid.id).toBe('csl');
    expect(valid.tier).toBe(1);
  });

  it('rejects invalid tier', () => {
    expect(() => CompetitionDefinitionSchema.parse({
      id: 'invalid', name: 'Test', country: 'China', tier: 0, type: 'LEAGUE',
    })).toThrow();
  });
});
```

Create `packages/contracts/tests/club.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ClubDefinitionSchema } from '../src/club';

describe('ClubDefinition', () => {
  it('validates a club definition', () => {
    const valid = ClubDefinitionSchema.parse({
      id: 'shanghai-wings',
      name: '上海翼帆',
      shortName: '翼帆',
      country: 'China',
      city: '上海',
      tier: 1,
      reputation: 70,
      tacticalStyle: 'possession',
    });
    expect(valid.id).toBe('shanghai-wings');
    expect(valid.reputation).toBe(70);
  });

  it('rejects reputation out of range', () => {
    expect(() => ClubDefinitionSchema.parse({
      id: 'test', name: 'Test FC', shortName: 'TFC',
      country: 'China', city: '北京', tier: 1,
      reputation: 150, tacticalStyle: 'balanced',
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:
```powershell
npx vitest run packages/contracts/tests/competition.test.ts packages/contracts/tests/club.test.ts --reporter=verbose
```
Expected: FAIL

- [ ] **Step 3: Implement competition and club types**

Create `packages/contracts/src/competition.ts`:

```typescript
import { z } from 'zod';

export const CompetitionTypeSchema = z.enum(['LEAGUE', 'CUP', 'TOURNAMENT']);

export const CompetitionDefinitionSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(60),
  country: z.string().min(1).max(30),
  tier: z.number().int().min(1).max(10),
  type: CompetitionTypeSchema,
});

export type CompetitionDefinition = z.infer<typeof CompetitionDefinitionSchema>;
```

Create `packages/contracts/src/club.ts`:

```typescript
import { z } from 'zod';

export const ClubDefinitionSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(50),
  shortName: z.string().min(1).max(20),
  country: z.string().min(1).max(30),
  city: z.string().min(1).max(30),
  tier: z.number().int().min(1).max(10),
  reputation: z.number().int().min(1).max(100),
  tacticalStyle: z.string().min(1).max(30),
});

export type ClubDefinition = z.infer<typeof ClubDefinitionSchema>;
```

Update `packages/contracts/src/index.ts`:

```typescript
export * from './primitives';
export * from './player';
export * from './world';
export * from './random';
export * from './career';
export * from './competition';
export * from './club';
```

- [ ] **Step 4: Run tests and verify they pass**

Run:
```powershell
npx vitest run packages/contracts/tests/competition.test.ts packages/contracts/tests/club.test.ts --reporter=verbose
```
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts/src/competition.ts packages/contracts/src/club.ts packages/contracts/tests/competition.test.ts packages/contracts/tests/club.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): define competition and club definitions"
```

---

### Task 6: Deterministic Random Source (Seeded PRNG)

**Files:**
- Create: `packages/simulation/src/randomness/index.ts`
- Create: `packages/simulation/src/randomness/seeded-random-source.ts`
- Create: `packages/simulation/tests/randomness/seeded-random-source.test.ts`
- Modify: `packages/simulation/package.json`

- [ ] **Step 1: Write tests for seeded random source**

Create `packages/simulation/tests/randomness/seeded-random-source.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness/seeded-random-source';

describe('SeededRandomSource', () => {
  it('produces deterministic results for the same seed', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);

    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());

    expect(values1).toEqual(values2);
  });

  it('produces different results for different seeds', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(99);

    const values1 = Array.from({ length: 5 }, () => rng1.next());
    const values2 = Array.from({ length: 5 }, () => rng2.next());

    expect(values1).not.toEqual(values2);
  });

  it('returns values in [0, 1) range', () => {
    const rng = createSeededRandomSource(12345);

    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('tracks sequence position', () => {
    const rng = createSeededRandomSource(42);
    expect(rng.getPosition()).toBe(0);

    rng.next();
    expect(rng.getPosition()).toBe(1);

    rng.next();
    rng.next();
    expect(rng.getPosition()).toBe(3);
  });

  it('can be restored from a saved position', () => {
    const rng1 = createSeededRandomSource(42);
    rng1.next(); // position 1
    rng1.next(); // position 2
    const valueAt2 = rng1.next(); // position 3

    const rng2 = createSeededRandomSource(42);
    // Fast-forward to position 3
    rng2.next(); rng2.next(); rng2.next();

    expect(rng2.next()).toBe(valueAt2);
  });

  it('generates integer in range', () => {
    const rng = createSeededRandomSource(42);

    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(1, 6);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it('generates integer in range with correct distribution', () => {
    // With a fixed seed, the results are deterministic
    const rng = createSeededRandomSource(42);
    const results = Array.from({ length: 1000 }, () => rng.nextInt(1, 100));
    const uniqueValues = new Set(results);
    // Should have a good spread of values
    expect(uniqueValues.size).toBeGreaterThan(50);
  });

  it('picks weighted random element', () => {
    const rng = createSeededRandomSource(42);
    const items = ['a', 'b', 'c'];
    const weights = [1, 1, 1];

    const results = Array.from({ length: 100 }, () => rng.pickWeighted(items, weights));
    expect(results.every(r => items.includes(r))).toBe(true);
  });

  it('shuffles array deterministically', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);

    const arr1 = [1, 2, 3, 4, 5, 6, 7, 8];
    const arr2 = [1, 2, 3, 4, 5, 6, 7, 8];

    const shuffled1 = rng1.shuffle(arr1);
    const shuffled2 = rng2.shuffle(arr2);

    expect(shuffled1).toEqual(shuffled2);
    // Length unchanged
    expect(shuffled1.length).toBe(8);
    // All elements present
    expect(shuffled1.sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:
```powershell
npx vitest run packages/simulation/tests/randomness/seeded-random-source.test.ts --reporter=verbose
```
Expected: FAIL — module not found

- [ ] **Step 3: Install vitest in simulation package**

Run:
```powershell
cd packages/simulation
pnpm add -D vitest
```

Add test script to `packages/simulation/package.json`:

```json
"scripts": {
  "typecheck": "tsc -p tsconfig.json",
  "test": "vitest run"
}
```

- [ ] **Step 4: Implement seeded random source**

Create `packages/simulation/src/randomness/seeded-random-source.ts`:

```typescript
// Mulberry32 — a fast, high-quality 32-bit seeded PRNG.
// Returns a generator of deterministic floats in [0, 1).
export interface SeededRandomSource {
  /** Next float in [0, 1) */
  next(): number;
  /** Next integer in [min, max] inclusive */
  nextInt(min: number, max: number): number;
  /** Pick a random element from an array */
  pick<T>(items: readonly T[]): T;
  /** Pick weighted (weights sum to > 0) */
  pickWeighted<T>(items: readonly T[], weights: readonly number[]): T;
  /** Fisher-Yates shuffle (returns new array) */
  shuffle<T>(items: readonly T[]): T[];
  /** Current sequence position */
  getPosition(): number;
}

export const createSeededRandomSource = (seed: number): SeededRandomSource => {
  let state = seed | 0;  // Ensure 32-bit integer
  let position = 0;

  const next = (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    position++;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const nextInt = (min: number, max: number): number => {
    return Math.floor(next() * (max - min + 1)) + min;
  };

  const pick = <T>(items: readonly T[]): T => {
    return items[nextInt(0, items.length - 1)];
  };

  const pickWeighted = <T>(items: readonly T[], weights: readonly number[]): T => {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = next() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      random -= weights[i]!;
      if (random <= 0) return items[i]!;
    }
    return items[items.length - 1]!;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = nextInt(0, i);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  };

  const getPosition = (): number => position;

  return { next, nextInt, pick, pickWeighted, shuffle, getPosition };
};
```

Create `packages/simulation/src/randomness/index.ts`:

```typescript
export { createSeededRandomSource } from './seeded-random-source';
export type { SeededRandomSource } from './seeded-random-source';
```

- [ ] **Step 5: Run tests and verify they pass**

Run:
```powershell
npx vitest run packages/simulation/tests/randomness/seeded-random-source.test.ts --reporter=verbose
```
Expected: PASS — 8 tests

- [ ] **Step 6: Commit**

```powershell
git add packages/simulation/src/randomness/seeded-random-source.ts packages/simulation/src/randomness/index.ts packages/simulation/tests/randomness packages/simulation/package.json
git commit -m "feat(simulation): implement seeded PRNG (mulberry32) with utility functions"
```

---

### Task 7: Run All Contracts & Simulation Tests

- [ ] **Step 1: Run all tests across both packages**

Run:
```powershell
cd packages/contracts && npx vitest run --reporter=verbose
cd packages/simulation && npx vitest run --reporter=verbose
```
Expected: All contracts tests PASS (20 tests), all simulation tests PASS (8 tests)

- [ ] **Step 2: Run type checking**

Run:
```powershell
pnpm -r typecheck
```
Expected: All packages pass type checking

- [ ] **Step 3: Commit final integration state**

```powershell
git add -A
git commit -m "feat: complete core contracts and deterministic random source"
```

---

## Plan Boundary

After this plan, the repository has:
1. Core domain types (enums, attributes, hidden traits, player identity, world state, random state, CareerSave)
2. Static content definitions (competition, club)
3. A seeded deterministic random source with utility functions (nextInt, pick, pickWeighted, shuffle)
4. All types validated via Zod schemas with inferred TypeScript types

The next plan should build on this foundation with:
- Player creation flow (generate initial 16-year-old with attributes)
- Calendar/time progression
- Ordinary match simulation
- Local atomic save via IndexedDB