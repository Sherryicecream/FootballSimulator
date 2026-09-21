import { describe, expect, it } from 'vitest';
import {
  bridgeContractYears,
  computeCountryAppeal,
  professionalSeasonDates,
} from '../../src/transfer/cross-country-transfer';

describe('跨国转会适应期与赛历桥接', () => {
  it('同国转会吸引力为 100', () => {
    expect(computeCountryAppeal('china', 'china', false)).toBe(100);
  });

  it('跨洲转会且存在语言障碍时吸引力降低但仍可行', () => {
    const appeal = computeCountryAppeal('japan', 'england', true);
    expect(appeal).toBeLessThan(60);
    expect(appeal).toBeGreaterThan(30);
  });

  it('适应完成后语言障碍折扣消失', () => {
    const before = computeCountryAppeal('spain', 'china', true);
    const after = computeCountryAppeal('spain', 'china', false);
    expect(after).toBeGreaterThan(before);
  });

  it('三月赛历转九月赛历只产生半年的桥接期', () => {
    expect(bridgeContractYears('china', 'england')).toBe(0.5);
    expect(bridgeContractYears('japan', 'korea')).toBe(0);
  });

  it('亚洲赛季在三月开赛并于十一月结束', () => {
    expect(professionalSeasonDates('japan', 2029)).toEqual({
      startDate: '2029-03-01',
      endDate: '2029-11-30',
    });
  });
});
