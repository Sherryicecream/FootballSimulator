# 事件系统、人物关系与模板叙事 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 实现事件系统（事件定义、条件筛选、选择器）、人物关系系统（Person、RelationshipGraph、记忆）和本地模板叙事引擎。

**架构：** `packages/contracts` 定义事件、人物、关系类型；`packages/simulation` 实现事件选择器、关系管理、人物记忆和叙事模板引擎；`packages/content` 提供初始人物原型和事件模板数据。

**技术栈：** TypeScript, Zod, Vitest

---

### Task 1: 事件系统契约

**文件：**
- Create: `packages/contracts/src/event.ts`
- Create: `packages/contracts/tests/event.test.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: 编写测试**

创建 `packages/contracts/tests/event.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { EventDefinitionSchema, EventChoiceSchema, StoryStateSchema } from '../src/event';

describe('EventChoice', () => {
  it('验证事件选项', () => {
    const valid = EventChoiceSchema.parse({
      id: 'accept_challenge',
      text: '接受挑战，加倍努力训练',
      riskLabel: '中等',
      effects: { reputation: 5, determination: 2 },
      delayEffects: { stamina: -3 },
    });
    expect(valid.id).toBe('accept_challenge');
    expect(valid.riskLabel).toBe('中等');
  });
});

describe('EventDefinition', () => {
  it('验证完整事件定义', () => {
    const valid = EventDefinitionSchema.parse({
      id: 'coach_challenge_01',
      version: 1,
      category: 'dressing-room',
      rarity: 'common',
      title: '教练的挑战',
      description: '主教练在训练后单独找到你，对你的表现提出了更高的要求。',
      condition: { minAge: 16, maxAge: 35, minReputation: 10 },
      choices: [
        { id: 'accept', text: '接受挑战', riskLabel: '低', effects: { determination: 3 } },
        { id: 'ignore', text: '不以为意', riskLabel: '中', effects: { coachTrust: -5 } },
      ],
      cooldownWeeks: 8,
    });
    expect(valid.id).toBe('coach_challenge_01');
    expect(valid.choices.length).toBe(2);
  });

  it('拒绝缺少选项的事件', () => {
    expect(() => EventDefinitionSchema.parse({
      id: 'bad_event', version: 1, category: 'dressing-room', rarity: 'common',
      title: '坏事件', description: '没有选项',
      condition: {}, choices: [],
      cooldownWeeks: 4,
    })).toThrow();
  });
});

