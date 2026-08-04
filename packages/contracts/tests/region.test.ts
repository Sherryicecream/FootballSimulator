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
    expect(() =>
      RegionProfileSchema.parse({
        id: 'test',
        name: '测试',
        group: '华东',
        isKeyRegion: false,
        description: '测试',
        youthFacilityLevel: 150,
        scoutingCoverage: 50,
        competitionIntensity: 50,
        trainingStyle: '技术型',
        costOfLiving: '中',
        climate: '温和',
        footballCulture: '一般',
      }),
    ).toThrow();
  });
});
