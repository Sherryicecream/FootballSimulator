import { describe, expect, it } from 'vitest';
import { growthAgeFactor, applyAgeDecline } from '../../src/career/age-curve';
import { createProSave } from '../fixtures/pro-save';
import type { CareerSaveV4 } from '@football/contracts';
import { createSeededRandomSource } from '../../src/randomness';
import type { SeededRandomSource } from '../../src/randomness';

/** 恒定返回 0 的随机源：用于必然触发衰退的断言。 */
const ZERO_RNG: SeededRandomSource = { next: () => 0 } as SeededRandomSource;

describe('growthAgeFactor', () => {
  it('成长峰值 24–28 岁放缓，29 岁起大幅趋缓', () => {
    expect(growthAgeFactor(20)).toBe(1);
    expect(growthAgeFactor(23)).toBe(1);
    expect(growthAgeFactor(25)).toBe(0.85);
    expect(growthAgeFactor(28)).toBe(0.85);
    expect(growthAgeFactor(29)).toBe(0.4);
    expect(growthAgeFactor(35)).toBe(0.4);
  });
});

describe('applyAgeDecline', () => {
  const asV5 = (age: number) =>
    ({ ...createProSave(), player: { ...createProSave().player, age } }) as CareerSaveV4;

  it('30 岁以下不衰退', () => {
    const { changes } = applyAgeDecline(asV5(28), ZERO_RNG);
    expect(changes).toEqual([]);
  });

  it('30 岁起身体属性可能下降且只影响指定属性', () => {
    const { player, changes } = applyAgeDecline(asV5(30), ZERO_RNG);
    expect(changes.length).toBe(3); // pace/stamina/agility
    for (const change of changes) {
      expect(['pace', 'stamina', 'agility']).toContain(change.attribute);
      expect(change.newValue).toBe(change.oldValue - 1);
    }
    expect(player.attributes.physical.pace).toBe(
      createProSave().player.attributes.physical.pace - 1,
    );
    // 精神与力量（<32 岁）不受影响
    expect(player.attributes.mental).toEqual(createProSave().player.attributes.mental);
    expect(player.attributes.physical.strength).toBe(
      createProSave().player.attributes.physical.strength,
    );
  });

  it('32 岁起力量也开始衰退', () => {
    const { changes } = applyAgeDecline(asV5(32), ZERO_RNG);
    expect(changes.map(({ attribute }) => attribute)).toContain('strength');
  });

  it('不会把属性降到 20 以下', () => {
    const save = asV5(33);
    const save2 = {
      ...save,
      player: {
        ...save.player,
        attributes: {
          ...save.player.attributes,
          physical: {
            ...save.player.attributes.physical,
            pace: 20,
            stamina: 20,
            agility: 20,
            strength: 20,
          },
        },
      },
    } as CareerSaveV4;
    const { changes } = applyAgeDecline(save2, ZERO_RNG);
    expect(changes).toEqual([]);
  });

  it('同种子同输入结果一致', () => {
    const a = applyAgeDecline(asV5(31), createSeededRandomSource(9));
    const b = applyAgeDecline(asV5(31), createSeededRandomSource(9));
    expect(a).toEqual(b);
  });
});