describe('StoryState', () => {
  it('验证故事状态', () => {
    const valid = StoryStateSchema.parse({
      activeStorylines: [],
      completedStoryIds: ['coach_challenge_01'],
      cooldowns: { 'coach_challenge_01': 8 },
      pendingDelayedEffects: [],
    });
    expect(valid.completedStoryIds).toContain('coach_challenge_01');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/contracts; pnpm test tests/event.test.ts --reporter=verbose
```
预期：FAIL

- [ ] **Step 3: 实现事件契约**

创建 `packages/contracts/src/event.ts`：

```typescript
import { z } from 'zod';

export const RaritySchema = z.enum(['common', 'uncommon', 'rare', 'legendary']);

export const EventCategorySchema = z.enum([
  'china-youth', 'dressing-room', 'off-pitch', 'asia-career', 'europe-career', 'national-team',
]);

export const EventChoiceSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().min(1).max(200),
  riskLabel: z.string().min(1).max(10),
  effects: z.record(z.number().int()).default({}),
  delayEffects: z.record(z.number().int()).optional().default({}),
  memoryKey: z.string().optional(),
});

export type EventChoice = z.infer<typeof EventChoiceSchema>;

export const EventConditionSchema = z.object({
  minAge: z.number().int().min(14).max(50).optional(),
  maxAge: z.number().int().min(14).max(50).optional(),
  minReputation: z.number().int().min(0).max(100).optional(),
  maxReputation: z.number().int().min(0).max(100).optional(),
  minSeason: z.number().int().optional(),
  position: z.string().optional(),
  requireStoryId: z.string().optional(),
  excludeStoryId: z.string().optional(),
});

export const EventDefinitionSchema = z.object({
  id: z.string().min(1).max(40),
  version: z.number().int().min(1),
  category: EventCategorySchema,
  rarity: RaritySchema,
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  condition: EventConditionSchema.default({}),
  choices: z.array(EventChoiceSchema).min(1),
  cooldownWeeks: z.number().int().min(0).max(52).default(0),
  storyId: z.string().optional(),
  nextEvents: z.array(z.string()).optional().default([]),
  narrativeTemplate: z.string().optional(),
});

export type EventDefinition = z.infer<typeof EventDefinitionSchema>;

export const DelayedEffectSchema = z.object({
  triggerWeek: z.number().int(),
  effects: z.record(z.number().int()),
  sourceEventId: z.string(),
});

export const StoryStateSchema = z.object({
  activeStorylines: z.array(z.string()),
  completedStoryIds: z.array(z.string()),
  cooldowns: z.record(z.number().int()),
  pendingDelayedEffects: z.array(DelayedEffectSchema),
});

export type StoryState = z.infer<typeof StoryStateSchema>;
```

更新 `packages/contracts/src/index.ts`，添加 `export * from './event';`

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/contracts; pnpm test tests/event.test.ts --reporter=verbose
```
预期：PASS — 4 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/contracts/src/event.ts packages/contracts/tests/event.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): 定义事件系统契约"
```

---

### Task 2: 人物关系契约

**文件：**
- Create: `packages/contracts/src/person.ts`
- Create: `packages/contracts/tests/person.test.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: 编写测试**

创建 `packages/contracts/tests/person.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { PersonSchema, RelationshipGraphSchema, PersonMemorySchema } from '../src/person';

describe('PersonMemory', () => {
  it('验证人物记忆', () => {
    const valid = PersonMemorySchema.parse({
      eventId: 'coach_challenge_01',
      summary: '教练在训练后挑战了我',
      season: 2024,
      week: 5,
      emotionalImpact: 'positive',
    });
    expect(valid.eventId).toBe('coach_challenge_01');
  });
});

describe('Person', () => {
  it('验证人物定义', () => {
    const valid = PersonSchema.parse({
      id: 'coach_li',
      name: '李教练',
      role: '教练',
      age: 45,
      personality: '严格',
      traits: { tactical: 75, manManagement: 70, youthDevelopment: 80 },
      relationship: { trust: 50, respect: 50, closeness: 30 },
      memories: [],
    });
    expect(valid.name).toBe('李教练');
    expect(valid.relationship.trust).toBe(50);
  });
});

describe('RelationshipGraph', () => {
  it('验证关系图', () => {
    const valid = RelationshipGraphSchema.parse({
      persons: [],
      activeRelations: [],
    });
    expect(valid.persons).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/contracts; pnpm test tests/person.test.ts --reporter=verbose
```
预期：FAIL

- [ ] **Step 3: 实现人物关系契约**

创建 `packages/contracts/src/person.ts`：

```typescript
import { z } from 'zod';

export const PersonMemorySchema = z.object({
  eventId: z.string().min(1).max(40),
  summary: z.string().min(1).max(200),
  season: z.number().int(),
  week: z.number().int().min(1).max(52),
  emotionalImpact: z.enum(['positive', 'negative', 'neutral']),
});

export type PersonMemory = z.infer<typeof PersonMemorySchema>;

export const RelationshipDimensionSchema = z.object({
  trust: z.number().int().min(0).max(100),
  respect: z.number().int().min(0).max(100),
  closeness: z.number().int().min(0).max(100),
});

export type RelationshipDimension = z.infer<typeof RelationshipDimensionSchema>;

export const PersonSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(50),
  role: z.string().min(1).max(30),
  age: z.number().int().min(16).max(80),
  personality: z.string().min(1).max(30),
  traits: z.record(z.number().int().min(0).max(100)).default({}),
  relationship: RelationshipDimensionSchema,
  memories: z.array(PersonMemorySchema).default([]),
});

export type Person = z.infer<typeof PersonSchema>;

export const ActiveRelationSchema = z.object({
  personId: z.string().min(1).max(40),
  relationType: z.enum(['teammate', 'coach', 'rival', 'friend', 'family', 'agent']),
  sinceSeason: z.number().int(),
});

export const RelationshipGraphSchema = z.object({
  persons: z.array(PersonSchema),
  activeRelations: z.array(ActiveRelationSchema),
});

export type RelationshipGraph = z.infer<typeof RelationshipGraphSchema>;
```

更新 `packages/contracts/src/index.ts`，添加 `export * from './person';`

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/contracts; pnpm test tests/person.test.ts --reporter=verbose
```
预期：PASS — 3 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/contracts/src/person.ts packages/contracts/tests/person.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): 定义人物关系契约"
```

---

### Task 3: 事件选择器

**文件：**
- Create: `packages/simulation/src/events/event-selector.ts`
- Create: `packages/simulation/tests/events/event-selector.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: 编写测试**

创建 `packages/simulation/tests/events/event-selector.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { filterEligibleEvents, selectEvent } from '../../src/events/event-selector';
import { createSeededRandomSource } from '../../src/randomness/seeded-random-source';
import type { EventDefinition, StoryState } from '@football/contracts';

const mockEvents: EventDefinition[] = [
  {
    id: 'youth_training', version: 1, category: 'china-youth', rarity: 'common',
    title: '青训训练', description: '日常训练',
    condition: { minAge: 14, maxAge: 20 }, choices: [{ id: 'a', text: '努力训练', riskLabel: '低' }],
    cooldownWeeks: 4,
  },
  {
    id: 'coach_praise', version: 1, category: 'dressing-room', rarity: 'common',
    title: '教练表扬', description: '教练在队前表扬了你',
    condition: { minReputation: 30 }, choices: [{ id: 'a', text: '谦虚回应', riskLabel: '低' }],
    cooldownWeeks: 8,
  },
  {
    id: 'injury_scare', version: 1, category: 'dressing-room', rarity: 'uncommon',
    title: '伤病惊魂', description: '训练中感到不适',
    condition: {}, choices: [{ id: 'a', text: '报告教练', riskLabel: '低' }, { id: 'b', text: '继续训练', riskLabel: '高' }],
    cooldownWeeks: 12,
  },
];

describe('filterEligibleEvents', () => {
  it('根据年龄过滤事件', () => {
    const result = filterEligibleEvents(mockEvents, { age: 16, reputation: 20, season: 2024, week: 1, storyState: { activeStorylines: [], completedStoryIds: [], cooldowns: {}, pendingDelayedEffects: [] } });
    expect(result.map(e => e.id)).toContain('youth_training');
    expect(result.map(e => e.id)).not.toContain('coach_praise');
  });

  it('排除冷却期中的事件', () => {
    const result = filterEligibleEvents(mockEvents, {
      age: 16, reputation: 20, season: 2024, week: 1,
      storyState: { activeStorylines: [], completedStoryIds: [], cooldowns: { youth_training: 4 }, pendingDelayedEffects: [] },
    });
    expect(result.map(e => e.id)).not.toContain('youth_training');
  });
});

describe('selectEvent', () => {
  it('从合法事件中选择一个', () => {
    const rng = createSeededRandomSource(42);
    const events = [mockEvents[0]!, mockEvents[2]!];
    const selected = selectEvent(events, rng);
    expect(events.map(e => e.id)).toContain(selected.id);
  });

  it('没有合法事件时返回 undefined', () => {
    const rng = createSeededRandomSource(42);
    const selected = selectEvent([], rng);
    expect(selected).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/simulation; pnpm test tests/events/event-selector.test.ts --reporter=verbose
```
预期：FAIL

- [ ] **Step 3: 实现事件选择器**

创建 `packages/simulation/src/events/event-selector.ts`：

```typescript
import type { EventDefinition, StoryState } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';

export interface PlayerContext {
  age: number;
  reputation: number;
  season: number;
  week: number;
  storyState: StoryState;
}

export function filterEligibleEvents(
  events: EventDefinition[],
  context: PlayerContext,
): EventDefinition[] {
  return events.filter((event) => {
    const c = event.condition;

    if (c.minAge !== undefined && context.age < c.minAge) return false;
    if (c.maxAge !== undefined && context.age > c.maxAge) return false;
    if (c.minReputation !== undefined && context.reputation < c.minReputation) return false;
    if (c.maxReputation !== undefined && context.reputation > c.maxReputation) return false;

    // 冷却期检查
    const cooldown = context.storyState.cooldowns[event.id];
    if (cooldown !== undefined && cooldown > 0) return false;

    // 故事线互斥
    if (c.excludeStoryId && context.storyState.completedStoryIds.includes(c.excludeStoryId)) return false;

    // 需要前置故事线
    if (c.requireStoryId && !context.storyState.completedStoryIds.includes(c.requireStoryId)) return false;

    return true;
  });
}

export function selectEvent(
  eligibleEvents: EventDefinition[],
  rng: SeededRandomSource,
): EventDefinition | undefined {
  if (eligibleEvents.length === 0) return undefined;

  // 按稀有度加权选择
  const rarityWeights: Record<string, number> = {
    common: 50, uncommon: 30, rare: 15, legendary: 5,
  };

  const weights = eligibleEvents.map((e) => rarityWeights[e.rarity] ?? 10);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let random = rng.next() * totalWeight;
  for (let i = 0; i < eligibleEvents.length; i++) {
    random -= weights[i]!;
    if (random <= 0) return eligibleEvents[i]!;
  }

  return eligibleEvents[eligibleEvents.length - 1];
}
```

更新 `packages/simulation/src/index.ts`，添加：

```typescript
export { filterEligibleEvents, selectEvent } from './events/event-selector';
export type { PlayerContext } from './events/event-selector';
```

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/simulation; pnpm test tests/events/event-selector.test.ts --reporter=verbose
```
预期：PASS — 4 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/simulation/src/events/event-selector.ts packages/simulation/tests/events packages/simulation/src/index.ts
git commit -m "feat(simulation): 实现事件选择器"
```

---

### Task 4: 人物关系管理

**文件：**
- Create: `packages/simulation/src/relationships/relationship-manager.ts`
- Create: `packages/simulation/tests/relationships/relationship-manager.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: 编写测试**

创建 `packages/simulation/tests/relationships/relationship-manager.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { createPerson, updateRelationship, addMemory, getRelationshipLabel } from '../../src/relationships/relationship-manager';

describe('relationshipManager', () => {
  it('创建人物', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格');
    expect(person.name).toBe('李教练');
    expect(person.relationship.trust).toBe(50);
  });

  it('更新关系维度', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格');
    const updated = updateRelationship(person, { trust: 10, respect: 5 });
    expect(updated.relationship.trust).toBe(60);
    expect(updated.relationship.respect).toBe(55);
  });

  it('关系维度不会超过上下限', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格');
    const updated = updateRelationship(person, { trust: 100 });
    expect(updated.relationship.trust).toBe(100);
    expect(updated.relationship.trust).not.toBeGreaterThan(100);
  });

  it('添加记忆', () => {
    const person = createPerson('coach_li', '李教练', '教练', 45, '严格');
    const updated = addMemory(person, 'coach_challenge_01', '教练挑战了我', 2024, 5, 'positive');
    expect(updated.memories.length).toBe(1);
    expect(updated.memories[0]!.eventId).toBe('coach_challenge_01');
  });

  it('获取关系标签', () => {
    expect(getRelationshipLabel(85)).toBe('亲密');
    expect(getRelationshipLabel(60)).toBe('信任');
    expect(getRelationshipLabel(40)).toBe('中立');
    expect(getRelationshipLabel(15)).toBe('疏远');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/simulation; pnpm test tests/relationships/relationship-manager.test.ts --reporter=verbose
```
预期：FAIL

- [ ] **Step 3: 实现关系管理**

创建 `packages/simulation/src/relationships/relationship-manager.ts`：

```typescript
import type { Person, PersonMemory, RelationshipDimension } from '@football/contracts';

export function createPerson(
  id: string, name: string, role: string, age: number, personality: string,
  traits?: Record<string, number>,
): Person {
  return {
    id, name, role, age, personality,
    traits: traits ?? {},
    relationship: { trust: 50, respect: 50, closeness: 30 },
    memories: [],
  };
}

export function updateRelationship(
  person: Person,
  delta: Partial<RelationshipDimension>,
): Person {
  const clamp = (value: number) => Math.min(100, Math.max(0, value));

  return {
    ...person,
    relationship: {
      trust: clamp(person.relationship.trust + (delta.trust ?? 0)),
      respect: clamp(person.relationship.respect + (delta.respect ?? 0)),
      closeness: clamp(person.relationship.closeness + (delta.closeness ?? 0)),
    },
  };
}

export function addMemory(
  person: Person,
  eventId: string,
  summary: string,
  season: number,
  week: number,
  emotionalImpact: 'positive' | 'negative' | 'neutral',
): Person {
  const memory: PersonMemory = { eventId, summary, season, week, emotionalImpact };
  return {
    ...person,
    memories: [...person.memories, memory],
  };
}

export function getRelationshipLabel(averageScore: number): string {
  if (averageScore >= 80) return '亲密';
  if (averageScore >= 55) return '信任';
  if (averageScore >= 30) return '中立';
  return '疏远';
}
```

更新 `packages/simulation/src/index.ts`，添加：

```typescript
export { createPerson, updateRelationship, addMemory, getRelationshipLabel } from './relationships/relationship-manager';
```

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/simulation; pnpm test tests/relationships/relationship-manager.test.ts --reporter=verbose
```
预期：PASS — 5 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/simulation/src/relationships packages/simulation/tests/relationships packages/simulation/src/index.ts
git commit -m "feat(simulation): 实现人物关系管理"
```

---

### Task 5: 模板叙事引擎

**文件：**
- Create: `packages/simulation/src/events/narrative.ts`
- Create: `packages/simulation/tests/events/narrative.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: 编写测试**

创建 `packages/simulation/tests/events/narrative.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { renderTemplate, generateEventNarrative } from '../../src/events/narrative';

describe('narrative', () => {
  it('渲染简单模板', () => {
    const result = renderTemplate('你好，{name}！', { name: '张伟' });
    expect(result).toBe('你好，张伟！');
  });

  it('渲染多个变量', () => {
    const result = renderTemplate('{player}在{club}的训练中表现出色', { player: '张伟', club: '上海翼帆' });
    expect(result).toBe('张伟在上海翼帆的训练中表现出色');
  });

  it('未提供变量时保留占位符', () => {
    const result = renderTemplate('你好，{name}！', {});
    expect(result).toBe('你好，{name}！');
  });

  it('根据事件生成叙事文本', () => {
    const narrative = generateEventNarrative(
      '教练的挑战',
      '主教练对你提出了更高的要求。',
      '接受挑战，加倍努力训练',
      { coachName: '李教练', playerName: '张伟' },
    );
    expect(narrative).toContain('教练的挑战');
    expect(narrative).toContain('李教练');
    expect(narrative).toContain('张伟');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/simulation; pnpm test tests/events/narrative.test.ts --reporter=verbose
```
预期：FAIL

- [ ] **Step 3: 实现模板叙事引擎**

创建 `packages/simulation/src/events/narrative.ts`：

```typescript
/** 简单模板渲染：将 {key} 替换为变量值 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return variables[key] !== undefined ? String(variables[key]) : `{${key}}`;
  });
}

/** 生成事件叙事文本 */
export function generateEventNarrative(
  title: string,
  description: string,
  choiceText: string,
  context: Record<string, string | number>,
): string {
  const renderedTitle = renderTemplate(title, context);
  const renderedDesc = renderTemplate(description, context);
  const renderedChoice = renderTemplate(choiceText, context);

  return `## ${renderedTitle}\n\n${renderedDesc}\n\n**你的选择：** ${renderedChoice}`;
}
```

更新 `packages/simulation/src/index.ts`，添加：

```typescript
export { renderTemplate, generateEventNarrative } from './events/narrative';
```

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/simulation; pnpm test tests/events/narrative.test.ts --reporter=verbose
```
预期：PASS — 4 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/simulation/src/events/narrative.ts packages/simulation/tests/events/narrative.test.ts packages/simulation/src/index.ts
git commit -m "feat(simulation): 实现模板叙事引擎"
```

---

### Task 6: 全部测试与类型检查

- [ ] **Step 1: 运行所有包测试**

```powershell
pnpm --filter @football/contracts test --reporter=verbose
pnpm --filter @football/simulation test --reporter=verbose
pnpm --filter @football/application test --reporter=verbose
```
预期：所有测试通过

- [ ] **Step 2: 运行架构测试**

```powershell
node --test tools/architecture/tests/repository-config.test.mjs tools/architecture/tests/workspace-policy.test.mjs tools/architecture/tests/workspace-structure.test.mjs
```
预期：10 个测试全部通过

- [ ] **Step 3: 提交最终集成状态**

```powershell
git add -A
git commit -m "feat: 完成事件系统、人物关系和模板叙事"
```

---

## 计划边界

完成后将具备：
1. 事件系统契约（EventDefinition, EventChoice, StoryState）
2. 人物关系契约（Person, RelationshipGraph, PersonMemory）
3. 事件选择器（条件过滤、冷却期、加权选择）
4. 人物关系管理（创建、更新关系、添加记忆、关系标签）
5. 模板叙事引擎（变量渲染、事件叙事生成）
6. 所有测试通过，预计 105+ 测试

后续计划：
- 球员成长和训练系统
- 俱乐部角色、合同和转会市场
- 重要比赛关键时刻