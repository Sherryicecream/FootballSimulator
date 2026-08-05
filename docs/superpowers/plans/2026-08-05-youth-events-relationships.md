# Youth Career Events & Relationships Implementation Plan

> **For agentic workers:** Use inline execution with checkpoints.

**Goal:** Add narrative events, initial coach/teammate generation, event selection in weekly advance, and relationship display to the youth career loop.

**Architecture:** Add content data (event definitions), simulation logic (initial people, event integration in weekly advance), update application layer (extended event effects), and web UI (event display, relationship cards).

**Tech Stack:** TypeScript, Zod, React 19, Vitest

---

### Task 1: Create Youth Event Content Data

**Files:**
- Create: `packages/content/src/events/youth-events.ts`
- Create: `packages/content/tests/events/youth-events.test.ts`
- Modify: `packages/content/src/index.ts`

- [ ] **Step 1: Create event definitions**

```typescript
// packages/content/src/events/youth-events.ts
import type { EventDefinition } from '@football/contracts';

export const youthEvents: EventDefinition[] = [
  {
    id: 'coach-praise',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '教练的表扬',
    description: '今天的训练结束后，教练单独把你叫到一边，对你的表现表示了肯定。"这段时间进步很大，继续保持。"教练说道。',
    condition: {},
    choices: [
      { id: 'cp-humble', text: '感谢教练，我会继续努力', riskLabel: 'low', effects: { morale: 5, coachTrust: 3 } },
      { id: 'cp-confident', text: '是的，我感觉自己越来越好了', riskLabel: 'low', effects: { morale: 3, coachTrust: 5 } },
    ],
    cooldownWeeks: 4,
    narrativeTemplate: '## {title}\n\n{description}',
  },
  {
    id: 'late-to-training',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '训练迟到',
    description: '今早你睡过了头，赶到训练场时大家已经开始热身了。教练皱着眉头看了你一眼，没有说话。',
    condition: {},
    choices: [
      { id: 'lt-apologize', text: '诚恳道歉，解释原因', riskLabel: 'low', effects: { coachTrust: -2, morale: -2 } },
      { id: 'lt-quiet', text: '默默加入训练，用表现说话', riskLabel: 'medium', effects: { coachTrust: -5, morale: -1 } },
    ],
    cooldownWeeks: 8,
  },
  {
    id: 'team-invite',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '队友的邀请',
    description: '训练结束后，几个队友商量着周末一起去吃火锅，他们热情地邀请你一起参加。',
    condition: {},
    choices: [
      { id: 'ti-go', text: '当然去，和大家增进感情', riskLabel: 'low', effects: { morale: 5, fatigue: 3 } },
      { id: 'ti-rest', text: '婉拒，周末想休息一下', riskLabel: 'low', effects: { morale: 1, fatigue: -3 } },
    ],
    cooldownWeeks: 6,
  },
  {
    id: 'minor-injury',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '轻微不适',
    description: '训练中你感到小腿有些酸痛，队医建议你休息几天，但最近正是竞争主力位置的关键时期。',
    condition: {},
    choices: [
      { id: 'mi-rest', text: '听从队医建议，休息恢复', riskLabel: 'low', effects: { fatigue: -10, coachTrust: -2, morale: -2 } },
      { id: 'mi-push', text: '坚持训练，不能掉队', riskLabel: 'high', effects: { fatigue: 10, coachTrust: 3, morale: 3 } },
    ],
    cooldownWeeks: 10,
  },
  {
    id: 'competition-with-teammate',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '位置竞争',
    description: '队里来了一个新球员，和你踢同一个位置。教练在训练中让你们轮流上场，似乎正在考察谁更适合首发。',
    condition: {},
    choices: [
      { id: 'cw-train-harder', text: '加练，用实力证明自己', riskLabel: 'medium', effects: { fatigue: 8, coachTrust: 4, morale: 3 } },
      { id: 'cw-observed', text: '先观察对手的特点，再调整策略', riskLabel: 'low', effects: { morale: 2, coachTrust: 1 } },
    ],
    cooldownWeeks: 12,
  },
  {
    id: 'family-support',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '家人的鼓励',
    description: '父母打电话来关心你的训练和生活，叮嘱你注意身体，说他们为你感到骄傲。',
    condition: {},
    choices: [
      { id: 'fs-touched', text: '心里暖暖的，更加坚定', riskLabel: 'low', effects: { morale: 6 } },
      { id: 'fs-focused', text: '简短回应，继续专注于训练', riskLabel: 'low', effects: { morale: 2, coachTrust: 1 } },
    ],
    cooldownWeeks: 6,
  },
  {
    id: 'quiet-week-reflection',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '平淡的一周',
    description: '这一周没有特别的事情发生，训练按部就班，生活平静如水。你利用这段时间反思了自己的进步和不足。',
    condition: {},
    choices: [
      { id: 'qw-self-improve', text: '制定新的训练计划', riskLabel: 'low', effects: { morale: 2, fatigue: 2 } },
      { id: 'qw-rest', text: '好好休息，为下一周充电', riskLabel: 'low', effects: { fatigue: -5, morale: 1 } },
    ],
    cooldownWeeks: 3,
  },
];

export function getYouthEvents(): EventDefinition[] {
  return youthEvents;
}
```

