import { describe, it, expect } from 'vitest';
import { createAdvanceToDecision } from '../../src/use-cases/advance-to-decision';
import { createSubmitYouthChoice } from '../../src/use-cases/submit-youth-choice';
import { createCareerSave, type StartCareerParams } from '../../src/use-cases/start-career';
import { type BootstrapContentPort } from '../../src/ports/bootstrap-content';
import { CareerSaveSchema } from '@football/contracts';

const mockRegion: Parameters<BootstrapContentPort['getRegionProfile']>[0] = {
  id: 'shanghai',
  name: '上海',
  group: '华东',
  isKeyRegion: true,
  description: '测试用上海',
  youthFacilityLevel: 85,
  scoutingCoverage: 80,
  competitionIntensity: 75,
  trainingStyle: '技术型',
  costOfLiving: '高',
  climate: '亚热带季风气候',
  footballCulture: '职业化程度高',
};

const content: BootstrapContentPort = {
  getRegionProfile: (id) => (id === 'shanghai' ? mockRegion : undefined),
};

const input: StartCareerParams = {
  playerName: '张伟',
  hometown: '上海',
  primaryPosition: 'CENTER_BACK',
  secondaryPosition: 'FULL_BACK',
  preferredFoot: 'RIGHT',
  weakFootLevel: 30,
  growthBackground: '城市青训',
  personalityTendency: 'balanced',
  regionId: 'shanghai',
  seed: 42,
};

describe('advanceToDecision', () => {
  it('拒绝未知的家乡', () => {
    const advance = createAdvanceToDecision(content);
    expect(() => advance({ ...input, regionId: 'missing' })).toThrow('Unknown homeland');
  });

  it('推进直到出现待处理机会', () => {
    const advance = createAdvanceToDecision(content);
    const pending = advance(input);

    expect(pending.context.pendingOpportunity).not.toBeNull();
    expect(pending.story.bootstrapOpportunityWeek).toBeGreaterThanOrEqual(2);
    expect(pending.story.bootstrapOpportunityWeek).toBeLessThanOrEqual(4);
  });

  it('推进后的存档通过 Zod 校验', () => {
    const advance = createAdvanceToDecision(content);
    const pending = advance(input);

    const result = CareerSaveSchema.safeParse(pending);
    expect(result.success).toBe(true);
  });

  it('同一种子推进到相同机会', () => {
    const advance = createAdvanceToDecision(content);
    const pending1 = advance(input);
    const pending2 = advance(input);

    expect(pending1.context.pendingOpportunity!.offers.map(o => o.academyId))
      .toEqual(pending2.context.pendingOpportunity!.offers.map(o => o.academyId));
  });

  it('可以在推进过程中正常推进，不抛出错误', () => {
    const advance = createAdvanceToDecision(content);
    expect(() => advance(input)).not.toThrow();
  });
});

describe('submitYouthChoice', () => {
  it('提交有效选项后更新存档', () => {
    const advance = createAdvanceToDecision(content);
    const submit = createSubmitYouthChoice(content);
    const pending = advance(input);

    const offerId = pending.context.pendingOpportunity!.offers[0]!.id;
    const result = submit(pending, offerId);

    expect(result.context.academyId).not.toBeNull();
    expect(result.context.pendingOpportunity).toBeNull();
    expect(result.ledger[result.ledger.length - 1]!.type).toBe('youth-opportunity-chosen');
  });

  it('提交后的存档通过 Zod 校验', () => {
    const advance = createAdvanceToDecision(content);
    const submit = createSubmitYouthChoice(content);
    const pending = advance(input);

    const offerId = pending.context.pendingOpportunity!.offers[0]!.id;
    const result = submit(pending, offerId);

    const parsed = CareerSaveSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('提交后再次提交同一存档抛出错误', () => {
    const advance = createAdvanceToDecision(content);
    const submit = createSubmitYouthChoice(content);
    const pending = advance(input);

    const offerId = pending.context.pendingOpportunity!.offers[0]!.id;
    // 第一次提交成功
    const afterSubmit = submit(pending, offerId);
    expect(afterSubmit.context.pendingOpportunity).toBeNull();

    // 再次提交同一个存档（已经被消费掉了）应该失败
    expect(() => submit(afterSubmit, offerId)).toThrow('当前没有待处理的青年机会');
  });

  it('使用无效选项 ID 抛出错误', () => {
    const advance = createAdvanceToDecision(content);
    const submit = createSubmitYouthChoice(content);
    const pending = advance(input);

    expect(() => submit(pending, 'invalid-id')).toThrow('无效的选项 ID');
  });
});