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