- [ ] **Step 2: Write tests**

```typescript
// packages/content/tests/events/youth-events.test.ts
import { describe, it, expect } from 'vitest';
import { getYouthEvents } from '../../src/events/youth-events';

describe('youthEvents', () => {
  it('returns at least 5 events', () => {
    const events = getYouthEvents();
    expect(events.length).toBeGreaterThanOrEqual(5);
  });

  it('every event has a unique id', () => {
    const events = getYouthEvents();
    const ids = events.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every event has at least 1 choice', () => {
    const events = getYouthEvents();
    for (const event of events) {
      expect(event.choices.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every event has a valid category', () => {
    const events = getYouthEvents();
    for (const event of events) {
      expect(['china-youth', 'dressing-room', 'off-pitch', 'asia-career', 'europe-career', 'national-team']).toContain(event.category);
    }
  });

  it('every event has a valid rarity', () => {
    const events = getYouthEvents();
    for (const event of events) {
      expect(['common', 'uncommon', 'rare', 'legendary']).toContain(event.rarity);
    }
  });
});
```

- [ ] **Step 3: Update content index.ts**

```typescript
// packages/content/src/index.ts
export { getRegionProfile, getKeyRegions, getAllRegions } from './regions';
export { getYouthEvents } from './events/youth-events';
```

- [ ] **Step 4: Test and commit**

```bash
cd d:/CodexProgram/FootballSimulator && npx vitest run --project domain
```

---

### Task 2: Initialize Coach and Teammates

**Files:**
- Create: `packages/simulation/src/relationships/initial-people.ts`
- Create: `packages/simulation/tests/relationships/initial-people.test.ts`
- Modify: `packages/simulation/src/index.ts`
- Modify: `packages/application/src/use-cases/submit-youth-choice.ts`

- [ ] **Step 1: Implement initial people generation**

```typescript
// packages/simulation/src/relationships/initial-people.ts
import type { Person } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import { createPerson } from './relationship-manager';

const COACH_NAMES = ['王磊', '李刚', '张军', '刘伟', '陈明', '赵强', '周涛', '孙辉'];
const TEAMMATE_FIRST_NAMES = ['杨帆', '吴昊', '徐磊', '黄俊', '马超', '郑凯', '朱涛', '何鑫', '林海', '郭峰', '罗杰', '梁宇', '宋杰', '唐亮', '韩冰', '冯晨', '曹阳', '邓辉', '许峰', '彭浩'];
const TEAMMATE_POSITIONS = ['CENTER_BACK', 'FULL_BACK', 'DEFENSIVE_MIDFIELDER', 'MIDFIELDER', 'WINGER', 'FORWARD'];
const PERSONALITY_TRAITS = ['严谨', '开朗', '沉稳', '急躁', '幽默', '内向', '自信', '谦逊'];

export function generateCoach(rng: SeededRandomSource): Person {
  const name = rng.pick(COACH_NAMES);
  const personality = rng.pick(PERSONALITY_TRAITS);
  const age = rng.nextInt(35, 55);
  return createPerson(`coach-${name}`, `${name}教练`, 'coach', age, personality);
}

export function generateTeammates(playerPosition: string, rng: SeededRandomSource): Person[] {
  const teammates: Person[] = [];
  const usedPositions = new Set<string>();
  usedPositions.add(playerPosition);

  for (let i = 0; i < 2; i++) {
    const name = rng.pick(TEAMMATE_FIRST_NAMES);
    const personality = rng.pick(PERSONALITY_TRAITS);
    const availablePositions = TEAMMATE_POSITIONS.filter(p => !usedPositions.has(p));
    const position = rng.pick(availablePositions);
    usedPositions.add(position);
    const age = rng.nextInt(15, 18);
    const person = createPerson(`teammate-${i + 1}`, name, 'teammate', age, personality);
    // Add position-specific traits
    person.traits = { ...person.traits, position };
    teammates.push(person);
  }

  return teammates;
}
```

