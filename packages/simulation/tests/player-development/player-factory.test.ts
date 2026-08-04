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

  it('地域对单项初始属性的影响不超过三点且不改变潜力', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);

    const shanghaiPlayer = createPlayer({ ...defaultParams, regionId: 'shanghai' }, rng1);
    const xinjiangPlayer = createPlayer({ ...defaultParams, regionId: 'xinjiang' }, rng2);

    const shanghaiValues = Object.values(shanghaiPlayer.attributes).flatMap((group) =>
      Object.values(group),
    );
    const xinjiangValues = Object.values(xinjiangPlayer.attributes).flatMap((group) =>
      Object.values(group),
    );
    shanghaiValues.forEach((value, index) => {
      expect(Math.abs(value - xinjiangValues[index]!)).toBeLessThanOrEqual(3);
    });
    expect(shanghaiPlayer.hiddenTraits.potential).toBe(xinjiangPlayer.hiddenTraits.potential);
  });
});
