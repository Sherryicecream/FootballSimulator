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
    expect(save.relationships.persons).toHaveLength(0);
    expect(save.story.resolvedOpportunityIds).toHaveLength(0);
    expect(save.story.bootstrapOpportunityWeek).toBeGreaterThanOrEqual(2);
    expect(save.story.bootstrapOpportunityWeek).toBeLessThanOrEqual(4);
    expect(save.ledger).toHaveLength(1);
    expect(save.ledger[0]!.type).toBe('career-started');
    expect(save.randomState.seed).toBe(12345);
    expect(save.randomState.sequencePosition).toBe(25);
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
    expect(save1.player.identity.growthBackground).toBe(save2.player.identity.growthBackground);
    expect(save1.player.identity.personalityTendency).toBe(
      save2.player.identity.personalityTendency,
    );
    expect(save1.player.identity.weakFootLevel).toBe(save2.player.identity.weakFootLevel);
    expect(save1.careerId).toBe(save2.careerId);
    expect(save1.story.bootstrapOpportunityWeek).toBe(save2.story.bootstrapOpportunityWeek);
  });

  it('不同种子生成不同属性', () => {
    const save1 = createCareerSave({ ...defaultParams, seed: 42 });
    const save2 = createCareerSave({ ...defaultParams, seed: 99 });

    expect({
      attributes: save1.player.attributes,
      background: save1.player.identity.growthBackground,
      personality: save1.player.identity.personalityTendency,
      weakFoot: save1.player.identity.weakFootLevel,
    }).not.toEqual({
      attributes: save2.player.attributes,
      background: save2.player.identity.growthBackground,
      personality: save2.player.identity.personalityTendency,
      weakFoot: save2.player.identity.weakFootLevel,
    });
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
