# 球员创建、地域档案与时间推进 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 实现完整的球员创建流程、中国地域档案系统，以及基于周/月的日历时间推进，形成可端到端运行的纵向切片。

**架构：** `packages/contracts` 定义地域档案和时间类型；`packages/content` 提供中国地域数据；`packages/simulation` 实现球员工厂、初始属性生成和日历推进；`packages/application` 编排开始生涯的用例。所有用户可见字符串和注释使用中文。

**技术栈：** TypeScript, Zod, Vitest

---

### Task 1: 地域档案契约 (RegionProfile Contract)

**文件：**
- Create: `packages/contracts/src/region.ts`
- Create: `packages/contracts/tests/region.test.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: 编写地域档案测试**

创建 `packages/contracts/tests/region.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { RegionProfileSchema, RegionGroupSchema } from '../src/region';

describe('RegionGroup', () => {
  it('验证有效的大区', () => {
    expect(RegionGroupSchema.parse('华东')).toBe('华东');
    expect(RegionGroupSchema.parse('华南')).toBe('华南');
    expect(RegionGroupSchema.parse('华北')).toBe('华北');
    expect(RegionGroupSchema.parse('华中')).toBe('华中');
    expect(RegionGroupSchema.parse('西南')).toBe('西南');
    expect(RegionGroupSchema.parse('西北')).toBe('西北');
    expect(RegionGroupSchema.parse('东北')).toBe('东北');
  });

  it('拒绝无效的大区', () => {
    expect(() => RegionGroupSchema.parse('海外')).toThrow();
  });
});