- [ ] **Step 2: Write tests**

```typescript
// packages/simulation/tests/relationships/initial-people.test.ts
import { describe, it, expect } from 'vitest';
import { createSeededRandomSource } from '../../src/randomness';
import { generateCoach, generateTeammates } from '../../src/relationships/initial-people';

describe('generateCoach', () => {
  it('returns a coach person', () => {
    const rng = createSeededRandomSource(42);
    const coach = generateCoach(rng);
    expect(coach.role).toBe('coach');
    expect(coach.name).toBeTruthy();
    expect(coach.age).toBeGreaterThanOrEqual(35);
    expect(coach.age).toBeLessThanOrEqual(55);
  });

  it('same seed produces same coach', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    expect(generateCoach(rng1).name).toBe(generateCoach(rng2).name);
  });
});

describe('generateTeammates', () => {
  it('returns 2 teammates', () => {
    const rng = createSeededRandomSource(42);
    const teammates = generateTeammates('MIDFIELDER', rng);
    expect(teammates).toHaveLength(2);
  });

  it('teammates have different positions from player', () => {
    const rng = createSeededRandomSource(42);
    const teammates = generateTeammates('MIDFIELDER', rng);
    for (const tm of teammates) {
      expect(tm.traits.position).not.toBe('MIDFIELDER');
    }
  });

  it('same seed produces same teammates', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);
    const t1 = generateTeammates('MIDFIELDER', rng1);
    const t2 = generateTeammates('MIDFIELDER', rng2);
    expect(t1[0].name).toBe(t2[0].name);
    expect(t1[1].name).toBe(t2[1].name);
  });
});
```

- [ ] **Step 3: Update simulation index.ts**

```typescript
export { generateCoach, generateTeammates } from './relationships/initial-people';
```

- [ ] **Step 4: Integrate into submit-youth-choice**

In `packages/application/src/use-cases/submit-youth-choice.ts`, after choosing an opportunity, generate coach and teammates using the save's random state.

---

### Task 3: Integrate Event Selection into Weekly Advance

**Files:**
- Modify: `packages/simulation/src/career/weekly-advance.ts`
- Create: `packages/simulation/src/career/event-integration.ts`
- Test: update `packages/simulation/tests/career/weekly-advance.test.ts`

- [ ] **Step 1: Create event integration function**

```typescript
// packages/simulation/src/career/event-integration.ts
import type { EventDefinition, EventInstance, PlayerContext, CareerSave } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import { filterEligibleEvents, selectEvent } from '../events/event-selector';

export function pickEventForWeek(
  events: EventDefinition[],
  save: CareerSave,
  weekNumber: number,
  rng: SeededRandomSource,
): EventInstance | null {
  const context: PlayerContext = {
    age: save.player.age,
    reputation: save.player.reputation,
    season: save.world.season,
    week: weekNumber,
    storyState: {
      activeStorylines: save.story.resolvedOpportunityIds,
      completedStoryIds: save.story.resolvedOpportunityIds,
      cooldowns: {},
      pendingDelayedEffects: [],
    },
  };

  const eligible = filterEligibleEvents(events, context);
  if (eligible.length === 0) return null;

  const selected = selectEvent(eligible, rng);
  if (!selected) return null;

  return {
    eventId: selected.id,
    title: selected.title,
    description: selected.description,
    choices: selected.choices.map(c => ({
      id: c.id,
      text: c.text,
      riskLabel: c.riskLabel,
      effects: c.effects,
    })),
    resolvedChoiceId: null,
  };
}
```

- [ ] **Step 2: Modify weekly-advance.ts to accept events and use event weeks**

Modify `advanceCareerWeek` to accept an `events` parameter and generate events on event weeks.

---

### Task 4: Updated Application Layer

**Files:**
- Modify: `packages/application/src/use-cases/advance-career-week.ts`
- Modify: `packages/application/src/use-cases/submit-event-choice.ts`

Pass event content from web layer through the use case, integrate event selection into weekly advance.

---

### Task 5: Web UI — Event Display & Relationship Cards

**Files:**
- Modify: `apps/web/src/career-dashboard/CareerDashboard.tsx`
- Modify: `apps/web/src/career-dashboard/WeeklyReport.tsx`
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/bootstrap-dependencies.ts`

---

Let me start implementing directly since the user has approved the plan. Proceeding with Task 1.