import { describe, it, expect } from 'vitest';
import { getRegionProfile, getAllRegions, getKeyRegions } from '../src/regions';
import { RegionProfileSchema } from '@football/contracts';

describe('中国地域数据', () => {
  it('返回所有重点地区', () => {
    const keyRegions = getKeyRegions();
    expect(keyRegions.length).toBeGreaterThanOrEqual(6);
    const ids = keyRegions.map((r) => r.id);
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

  it('地域文案不使用现实俱乐部品牌或固化身体天赋', () => {
    const forbidden = /根宝|鲁能|恒大|天赋出众|身体对抗优势|适合体能训练/;
    for (const region of getAllRegions()) {
      expect(`${region.description} ${region.footballCulture}`).not.toMatch(forbidden);
    }
  });
});
