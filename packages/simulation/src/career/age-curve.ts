import type { CareerSaveV3Like, PlayerAttributes } from '@football/contracts';
import type { SeededRandomSource } from '../randomness';

/**
 * 年龄成长乘数（设计 §8.1）：成长峰值 24–28 岁后放缓，29 岁起大幅趋缓。
 * 叠加在既有周成长系数之上。
 */
export const growthAgeFactor = (age: number): number => {
  if (age <= 23) return 1;
  if (age <= 28) return 0.85;
  return 0.4;
};

const PHYSICAL_DECLINE_KEYS = ['pace', 'stamina', 'agility'] as const;
const LATE_DECLINE_KEYS = ['strength'] as const;

export interface AgeDeclineChange {
  attribute: string;
  oldValue: number;
  newValue: number;
}

/**
 * 月度年龄衰退（设计 §8.1）：30 岁起速度/体能/灵活每季期望 −1.5（按月分摊），
 * 32 岁起力量跟进；精神属性不衰退。确定性由调用方传入的随机源保证。
 */
export const applyAgeDecline = <S extends CareerSaveV3Like>(
  save: S,
  rng: SeededRandomSource,
): { player: S['player']; changes: AgeDeclineChange[] } => {
  const age = save.player.age;
  if (age < 30) return { player: save.player, changes: [] };

  const chance = age >= 32 ? 0.16 : 0.11;
  const declineKeys: string[] = [...PHYSICAL_DECLINE_KEYS];
  if (age >= 32) declineKeys.push(...LATE_DECLINE_KEYS);

  const attributes: PlayerAttributes = {
    technical: { ...save.player.attributes.technical },
    physical: { ...save.player.attributes.physical },
    mental: { ...save.player.attributes.mental },
  };
  const changes: AgeDeclineChange[] = [];
  for (const key of declineKeys) {
    if (rng.next() >= chance) continue;
    const oldValue = attributes.physical[key as keyof PlayerAttributes['physical']];
    const newValue = Math.max(20, oldValue - 1);
    if (newValue === oldValue) continue;
    attributes.physical = { ...attributes.physical, [key]: newValue };
    changes.push({ attribute: key, oldValue, newValue });
  }
  return { player: { ...save.player, attributes }, changes };
};
