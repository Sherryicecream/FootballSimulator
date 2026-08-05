import type {
  PlayerCareer,
  PlayerState,
  TrainingSummary,
  AttributeChange,
} from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';

const TRAINING_FOCUS: Record<string, string[]> = {
  CENTER_BACK: ['防守', '空中', '力量'],
  FULL_BACK: ['速度', '耐力', '防守'],
  DEFENSIVE_MIDFIELDER: ['防守', '传球', '耐力'],
  MIDFIELDER: ['传球', '视野', '技术'],
  WINGER: ['盘带', '速度', '射门'],
  FORWARD: ['射门', '跑位', '盘带'],
};

const ATTR_MAP: Record<string, string[]> = {
  防守: ['defending', 'discipline'],
  空中: ['aerialAbility', 'strength'],
  力量: ['strength', 'aerialAbility'],
  速度: ['pace', 'agility'],
  耐力: ['stamina', 'determination'],
  传球: ['passing', 'vision'],
  视野: ['vision', 'decision'],
  技术: ['firstTouch', 'dribbling'],
  盘带: ['dribbling', 'agility'],
  射门: ['shooting', 'composure'],
  跑位: ['offTheBall', 'decision'],
  战术: ['decision', 'discipline'],
  体能: ['stamina', 'pace'],
  灵活: ['agility', 'pace'],
};

/**
 * 根据位置和种子训练模拟
 * 属性增长缓慢，受潜力和职业素养影响
 */
export function simulateTraining(
  player: PlayerCareer,
  state: PlayerState,
  rng: SeededRandomSource,
): TrainingSummary {
  const position = player.identity.primaryPosition;
  const focusOptions = TRAINING_FOCUS[position] ?? ['技术', '体能', '战术'];
  const focus = rng.pick(focusOptions);

  const attributeChanges: AttributeChange[] = [];
  const professionalism = player.hiddenTraits.professionalism;
  const potential = player.hiddenTraits.potential;
  const growthModifier = (professionalism / 100) * (potential / 100);

  const candidates = ATTR_MAP[focus] ?? ['determination', 'discipline'];
  const count = rng.nextInt(1, Math.min(3, candidates.length));
  const trainedAttrs = rng.shuffle(candidates).slice(0, count);

  const allAttrs: Record<string, number> = {
    ...player.attributes.technical,
    ...player.attributes.physical,
    ...player.attributes.mental,
  };

  for (const attrKey of trainedAttrs) {
    const oldValue = allAttrs[attrKey];
    if (oldValue === undefined) continue;
    const growth = rng.next() < growthModifier ? rng.nextInt(1, 3) : rng.nextInt(0, 2);
    const newValue = Math.min(100, oldValue + growth);
    if (newValue !== oldValue) {
      attributeChanges.push({ attribute: attrKey, oldValue, newValue });
    }
  }

  const fitnessChange = -rng.nextInt(1, 4);
  const moraleChange = rng.nextInt(-2, 3);
  const coachTrustChange = rng.nextInt(0, 2);

  return { focus, attributeChanges, fitnessChange, moraleChange, coachTrustChange };
}
