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
    expect(save.contentVersion).toBe('bootstrap-1');
    expect(save.careerId).toBe('career-0000a65d2c16');
    expect(save.player.identity.name).toBe('张伟');
    expect(save.player.identity.homelandId).toBe('shanghai');
    expect(save.player.age).toBe(16);
    expect(save.player.careerStage).toBe('YOUTH');
    expect(save.world.currentDate).toBe('2024-09-01');
    expect(save.world.season).toBe(2024);
    expect(save.context.academyId).toBeNull();
    expect(save.context.pendingOpportunity).toBeNull();
    expect(save.relationships.people).toHaveLength(0);
    expect(save.story.resolvedOpportunityIds).toHaveLength(0);
    expect(save.story.bootstrapOpportunityWeek).toBeGreaterThanOrEqual(2);
    expect(save.story.bootstrapOpportunityWeek).toBeLessThanOrEqual(4);
    expect(save.ledger).toHaveLength(1);
    expect(save.ledger[0]!.type).toBe('career-started');
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
    expect(save1.careerId).toBe(save2.careerId);
    expect(save1.story.bootstrapOpportunityWeek).toBe(save2.story.bootstrapOpportunityWeek);
  });

  it('不同种子生成不同属性', () => {
    const save1 = createCareerSave({ ...defaultParams, seed: 42 });
    const save2 = createCareerSave({ ...defaultParams, seed: 99 });

    expect(save1.player.attributes).not.toEqual(save2.player.attributes);
  });

  it('不同种子生成不同 careerId', () => {
    const save1 = createCareerSave({ ...defaultParams, seed: 42 });
    const save2 = createCareerSave({ ...defaultParams, seed: 99 });

    expect(save1.careerId).not.toBe(save2.careerId);
  });

  it('拒绝无效的随机种子', () => {
    expect(() => createCareerSave({ ...defaultParams, seed: Number.NaN })).toThrow(
      '随机种子必须是 0 到 2147483647 之间的整数',
    );
  });
});
