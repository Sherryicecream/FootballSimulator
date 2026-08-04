# 普通比赛、赛季循环与本地存档 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 实现普通比赛自动模拟、赛季循环（联赛积分榜、赛程推进）和本地原子存档接口，使一段生涯可以在赛季层面推进。

**架构：** `packages/contracts` 定义比赛结果和球队状态类型；`packages/simulation` 实现比赛模拟引擎、球队实力计算和赛季循环；`packages/application` 定义存档端口接口。暂不接入真实 IndexedDB，先定义端口抽象。

**技术栈：** TypeScript, Zod, Vitest

---

### Task 1: 比赛结果与球队状态契约

**文件：**
- Create: `packages/contracts/src/match.ts`
- Create: `packages/contracts/tests/match.test.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: 编写测试**

创建 `packages/contracts/tests/match.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { MatchResultSchema, TeamStrengthSchema, LeagueStandingSchema } from '../src/match';

describe('TeamStrength', () => {
  it('验证球队实力', () => {
    const valid = TeamStrengthSchema.parse({
      attack: 75,
      midfield: 70,
      defence: 68,
      overall: 71,
    });
    expect(valid.overall).toBe(71);
  });

  it('拒绝无效的实力值', () => {
    expect(() => TeamStrengthSchema.parse({
      attack: 150, midfield: 50, defence: 50, overall: 50,
    })).toThrow();
  });
});

describe('MatchResult', () => {
  it('验证完整比赛结果', () => {
    const valid = MatchResultSchema.parse({
      homeTeam: 'shanghai-wings',
      awayTeam: 'beijing-dragons',
      homeScore: 2,
      awayScore: 1,
      homeStrength: { attack: 75, midfield: 70, defence: 68, overall: 71 },
      awayStrength: { attack: 65, midfield: 68, defence: 70, overall: 68 },
      homePossession: 55,
      awayPossession: 45,
      homeShots: 12,
      awayShots: 8,
      homeShotsOnTarget: 5,
      awayShotsOnTarget: 3,
      weekNumber: 5,
      season: 2024,
    });
    expect(valid.homeScore).toBe(2);
    expect(valid.awayScore).toBe(1);
  });

  it('拒绝负分', () => {
    expect(() => MatchResultSchema.parse({
      homeTeam: 'a', awayTeam: 'b',
      homeScore: -1, awayScore: 0,
      homeStrength: { attack: 50, midfield: 50, defence: 50, overall: 50 },
      awayStrength: { attack: 50, midfield: 50, defence: 50, overall: 50 },
      homePossession: 50, awayPossession: 50,
      homeShots: 0, awayShots: 0,
      homeShotsOnTarget: 0, awayShotsOnTarget: 0,
      weekNumber: 1, season: 2024,
    })).toThrow();
  });
});