describe('RegionProfile', () => {
  it('验证完整的重点地区档案', () => {
    const valid = RegionProfileSchema.parse({
      id: 'shanghai',
      name: '上海',
      group: '华东',
      isKeyRegion: true,
      description: '中国足球青训重镇，拥有完善的青训体系和国际视野。',
      youthFacilityLevel: 85,
      scoutingCoverage: 80,
      competitionIntensity: 75,
      trainingStyle: '技术型',
      costOfLiving: '高',
      climate: '亚热带季风气候',
      footballCulture: '职业化程度高，青训体系完善',
    });
    expect(valid.id).toBe('shanghai');
    expect(valid.youthFacilityLevel).toBe(85);
  });

  it('验证非重点地区档案（大区共享）', () => {
    const valid = RegionProfileSchema.parse({
      id: 'hunan',
      name: '湖南',
      group: '华中',
      isKeyRegion: false,
      description: '华中地区足球氛围一般，青训设施有待提高。',
      youthFacilityLevel: 45,
      scoutingCoverage: 40,
      competitionIntensity: 50,
      trainingStyle: '体能型',
      costOfLiving: '中',
      climate: '亚热带季风气候',
      footballCulture: '足球氛围一般',
    });
    expect(valid.isKeyRegion).toBe(false);
  });

  it('拒绝无效的青训设施等级', () => {
    expect(() => RegionProfileSchema.parse({
      id: 'test', name: '测试', group: '华东', isKeyRegion: false,
      description: '测试',
      youthFacilityLevel: 150, scoutingCoverage: 50, competitionIntensity: 50,
      trainingStyle: '技术型', costOfLiving: '中', climate: '温和',
      footballCulture: '一般',
    })).toThrow();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/contracts; pnpm test tests/region.test.ts --reporter=verbose
```
预期：FAIL — 模块未找到

- [ ] **Step 3: 实现地域档案类型**

创建 `packages/contracts/src/region.ts`：

```typescript
import { z } from 'zod';

/** 中国大区分类 */
export const RegionGroupSchema = z.enum([
  '华东', '华南', '华北', '华中', '西南', '西北', '东北',
]);

export type RegionGroup = z.infer<typeof RegionGroupSchema>;

/** 地域档案：描述一个地区的足球青训生态 */
export const RegionProfileSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(30),
  group: RegionGroupSchema,
  isKeyRegion: z.boolean(),
  description: z.string().min(1).max(200),
  youthFacilityLevel: z.number().int().min(0).max(100),
  scoutingCoverage: z.number().int().min(0).max(100),
  competitionIntensity: z.number().int().min(0).max(100),
  trainingStyle: z.string().min(1).max(20),
  costOfLiving: z.string().min(1).max(10),
  climate: z.string().min(1).max(30),
  footballCulture: z.string().min(1).max(100),
});

export type RegionProfile = z.infer<typeof RegionProfileSchema>;
```

更新 `packages/contracts/src/index.ts`：

```typescript
export * from './primitives';
export * from './player';
export * from './world';
export * from './random';
export * from './career';
export * from './competition';
export * from './club';
export * from './region';
```

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/contracts; pnpm test tests/region.test.ts --reporter=verbose
```
预期：PASS — 3 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/contracts/src/region.ts packages/contracts/tests/region.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): 定义地域档案契约"
```

---

### Task 2: 中国地域数据 (China Region Data)

**文件：**
- Create: `packages/content/src/index.ts`
- Create: `packages/content/src/regions.ts`
- Create: `packages/content/tests/regions.test.ts`
- Modify: `packages/content/package.json`

- [ ] **Step 1: 编写地域数据测试**

创建 `packages/content/tests/regions.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { getRegionProfile, getAllRegions, getKeyRegions } from '../src/regions';
import { RegionProfileSchema } from '@football/contracts';

describe('中国地域数据', () => {
  it('返回所有重点地区', () => {
    const keyRegions = getKeyRegions();
    expect(keyRegions.length).toBeGreaterThanOrEqual(6);
    const ids = keyRegions.map(r => r.id);
    expect(ids).toContain('shanghai');
    expect(ids).toContain('shandong');
    expect(ids).toContain('xinjiang');
    expect(ids).toContain('guangdong');
    expect(ids).toContain('sichuan-chongqing');
    expect(ids).toContain('dongbei');
  });

  it('通过 ID 获取地域档案', () => {
    const region = getRegionProfile('shanghai');
    expect(region).toBeDefined();
    expect(region!.name).toBe('上海');
    expect(region!.isKeyRegion).toBe(true);
  });

  it('所有地域档案通过 Zod 校验', () => {
    const allRegions = getAllRegions();
    for (const region of allRegions) {
      const result = RegionProfileSchema.safeParse(region);
      expect(result.success).toBe(true);
    }
  });

  it('返回所有地区（重点 + 非重点）', () => {
    const allRegions = getAllRegions();
    expect(allRegions.length).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/content; pnpm test tests/regions.test.ts --reporter=verbose
```
预期：FAIL — 模块未找到

- [ ] **Step 3: 安装依赖并配置测试**

```powershell
cd packages/content; pnpm add -D vitest
```

更新 `packages/content/package.json`，添加测试脚本：

```json
"scripts": {
  "typecheck": "tsc -p tsconfig.json",
  "test": "vitest run"
}
```

- [ ] **Step 4: 实现中国地域数据**

创建 `packages/content/src/regions.ts`：

```typescript
import { type RegionProfile } from '@football/contracts';

// 重点地区独立档案（上海、山东、新疆、广东、四川/重庆、东北）
const keyRegions: RegionProfile[] = [
  {
    id: 'shanghai',
    name: '上海',
    group: '华东',
    isKeyRegion: true,
    description: '中国足球青训重镇，拥有完善的青训体系和国际视野。',
    youthFacilityLevel: 85,
    scoutingCoverage: 80,
    competitionIntensity: 75,
    trainingStyle: '技术型',
    costOfLiving: '高',
    climate: '亚热带季风气候',
    footballCulture: '职业化程度高，青训体系完善，崇明根宝基地等知名青训品牌。',
  },
  {
    id: 'shandong',
    name: '山东',
    group: '华东',
    isKeyRegion: true,
    description: '传统足球大省，以身体对抗和纪律性著称的青训体系。',
    youthFacilityLevel: 80,
    scoutingCoverage: 75,
    competitionIntensity: 78,
    trainingStyle: '纪律型',
    costOfLiving: '中',
    climate: '温带季风气候',
    footballCulture: '足球传统深厚，鲁能足校全国闻名，注重身体素质和团队纪律。',
  },
  {
    id: 'xinjiang',
    name: '新疆',
    group: '西北',
    isKeyRegion: true,
    description: '足球人才宝库，以出色的身体素质和足球天赋闻名。',
    youthFacilityLevel: 55,
    scoutingCoverage: 40,
    competitionIntensity: 60,
    trainingStyle: '天赋型',
    costOfLiving: '低',
    climate: '大陆性气候',
    footballCulture: '街头足球文化浓厚，球员天赋出众但青训设施和教练资源相对不足。',
  },
  {
    id: 'guangdong',
    name: '广东',
    group: '华南',
    isKeyRegion: true,
    description: '南方足球重镇，技术流足球的代表地区。',
    youthFacilityLevel: 78,
    scoutingCoverage: 76,
    competitionIntensity: 72,
    trainingStyle: '技术型',
    costOfLiving: '高',
    climate: '亚热带季风气候',
    footballCulture: '南派技术流风格，恒大足校等大型青训项目，民间足球活跃。',
  },
  {
    id: 'sichuan-chongqing',
    name: '四川/重庆',
    group: '西南',
    isKeyRegion: true,
    description: '西南足球中心，拥有热情的球迷基础和独特的足球文化。',
    youthFacilityLevel: 65,
    scoutingCoverage: 58,
    competitionIntensity: 65,
    trainingStyle: '灵活型',
    costOfLiving: '中',
    climate: '亚热带湿润气候',
    footballCulture: '球迷文化浓厚，球市火爆，青训体系正在快速发展中。',
  },
  {
    id: 'dongbei',
    name: '东北',
    group: '东北',
    isKeyRegion: true,
    description: '中国足球传统人才输出地，以硬朗球风和坚韧意志著称。',
    youthFacilityLevel: 72,
    scoutingCoverage: 65,
    competitionIntensity: 70,
    trainingStyle: '硬朗型',
    costOfLiving: '低',
    climate: '温带大陆性气候',
    footballCulture: '足球人才辈出，大连、沈阳等足球城底蕴深厚，注重身体对抗。',
  },
];

// 非重点地区按大区归类
const groupRegions: RegionProfile[] = [
  {
    id: 'jiangsu-zhejiang',
    name: '江浙地区',
    group: '华东',
    isKeyRegion: false,
    description: '经济发达地区，校园足球和青训设施正在快速发展。',
    youthFacilityLevel: 60,
    scoutingCoverage: 55,
    competitionIntensity: 55,
    trainingStyle: '技术型',
    costOfLiving: '高',
    climate: '亚热带季风气候',
    footballCulture: '经济基础好，校园足球普及度高，职业俱乐部青训逐步完善。',
  },
  {
    id: 'fujian',
    name: '福建',
    group: '华南',
    isKeyRegion: false,
    description: '东南沿海地区，足球氛围一般但体育基础设施较好。',
    youthFacilityLevel: 50,
    scoutingCoverage: 45,
    competitionIntensity: 45,
    trainingStyle: '灵活型',
    costOfLiving: '中',
    climate: '亚热带季风气候',
    footballCulture: '足球氛围一般，羽毛球等运动更受欢迎。',
  },
  {
    id: 'hubei-hunan',
    name: '两湖地区',
    group: '华中',
    isKeyRegion: false,
    description: '中部地区，足球发展处于上升期。',
    youthFacilityLevel: 50,
    scoutingCoverage: 48,
    competitionIntensity: 50,
    trainingStyle: '均衡型',
    costOfLiving: '中',
    climate: '亚热带季风气候',
    footballCulture: '武汉等城市有较好的职业足球传统，青训体系正在建设中。',
  },
  {
    id: 'henan',
    name: '河南',
    group: '华中',
    isKeyRegion: false,
    description: '人口大省，足球基础扎实但高水平青训资源有限。',
    youthFacilityLevel: 52,
    scoutingCoverage: 45,
    competitionIntensity: 55,
    trainingStyle: '硬朗型',
    costOfLiving: '低',
    climate: '温带季风气候',
    footballCulture: '人口基数大，球迷热情，建业等俱乐部有长期青训投入。',
  },
  {
    id: 'beijing-tianjin',
    name: '京津地区',
    group: '华北',
    isKeyRegion: false,
    description: '北方政治文化中心，足球资源丰富。',
    youthFacilityLevel: 70,
    scoutingCoverage: 68,
    competitionIntensity: 68,
    trainingStyle: '均衡型',
    costOfLiving: '高',
    climate: '温带季风气候',
    footballCulture: '北京国安等老牌俱乐部，校园足球和青训资源丰富。',
  },
  {
    id: 'shaanxi-gansu',
    name: '陕甘地区',
    group: '西北',
    isKeyRegion: false,
    description: '西北地区，足球发展受限于经济和地理条件。',
    youthFacilityLevel: 40,
    scoutingCoverage: 35,
    competitionIntensity: 42,
    trainingStyle: '硬朗型',
    costOfLiving: '低',
    climate: '大陆性气候',
    footballCulture: '陕西球迷热情闻名全国，但青训基础设施相对薄弱。',
  },
  {
    id: 'yunnan-guizhou',
    name: '云贵地区',
    group: '西南',
    isKeyRegion: false,
    description: '西南少数民族地区，足球发展处于起步阶段。',
    youthFacilityLevel: 38,
    scoutingCoverage: 32,
    competitionIntensity: 40,
    trainingStyle: '灵活型',
    costOfLiving: '低',
    climate: '亚热带高原气候',
    footballCulture: '足球氛围正在培养中，高原训练条件独特。',
  },
  {
    id: 'guangxi',
    name: '广西',
    group: '华南',
    isKeyRegion: false,
    description: '华南地区，足球普及度有待提高。',
    youthFacilityLevel: 42,
    scoutingCoverage: 38,
    competitionIntensity: 43,
    trainingStyle: '技术型',
    costOfLiving: '中',
    climate: '亚热带季风气候',
    footballCulture: '民间足球有一定基础，职业足球发展较慢。',
  },
];

const allRegions: RegionProfile[] = [...keyRegions, ...groupRegions];

export function getRegionProfile(id: string): RegionProfile | undefined {
  return allRegions.find(r => r.id === id);
}

export function getKeyRegions(): RegionProfile[] {
  return [...keyRegions];
}

export function getAllRegions(): RegionProfile[] {
  return [...allRegions];
}
```

更新 `packages/content/src/index.ts`：

```typescript
export { getRegionProfile, getKeyRegions, getAllRegions } from './regions';
```

- [ ] **Step 5: 运行测试验证通过**

```powershell
cd packages/content; pnpm test tests/regions.test.ts --reporter=verbose
```
预期：PASS — 4 个测试

- [ ] **Step 6: 提交**

```powershell
git add packages/content/src/regions.ts packages/content/src/index.ts packages/content/tests/regions.test.ts packages/content/package.json
git commit -m "feat(content): 添加中国地域档案数据"
```

---

### Task 3: 球员工厂 (Player Factory)

**文件：**
- Create: `packages/simulation/src/player-development/player-factory.ts`
- Create: `packages/simulation/tests/player-development/player-factory.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: 编写球员工厂测试**

创建 `packages/simulation/tests/player-development/player-factory.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { createPlayer } from '../../src/player-development/player-factory';
import { createSeededRandomSource } from '../../src/randomness/seeded-random-source';
import { PlayerCareerSchema } from '@football/contracts';

describe('createPlayer', () => {
  const defaultParams = {
    name: '张伟',
    hometown: '上海',
    primaryPosition: 'CENTER_BACK' as const,
    secondaryPosition: 'FULL_BACK' as const,
    preferredFoot: 'RIGHT' as const,
    weakFootLevel: 30,
    growthBackground: '城市青训',
    personalityTendency: 'balanced',
    regionId: 'shanghai',
  };

  it('创建 16 岁青训球员', () => {
    const rng = createSeededRandomSource(12345);
    const player = createPlayer(defaultParams, rng);

    expect(player.age).toBe(16);
    expect(player.careerStage).toBe('YOUTH');
    expect(player.identity.name).toBe('张伟');
    expect(player.identity.primaryPosition).toBe('CENTER_BACK');
  });

  it('生成的球员通过 Zod 校验', () => {
    const rng = createSeededRandomSource(12345);
    const player = createPlayer(defaultParams, rng);

    const result = PlayerCareerSchema.safeParse(player);
    expect(result.success).toBe(true);
  });

  it('同一种子生成相同球员', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);

    const player1 = createPlayer(defaultParams, rng1);
    const player2 = createPlayer(defaultParams, rng2);

    expect(player1.attributes).toEqual(player2.attributes);
    expect(player1.hiddenTraits).toEqual(player2.hiddenTraits);
  });

  it('不同种子生成不同属性', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(99);

    const player1 = createPlayer(defaultParams, rng1);
    const player2 = createPlayer(defaultParams, rng2);

    // 至少有一个属性不同
    expect(player1.attributes).not.toEqual(player2.attributes);
  });

  it('中后卫有较高的防守属性', () => {
    const rng = createSeededRandomSource(12345);
    const player = createPlayer({ ...defaultParams, primaryPosition: 'CENTER_BACK' }, rng);

    expect(player.attributes.technical.defending).toBeGreaterThanOrEqual(40);
    expect(player.attributes.technical.aerialAbility).toBeGreaterThanOrEqual(40);
  });

  it('前锋有较高的射门属性', () => {
    const rng = createSeededRandomSource(12345);
    const player = createPlayer({ ...defaultParams, primaryPosition: 'FORWARD' }, rng);

    expect(player.attributes.technical.shooting).toBeGreaterThanOrEqual(40);
    expect(player.attributes.technical.firstTouch).toBeGreaterThanOrEqual(40);
  });

  it('上海球员有较高的初始属性（青训设施好）', () => {
    const rng = createSeededRandomSource(42);
    const player = createPlayer({ ...defaultParams, regionId: 'shanghai' }, rng);

    // 上海青训设施 85，应有不错的初始属性
    const avgAttribute = (
      player.attributes.technical.firstTouch +
      player.attributes.technical.dribbling +
      player.attributes.technical.passing +
      player.attributes.technical.shooting +
      player.attributes.technical.defending +
      player.attributes.technical.aerialAbility +
      player.attributes.physical.pace +
      player.attributes.physical.strength +
      player.attributes.physical.stamina +
      player.attributes.physical.agility +
      player.attributes.mental.offTheBall +
      player.attributes.mental.vision +
      player.attributes.mental.decision +
      player.attributes.mental.composure +
      player.attributes.mental.determination +
      player.attributes.mental.discipline
    ) / 16;

    expect(avgAttribute).toBeGreaterThanOrEqual(30);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/simulation; pnpm test tests/player-development/player-factory.test.ts --reporter=verbose
```
预期：FAIL — 模块未找到

- [ ] **Step 3: 实现球员工厂**

创建 `packages/simulation/src/player-development/player-factory.ts`：

```typescript
import {
  type PlayerCareer,
  type PlayerIdentity,
  type PlayerAttributes,
  type TechnicalAttributes,
  type PhysicalAttributes,
  type MentalAttributes,
  type HiddenTraits,
  type Position,
} from '@football/contracts';
import { type SeededRandomSource } from '../randomness/seeded-random-source';

export interface CreatePlayerParams {
  name: string;
  hometown: string;
  primaryPosition: Position;
  secondaryPosition?: Position;
  preferredFoot: 'LEFT' | 'RIGHT' | 'BOTH';
  weakFootLevel: number;
  growthBackground: string;
  personalityTendency: string;
  regionId: string;
}

/** 位置属性权重：每种位置对 16 项属性的侧重 */
const positionWeights: Record<Position, { technical: Partial<Record<keyof TechnicalAttributes, number>>; physical: Partial<Record<keyof PhysicalAttributes, number>>; mental: Partial<Record<keyof MentalAttributes, number>> }> = {
  CENTER_BACK: {
    technical: { defending: 1.5, aerialAbility: 1.4, passing: 0.8, firstTouch: 0.7, dribbling: 0.5, shooting: 0.3 },
    physical: { strength: 1.4, stamina: 1.0, pace: 0.9, agility: 0.7 },
    mental: { decision: 1.3, composure: 1.3, discipline: 1.2, determination: 1.1, offTheBall: 0.7, vision: 0.7 },
  },
  FULL_BACK: {
    technical: { defending: 1.3, passing: 1.1, firstTouch: 1.0, dribbling: 1.0, aerialAbility: 0.7, shooting: 0.5 },
    physical: { pace: 1.4, stamina: 1.4, agility: 1.2, strength: 0.8 },
    mental: { decision: 1.1, discipline: 1.1, determination: 1.0, composure: 1.0, offTheBall: 0.9, vision: 0.8 },
  },
  DEFENSIVE_MIDFIELDER: {
    technical: { defending: 1.3, passing: 1.2, firstTouch: 1.0, aerialAbility: 1.0, dribbling: 0.7, shooting: 0.5 },
    physical: { stamina: 1.4, strength: 1.2, pace: 0.8, agility: 0.8 },
    mental: { decision: 1.4, discipline: 1.3, determination: 1.2, vision: 1.1, composure: 1.1, offTheBall: 0.8 },
  },
  MIDFIELDER: {
    technical: { passing: 1.4, firstTouch: 1.3, dribbling: 1.2, shooting: 0.9, defending: 0.6, aerialAbility: 0.6 },
    physical: { stamina: 1.3, agility: 1.1, pace: 0.9, strength: 0.7 },
    mental: { vision: 1.4, decision: 1.2, composure: 1.2, offTheBall: 1.1, determination: 1.0, discipline: 0.9 },
  },
  WINGER: {
    technical: { dribbling: 1.4, firstTouch: 1.3, passing: 1.1, shooting: 1.0, defending: 0.4, aerialAbility: 0.5 },
    physical: { pace: 1.5, agility: 1.4, stamina: 1.1, strength: 0.6 },
    mental: { offTheBall: 1.3, composure: 1.1, vision: 1.1, decision: 1.0, determination: 0.9, discipline: 0.7 },
  },
  FORWARD: {
    technical: { shooting: 1.5, firstTouch: 1.3, dribbling: 1.2, aerialAbility: 1.1, passing: 0.8, defending: 0.3 },
    physical: { pace: 1.3, strength: 1.1, agility: 1.2, stamina: 0.9 },
    mental: { offTheBall: 1.4, composure: 1.3, decision: 1.2, determination: 1.1, vision: 0.9, discipline: 0.6 },
  },
};

/** 区域青训系数：根据 youthFacilityLevel 影响初始属性范围 */
function getRegionFacilityBonus(regionId: string): number {
  // 简易实现：根据地区 ID 返回加成
  const bonuses: Record<string, number> = {
    shanghai: 0.15,
    shandong: 0.12,
    xinjiang: 0.0,
    guangdong: 0.10,
    'sichuan-chongqing': 0.05,
    dongbei: 0.08,
  };
  return bonuses[regionId] ?? 0.0;
}

/** 根据位置和区域生成 16 岁青年球员 */
export function createPlayer(params: CreatePlayerParams, rng: SeededRandomSource): PlayerCareer {
  const weights = positionWeights[params.primaryPosition];
  const facilityBonus = getRegionFacilityBonus(params.regionId);

  // 基础属性范围：30-60，受位置权重和区域加成影响
  const baseMin = 30;
  const baseMax = 60;

  const generateAttribute = (weight: number): number => {
    const base = rng.nextInt(baseMin, baseMax);
    const weighted = Math.round(base * weight * (1 + facilityBonus));
    return Math.min(100, Math.max(1, weighted));
  };

  const identity: PlayerIdentity = {
    name: params.name,
    hometown: params.hometown,
    dateOfBirth: '2008-06-15', // 简化：16 岁约等于 2008 年出生
    primaryPosition: params.primaryPosition,
    secondaryPosition: params.secondaryPosition,
    preferredFoot: params.preferredFoot,
    weakFootLevel: params.weakFootLevel,
    growthBackground: params.growthBackground,
    personalityTendency: params.personalityTendency,
  };

  const technical: TechnicalAttributes = {
    firstTouch: generateAttribute(weights.technical.firstTouch ?? 1.0),
    dribbling: generateAttribute(weights.technical.dribbling ?? 1.0),
    passing: generateAttribute(weights.technical.passing ?? 1.0),
    shooting: generateAttribute(weights.technical.shooting ?? 1.0),
    defending: generateAttribute(weights.technical.defending ?? 1.0),
    aerialAbility: generateAttribute(weights.technical.aerialAbility ?? 1.0),
  };

  const physical: PhysicalAttributes = {
    pace: generateAttribute(weights.physical.pace ?? 1.0),
    strength: generateAttribute(weights.physical.strength ?? 1.0),
    stamina: generateAttribute(weights.physical.stamina ?? 1.0),
    agility: generateAttribute(weights.physical.agility ?? 1.0),
  };

  const mental: MentalAttributes = {
    offTheBall: generateAttribute(weights.mental.offTheBall ?? 1.0),
    vision: generateAttribute(weights.mental.vision ?? 1.0),
    decision: generateAttribute(weights.mental.decision ?? 1.0),
    composure: generateAttribute(weights.mental.composure ?? 1.0),
    determination: generateAttribute(weights.mental.determination ?? 1.0),
    discipline: generateAttribute(weights.mental.discipline ?? 1.0),
  };

  const attributes: PlayerAttributes = { technical, physical, mental };

  // 生成隐藏特质
  const hiddenTraits: HiddenTraits = {
    potential: rng.nextInt(60, 95),
    stability: rng.nextInt(40, 85),
    professionalism: rng.nextInt(40, 90),
    pressureResistance: rng.nextInt(35, 85),
    adaptability: rng.nextInt(40, 80),
    injuryProneness: rng.nextInt(15, 60),
  };

  return {
    identity,
    attributes,
    hiddenTraits,
    age: 16,
    careerStage: 'YOUTH',
    reputation: rng.nextInt(10, 30),
  };
}
```

更新 `packages/simulation/src/index.ts`：

```typescript
export { createSeededRandomSource } from './randomness';
export type { SeededRandomSource } from './randomness';
export { createPlayer } from './player-development/player-factory';
export type { CreatePlayerParams } from './player-development/player-factory';
```

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/simulation; pnpm test tests/player-development/player-factory.test.ts --reporter=verbose
```
预期：PASS — 7 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/simulation/src/player-development/player-factory.ts packages/simulation/tests/player-development packages/simulation/src/index.ts
git commit -m "feat(simulation): 实现球员工厂，支持位置权重和区域加成"
```

---

### Task 4: 日历时间推进 (Calendar Time Progression)

**文件：**
- Create: `packages/simulation/src/career/calendar.ts`
- Create: `packages/simulation/tests/career/calendar.test.ts`
- Modify: `packages/simulation/src/index.ts`

- [ ] **Step 1: 编写日历测试**

创建 `packages/simulation/tests/career/calendar.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { createCalendar, advanceOneWeek, advanceToNextMonth, getSeasonWeekRange } from '../../src/career/calendar';

describe('Calendar', () => {
  it('从指定日期创建日历', () => {
    const cal = createCalendar('2024-09-01', 2024);
    expect(cal.currentDate).toBe('2024-09-01');
    expect(cal.season).toBe(2024);
    expect(cal.weekNumber).toBe(1);
    expect(cal.month).toBe(9);
  });

  it('推进一周', () => {
    const cal = createCalendar('2024-09-01', 2024);
    const next = advanceOneWeek(cal);

    expect(next.currentDate).toBe('2024-09-08');
    expect(next.weekNumber).toBe(2);
    expect(next.season).toBe(2024);
  });

  it('推进到下一月', () => {
    const cal = createCalendar('2024-09-01', 2024);
    const nextMonth = advanceToNextMonth(cal);

    expect(nextMonth.currentDate).toBe('2024-10-01');
    expect(nextMonth.month).toBe(10);
  });

  it('跨年推进到新赛季', () => {
    const cal = createCalendar('2024-12-25', 2024);
    let current = cal;

    // 推进 2 周，进入 2025 年
    current = advanceOneWeek(current); // 2025-01-01
    expect(current.season).toBe(2025);
    expect(current.month).toBe(1);
  });

  it('获取赛季周范围', () => {
    const range = getSeasonWeekRange(2024);
    expect(range.startWeek).toBe(1);
    expect(range.endWeek).toBe(52);
  });

  it('推进 4 周后日期正确', () => {
    const cal = createCalendar('2024-09-01', 2024);
    let current = cal;

    for (let i = 0; i < 4; i++) {
      current = advanceOneWeek(current);
    }

    expect(current.currentDate).toBe('2024-09-29');
    expect(current.weekNumber).toBe(5);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/simulation; pnpm test tests/career/calendar.test.ts --reporter=verbose
```
预期：FAIL — 模块未找到

- [ ] **Step 3: 实现日历系统**

创建 `packages/simulation/src/career/calendar.ts`：

```typescript
/** 日历状态：跟踪游戏内时间 */
export interface CalendarState {
  currentDate: string;  // ISO 格式 YYYY-MM-DD
  season: number;       // 赛季年份
  weekNumber: number;   // 当前年第几周 (1-52)
  month: number;        // 当前月份 (1-12)
}

/** 解析日期字符串，返回 Date 对象 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

/** 格式化 Date 为 YYYY-MM-DD */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 从日期字符串创建日历 */
export function createCalendar(dateStr: string, season: number): CalendarState {
  const date = parseDate(dateStr);
  // 计算周数（简单近似）
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const weekNumber = Math.ceil((diff / (7 * 24 * 60 * 60 * 1000)) + 1);

  return {
    currentDate: dateStr,
    season,
    weekNumber: Math.max(1, Math.min(52, weekNumber)),
    month: date.getMonth() + 1,
  };
}

/** 推进一周 */
export function advanceOneWeek(cal: CalendarState): CalendarState {
  const date = parseDate(cal.currentDate);
  date.setDate(date.getDate() + 7);

  const newDate = formatDate(date);
  const newSeason = date.getFullYear();

  // 如果跨年，更新赛季
  const season = newSeason !== cal.season ? newSeason : cal.season;

  return createCalendar(newDate, season);
}

/** 推进到下一月的第一天 */
export function advanceToNextMonth(cal: CalendarState): CalendarState {
  const date = parseDate(cal.currentDate);
  date.setMonth(date.getMonth() + 1, 1);

  const newDate = formatDate(date);
  const newSeason = date.getFullYear();

  return createCalendar(newDate, newSeason);
}

/** 获取赛季的周范围 */
export function getSeasonWeekRange(season: number): { startWeek: number; endWeek: number } {
  return { startWeek: 1, endWeek: 52 };
}
```

更新 `packages/simulation/src/index.ts`：

```typescript
export { createSeededRandomSource } from './randomness';
export type { SeededRandomSource } from './randomness';
export { createPlayer } from './player-development/player-factory';
export type { CreatePlayerParams } from './player-development/player-factory';
export { createCalendar, advanceOneWeek, advanceToNextMonth, getSeasonWeekRange } from './career/calendar';
export type { CalendarState } from './career/calendar';
```

- [ ] **Step 4: 运行测试验证通过**

```powershell
cd packages/simulation; pnpm test tests/career/calendar.test.ts --reporter=verbose
```
预期：PASS — 6 个测试

- [ ] **Step 5: 提交**

```powershell
git add packages/simulation/src/career/calendar.ts packages/simulation/tests/career packages/simulation/src/index.ts
git commit -m "feat(simulation): 实现日历时间推进系统"
```

---

### Task 5: 开始生涯用例 (Start Career Use Case)

**文件：**
- Create: `packages/application/src/use-cases/start-career.ts`
- Create: `packages/application/tests/use-cases/start-career.test.ts`
- Modify: `packages/application/package.json`
- Modify: `packages/application/src/index.ts`

- [ ] **Step 1: 编写开始生涯测试**

创建 `packages/application/tests/use-cases/start-career.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { createCareerSave } from '../../src/use-cases/start-career';
import { CareerSaveSchema } from '@football/contracts';

describe('createCareerSave', () => {
  const defaultParams = {
    playerName: '张伟',
    hometown: '上海',
    primaryPosition: 'CENTER_BACK' as const,
    secondaryPosition: 'FULL_BACK' as const,
    preferredFoot: 'RIGHT' as const,
    weakFootLevel: 30,
    growthBackground: '城市青训',
    personalityTendency: 'balanced',
    regionId: 'shanghai',
    seed: 12345,
  };

  it('创建完整的生涯存档', () => {
    const save = createCareerSave(defaultParams);

    expect(save.schemaVersion).toBe(1);
    expect(save.player.identity.name).toBe('张伟');
    expect(save.player.age).toBe(16);
    expect(save.player.careerStage).toBe('YOUTH');
    expect(save.world.currentDate).toBe('2024-09-01');
    expect(save.world.season).toBe(2024);
    expect(save.randomState.seed).toBe(12345);
  });

  it('创建的存档通过 Zod 校验', () => {
    const save = createCareerSave(defaultParams);
    const result = CareerSaveSchema.safeParse(save);
    expect(result.success).toBe(true);
  });

  it('同一种子生成相同存档', () => {
    const save1 = createCareerSave({ ...defaultParams, seed: 42 });
    const save2 = createCareerSave({ ...defaultParams, seed: 42 });

    expect(save1.player.attributes).toEqual(save2.player.attributes);
    expect(save1.player.hiddenTraits).toEqual(save2.player.hiddenTraits);
  });

  it('不同种子生成不同属性', () => {
    const save1 = createCareerSave({ ...defaultParams, seed: 42 });
    const save2 = createCareerSave({ ...defaultParams, seed: 99 });

    expect(save1.player.attributes).not.toEqual(save2.player.attributes);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```powershell
cd packages/application; pnpm test tests/use-cases/start-career.test.ts --reporter=verbose
```
预期：FAIL — 模块未找到

- [ ] **Step 3: 在 application 包安装测试依赖**

```powershell
cd packages/application; pnpm add -D vitest
```

更新 `packages/application/package.json` 添加测试脚本：

```json
"scripts": {
  "typecheck": "tsc -p tsconfig.json",
  "test": "vitest run"
}
```

- [ ] **Step 4: 实现开始生涯用例**

创建 `packages/application/src/use-cases/start-career.ts`：

```typescript
import { type CareerSave, type Position } from '@football/contracts';
import { createSeededRandomSource } from '@football/simulation';
import { createPlayer } from '@football/simulation';

export interface StartCareerParams {
  playerName: string;
  hometown: string;
  primaryPosition: Position;
  secondaryPosition?: Position;
  preferredFoot: 'LEFT' | 'RIGHT' | 'BOTH';
  weakFootLevel: number;
  growthBackground: string;
  personalityTendency: string;
  regionId: string;
  seed: number;
}

/**
 * 创建新的生涯存档
 * 生成 16 岁球员并初始化世界状态
 */
export function createCareerSave(params: StartCareerParams): CareerSave {
  const rng = createSeededRandomSource(params.seed);

  const player = createPlayer(
    {
      name: params.playerName,
      hometown: params.hometown,
      primaryPosition: params.primaryPosition,
      secondaryPosition: params.secondaryPosition,
      preferredFoot: params.preferredFoot,
      weakFootLevel: params.weakFootLevel,
      growthBackground: params.growthBackground,
      personalityTendency: params.personalityTendency,
      regionId: params.regionId,
    },
    rng,
  );

  const save: CareerSave = {
    schemaVersion: 1,
    player,
    world: {
      currentDate: '2024-09-01',
      season: 2024,
    },
    randomState: {
      seed: params.seed,
      sequencePosition: rng.getPosition(),
    },
  };

  return save;
}
```

更新 `packages/application/src/index.ts`：

```typescript
export { createCareerSave } from './use-cases/start-career';
export type { StartCareerParams } from './use-cases/start-career';
```

- [ ] **Step 5: 运行测试验证通过**

```powershell
cd packages/application; pnpm test tests/use-cases/start-career.test.ts --reporter=verbose
```
预期：PASS — 4 个测试

- [ ] **Step 6: 提交**

```powershell
git add packages/application/src/use-cases/start-career.ts packages/application/tests packages/application/src/index.ts packages/application/package.json
git commit -m "feat(application): 实现开始生涯用例"
```

---

### Task 6: 全部测试与类型检查

- [ ] **Step 1: 运行所有包测试**

```powershell
cd packages/contracts; pnpm test --reporter=verbose
cd packages/content; pnpm test --reporter=verbose
cd packages/simulation; pnpm test --reporter=verbose
cd packages/application; pnpm test --reporter=verbose
```
预期：所有测试通过

- [ ] **Step 2: 运行类型检查**

```powershell
pnpm -r typecheck
```
预期：所有包通过类型检查

- [ ] **Step 3: 运行架构测试**

```powershell
node --test tools/architecture/tests/repository-config.test.mjs tools/architecture/tests/workspace-policy.test.mjs tools/architecture/tests/workspace-structure.test.mjs
```
预期：10 个测试全部通过

- [ ] **Step 4: 提交最终集成状态**

```powershell
git add -A
git commit -m "feat: 完成球员创建、地域档案和时间推进纵向切片"
```

---

## 计划边界

完成此计划后，仓库将具备：
1. 完整的地域档案契约和中国地域数据（6 个重点地区 + 8 个非重点地区）
2. 球员工厂，支持位置权重和区域加成生成 16 岁初始属性
3. 日历时间推进系统（周/月步进、跨年处理）
4. 开始生涯用例，端到端创建完整生涯存档
5. 所有用户可见字符串使用中文

后续计划应该基于此基础构建：
- 普通比赛模拟和赛季循环
- 本地原子存档（IndexedDB）
- 事件系统和模板叙事