describe('LeagueStanding', () => {
  it('验证联赛积分榜条目', () => {
    const valid = LeagueStandingSchema.parse({
      clubId: 'shanghai-wings',
      played: 10,
      won: 6,
      drawn: 2,
      lost: 2,
      goalsFor: 18,
      goalsAgainst: 10,
      points: 20,
    });
    expect(valid.points).toBe(20);
  });

  it('拒绝胜场数多于比赛数', () => {
    expect(() => LeagueStandingSchema.parse({
      clubId: 'test', played: 5, won: 6, drawn: 0, lost: 0,
      goalsFor: 10, goalsAgainst: 5, points: 18,
    })).toThrow();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/contracts; pnpm test tests/match.test.ts --reporter=verbose
```
预期：FAIL — 模块未找到

- [ ] **Step 3: 实现比赛相关类型**

创建 `packages/contracts/src/match.ts`：

```typescript
import { z } from 'zod';

export const TeamStrengthSchema = z.object({
  attack: z.number().int().min(0).max(100),
  midfield: z.number().int().min(0).max(100),
  defence: z.number().int().min(0).max(100),
  overall: z.number().int().min(0).max(100),
});

export type TeamStrength = z.infer<typeof TeamStrengthSchema>;

export const MatchResultSchema = z.object({
  homeTeam: z.string().min(1).max(40),
  awayTeam: z.string().min(1).max(40),
  homeScore: z.number().int().min(0).max(50),
  awayScore: z.number().int().min(0).max(50),
  homeStrength: TeamStrengthSchema,
  awayStrength: TeamStrengthSchema,
  homePossession: z.number().int().min(0).max(100),
  awayPossession: z.number().int().min(0).max(100),
  homeShots: z.number().int().min(0),
  awayShots: z.number().int().min(0),
  homeShotsOnTarget: z.number().int().min(0),
  awayShotsOnTarget: z.number().int().min(0),
  weekNumber: z.number().int().min(1).max(52),
  season: z.number().int().min(2000).max(2100),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

export const LeagueStandingSchema = z.object({
  clubId: z.string().min(1).max(40),
  played: z.number().int().min(0),
  won: z.number().int().min(0),
  drawn: z.number().int().min(0),
  lost: z.number().int().min(0),
  goalsFor: z.number().int().min(0),
  goalsAgainst: z.number().int().min(0),
  points: z.number().int().min(0),
}).refine(
  (s) => s.won + s.drawn + s.lost === s.played,
  { message: '胜场+平局+负场必须等于比赛场次' },
);

export type LeagueStanding = z.infer<typeof LeagueStandingSchema>;
```

更新 `packages/contracts/src/index.ts`，添加 `export * from './match';`

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/contracts; pnpm test tests/match.test.ts --reporter=verbose
```
预期：PASS — 4 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/contracts/src/match.ts packages/contracts/tests/match.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): 定义比赛结果和球队实力契约"
```

---

### Task 2: 比赛模拟引擎

**文件：**
- Create: `packages/simulation/src/match/match-engine.ts`
- Create: `packages/simulation/tests/match/match-engine.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: 编写测试**

创建 `packages/simulation/tests/match/match-engine.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { simulateMatch } from '../../src/match/match-engine';
import { createSeededRandomSource } from '../../src/randomness/seeded-random-source';

describe('simulateMatch', () => {
  const homeStrength = { attack: 75, midfield: 70, defence: 68, overall: 71 };
  const awayStrength = { attack: 65, midfield: 68, defence: 70, overall: 68 };

  it('生成比赛结果，包含主客队比分', () => {
    const rng = createSeededRandomSource(42);
    const result = simulateMatch('shanghai-wings', 'beijing-dragons', homeStrength, awayStrength, 5, 2024, rng);

    expect(result.homeTeam).toBe('shanghai-wings');
    expect(result.awayTeam).toBe('beijing-dragons');
    expect(typeof result.homeScore).toBe('number');
    expect(typeof result.awayScore).toBe('number');
  });

  it('强队主场更可能获胜', () => {
    let homeWins = 0;
    for (let seed = 0; seed < 100; seed++) {
      const rng = createSeededRandomSource(seed);
      const result = simulateMatch('home', 'away', homeStrength, awayStrength, 1, 2024, rng);
      if (result.homeScore > result.awayScore) homeWins++;
    }
    expect(homeWins).toBeGreaterThan(40);
  });

  it('同一种子生成相同结果', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);

    const result1 = simulateMatch('a', 'b', homeStrength, awayStrength, 1, 2024, rng1);
    const result2 = simulateMatch('a', 'b', homeStrength, awayStrength, 1, 2024, rng2);

    expect(result1).toEqual(result2);
  });

  it('生成合理的射门和技术统计', () => {
    const rng = createSeededRandomSource(42);
    const result = simulateMatch('a', 'b', homeStrength, awayStrength, 1, 2024, rng);

    expect(result.homeShots + result.awayShots).toBeGreaterThan(0);
    expect(result.homeShotsOnTarget).toBeLessThanOrEqual(result.homeShots);
    expect(result.awayShotsOnTarget).toBeLessThanOrEqual(result.awayShots);
    expect(result.homePossession + result.awayPossession).toBe(100);
  });

  it('比分不会过大', () => {
    const rng = createSeededRandomSource(42);
    const result = simulateMatch('a', 'b', homeStrength, awayStrength, 1, 2024, rng);

    expect(result.homeScore).toBeLessThanOrEqual(10);
    expect(result.awayScore).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/simulation; pnpm test tests/match/match-engine.test.ts --reporter=verbose
```
预期：FAIL

- [ ] **Step 3: 实现比赛模拟引擎**

创建 `packages/simulation/src/match/match-engine.ts`：

```typescript
import { type MatchResult, type TeamStrength } from '@football/contracts';
import { type SeededRandomSource } from '../randomness/seeded-random-source';

/** 根据球队实力模拟一场普通比赛 */
export function simulateMatch(
  homeTeam: string,
  awayTeam: string,
  homeStrength: TeamStrength,
  awayStrength: TeamStrength,
  weekNumber: number,
  season: number,
  rng: SeededRandomSource,
): MatchResult {
  // 主场优势加成
  const homeAdvantage = 5;

  // 计算有效实力（含主场优势）
  const effectiveHome = homeStrength.overall + homeAdvantage;
  const effectiveAway = awayStrength.overall;

  // 总实力
  const totalStrength = effectiveHome + effectiveAway;

  // 控球率（基于中场实力）
  const homePossession = Math.round(50 + (homeStrength.midfield - awayStrength.midfield) * 0.8 + rng.nextInt(-5, 5));
  const clampedHomePossession = Math.min(75, Math.max(25, homePossession));

  // 射门次数（基于进攻实力和控球）
  const homeShots = Math.max(0, Math.round((effectiveHome / totalStrength) * 15 + rng.nextInt(-3, 5)));
  const awayShots = Math.max(0, Math.round((effectiveAway / totalStrength) * 12 + rng.nextInt(-3, 4)));

  // 射正率（基于进攻vs防守）
  const homeShotAccuracy = 0.3 + (homeStrength.attack - awayStrength.defence) / 200;
  const awayShotAccuracy = 0.3 + (awayStrength.attack - homeStrength.defence) / 200;

  const homeShotsOnTarget = Math.min(homeShots, Math.max(0, Math.round(homeShots * homeShotAccuracy * (0.8 + rng.next() * 0.4))));
  const awayShotsOnTarget = Math.min(awayShots, Math.max(0, Math.round(awayShots * awayShotAccuracy * (0.8 + rng.next() * 0.4))));

  // 进球（基于射正率和随机波动）
  const homeScore = calculateGoals(homeShotsOnTarget, homeStrength.attack, awayStrength.defence, rng);
  const awayScore = calculateGoals(awayShotsOnTarget, awayStrength.attack, homeStrength.defence, rng);

  return {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    homeStrength,
    awayStrength,
    homePossession: clampedHomePossession,
    awayPossession: 100 - clampedHomePossession,
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    weekNumber,
    season,
  };
}

function calculateGoals(
  shotsOnTarget: number,
  attack: number,
  defence: number,
  rng: SeededRandomSource,
): number {
  if (shotsOnTarget === 0) return 0;
  // 进球转换率：基于攻击vs防守，单人单次射门约 10%-30%
  const conversionRate = 0.1 + (attack - defence) / 300 + rng.next() * 0.1;
  const rawGoals = shotsOnTarget * Math.max(0.05, Math.min(0.5, conversionRate));
  return Math.min(10, Math.round(rawGoals + (rng.next() < 0.2 ? rng.nextInt(-1, 1) : 0)));
}
```

更新 `packages/simulation/src/index.ts`，添加导出：

```typescript
export { simulateMatch } from './match/match-engine';
```

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/simulation; pnpm test tests/match/match-engine.test.ts --reporter=verbose
```
预期：PASS — 5 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/simulation/src/match/match-engine.ts packages/simulation/tests/match/match-engine.test.ts packages/simulation/src/index.ts
git commit -m "feat(simulation): 实现普通比赛模拟引擎"
```

---

### Task 3: 联赛赛季系统

**文件：**
- Create: `packages/simulation/src/world/league-season.ts`
- Create: `packages/simulation/tests/world/league-season.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: 编写测试**

创建 `packages/simulation/tests/world/league-season.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { createLeagueStandings, updateStandings, getStandings } from '../../src/world/league-season';
import { LeagueStandingSchema } from '@football/contracts';

describe('LeagueSeason', () => {
  const clubs = ['shanghai-wings', 'beijing-dragons', 'guangzhou-tigers', 'shenzhen-bay'];

  it('创建联赛初始积分榜', () => {
    const standings = createLeagueStandings(clubs);
    expect(standings.length).toBe(4);
    for (const s of standings) {
      expect(s.played).toBe(0);
      expect(s.points).toBe(0);
    }
  });

  it('更新积分榜（主队胜）', () => {
    const standings = createLeagueStandings(clubs);
    const updated = updateStandings(standings, 'shanghai-wings', 'beijing-dragons', 2, 0);

    const home = updated.find(s => s.clubId === 'shanghai-wings')!;
    const away = updated.find(s => s.clubId === 'beijing-dragons')!;

    expect(home.played).toBe(1);
    expect(home.won).toBe(1);
    expect(home.points).toBe(3);
    expect(home.goalsFor).toBe(2);
    expect(home.goalsAgainst).toBe(0);

    expect(away.played).toBe(1);
    expect(away.lost).toBe(1);
    expect(away.points).toBe(0);
  });

  it('更新积分榜（平局）', () => {
    const standings = createLeagueStandings(clubs);
    const updated = updateStandings(standings, 'shanghai-wings', 'beijing-dragons', 1, 1);

    const home = updated.find(s => s.clubId === 'shanghai-wings')!;
    expect(home.drawn).toBe(1);
    expect(home.points).toBe(1);
  });

  it('积分榜通过 Zod 校验', () => {
    const standings = createLeagueStandings(clubs);
    const updated = updateStandings(standings, 'shanghai-wings', 'beijing-dragons', 3, 1);

    for (const s of updated) {
      const result = LeagueStandingSchema.safeParse(s);
      expect(result.success).toBe(true);
    }
  });

  it('按积分降序排列', () => {
    const standings = createLeagueStandings(clubs);
    const afterResults = updateStandings(standings, 'shanghai-wings', 'beijing-dragons', 2, 0);
    const sorted = getStandings(afterResults);

    expect(sorted[0]!.clubId).toBe('shanghai-wings');
    expect(sorted[0]!.points).toBe(3);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/simulation; pnpm test tests/world/league-season.test.ts --reporter=verbose
```
预期：FAIL

- [ ] **Step 3: 实现联赛赛季系统**

创建 `packages/simulation/src/world/league-season.ts`：

```typescript
import { type LeagueStanding } from '@football/contracts';

/** 创建联赛初始积分榜 */
export function createLeagueStandings(clubIds: string[]): LeagueStanding[] {
  return clubIds.map((clubId) => ({
    clubId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
}

/** 更新积分榜（根据比赛结果） */
export function updateStandings(
  standings: LeagueStanding[],
  homeClubId: string,
  awayClubId: string,
  homeScore: number,
  awayScore: number,
): LeagueStanding[] {
  return standings.map((s) => {
    if (s.clubId === homeClubId) {
      return updateStanding(s, homeScore, awayScore, homeScore > awayScore);
    }
    if (s.clubId === awayClubId) {
      return updateStanding(s, awayScore, homeScore, awayScore > homeScore);
    }
    return { ...s };
  });
}

function updateStanding(
  standing: LeagueStanding,
  goalsFor: number,
  goalsAgainst: number,
  isWin: boolean,
): LeagueStanding {
  const isDraw = goalsFor === goalsAgainst;
  return {
    ...standing,
    played: standing.played + 1,
    won: isWin ? standing.won + 1 : standing.won,
    drawn: isDraw ? standing.drawn + 1 : standing.drawn,
    lost: !isWin && !isDraw ? standing.lost + 1 : standing.lost,
    goalsFor: standing.goalsFor + goalsFor,
    goalsAgainst: standing.goalsAgainst + goalsAgainst,
    points: standing.points + (isWin ? 3 : isDraw ? 1 : 0),
  };
}

/** 按积分/净胜球排序 */
export function getStandings(standings: LeagueStanding[]): LeagueStanding[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}
```

更新 `packages/simulation/src/index.ts`，添加导出：

```typescript
export { createLeagueStandings, updateStandings, getStandings } from './world/league-season';
```

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/simulation; pnpm test tests/world/league-season.test.ts --reporter=verbose
```
预期：PASS — 5 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/simulation/src/world/league-season.ts packages/simulation/tests/world/league-season.test.ts packages/simulation/src/index.ts
git commit -m "feat(simulation): 实现联赛赛季积分榜系统"
```

---

### Task 4: 存档端口接口

**文件：**
- Create: `packages/application/src/ports/save-port.ts`
- Create: `packages/application/tests/ports/save-port.test.ts`
- Modify: `packages/application/src/index.ts`

- [ ] **Step 1: 编写测试**

创建 `packages/application/tests/ports/save-port.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { type SavePort, type InMemorySaveStore } from '../../src/ports/save-port';
import { createInMemorySaveStore } from '../../src/ports/save-port';
import { CareerSaveSchema, type CareerSave } from '@football/contracts';

function createMockSave(): CareerSave {
  return {
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
      age: 16, careerStage: 'YOUTH', reputation: 20,
    },
    world: { currentDate: '2024-09-01', season: 2024 },
    randomState: { seed: 12345, sequencePosition: 0 },
  };
}

describe('SavePort', () => {
  it('保存并读取存档', async () => {
    const store = createInMemorySaveStore();
    const save = createMockSave();

    await store.save('career-1', save);
    const loaded = await store.load('career-1');

    expect(loaded).toBeDefined();
    expect(loaded!.player.identity.name).toBe('张伟');
  });

  it('返回未找到的存档为 undefined', async () => {
    const store = createInMemorySaveStore();
    const loaded = await store.load('nonexistent');
    expect(loaded).toBeUndefined();
  });

  it '列出所有存档', async () => {
    const store = createInMemorySaveStore();
    await store.save('career-1', createMockSave());
    await store.save('career-2', createMockSave());

    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(list).toContain('career-1');
    expect(list).toContain('career-2');
  });

  it('删除存档', async () => {
    const store = createInMemorySaveStore();
    await store.save('career-1', createMockSave());
    await store.delete('career-1');

    const loaded = await store.load('career-1');
    expect(loaded).toBeUndefined();
  });

  it('保存的存档通过 Zod 校验', async () => {
    const store = createInMemorySaveStore();
    const save = createMockSave();

    await store.save('career-1', save);
    const loaded = await store.load('career-1');

    const result = CareerSaveSchema.safeParse(loaded);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/application; pnpm test tests/ports/save-port.test.ts --reporter=verbose
```
预期：FAIL

- [ ] **Step 3: 实现存档端口接口**

创建 `packages/application/src/ports/save-port.ts`：

```typescript
import { type CareerSave } from '@football/contracts';

/** 存档端口：抽象存储层，可替换为 IndexedDB 实现 */
export interface SavePort {
  save(slotId: string, data: CareerSave): Promise<void>;
  load(slotId: string): Promise<CareerSave | undefined>;
  list(): Promise<string[]>;
  delete(slotId: string): Promise<void>;
}

/** 内存存储实现（用于测试和离线回退） */
export interface InMemorySaveStore extends SavePort {}

export function createInMemorySaveStore(): InMemorySaveStore {
  const store = new Map<string, CareerSave>();

  return {
    async save(slotId: string, data: CareerSave): Promise<void> {
      store.set(slotId, { ...data });
    },
    async load(slotId: string): Promise<CareerSave | undefined> {
      const data = store.get(slotId);
      return data ? { ...data } : undefined;
    },
    async list(): Promise<string[]> {
      return Array.from(store.keys());
    },
    async delete(slotId: string): Promise<void> {
      store.delete(slotId);
    },
  };
}
```

更新 `packages/application/src/index.ts`：

```typescript
export { createCareerSave } from './use-cases/start-career';
export type { StartCareerParams } from './use-cases/start-career';
export { createInMemorySaveStore } from './ports/save-port';
export type { SavePort, InMemorySaveStore } from './ports/save-port';
```

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/application; pnpm test tests/ports/save-port.test.ts --reporter=verbose
```
预期：PASS — 5 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/application/src/ports/save-port.ts packages/application/tests/ports packages/application/src/index.ts
git commit -m "feat(application): 定义存档端口接口和内存存储实现"
```

---

### Task 5: 全部测试与类型检查

- [ ] **Step 1: 运行所有包测试**

```powershell
pnpm --filter @football/contracts test --reporter=verbose
pnpm --filter @football/content test --reporter=verbose
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
git commit -m "feat: 完成普通比赛、赛季循环和本地存档接口"
```

---

## 计划边界

完成此计划后，仓库将具备：
1. 比赛结果和球队实力契约（MatchResult, TeamStrength, LeagueStanding）
2. 普通比赛模拟引擎（基于球队实力、主场优势的自动结算）
3. 联赛赛季系统（积分榜创建、更新、排序）
4. 存档端口接口（SavePort 抽象 + 内存存储实现）
5. 所有测试通过，总计 80+ 测试

后续计划应该基于此基础构建：
- 事件系统和模板叙事
- 球员成长和训练系统
- 俱乐部角色和转会市场