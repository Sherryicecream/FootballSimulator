import type { Person } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import { createPerson } from './relationship-manager';

const COACH_NAMES = ['王磊', '李刚', '张军', '刘伟', '陈明', '赵强', '周涛', '孙辉'];
const TEAMMATE_FIRST_NAMES = [
  '杨帆',
  '吴昊',
  '徐磊',
  '黄俊',
  '马超',
  '郑凯',
  '朱涛',
  '何鑫',
  '林海',
  '郭峰',
  '罗杰',
  '梁宇',
  '宋杰',
  '唐亮',
  '韩冰',
  '冯晨',
  '曹阳',
  '邓辉',
  '许峰',
  '彭浩',
];
const TEAMMATE_POSITIONS = [
  'CENTER_BACK',
  'FULL_BACK',
  'DEFENSIVE_MIDFIELDER',
  'MIDFIELDER',
  'WINGER',
  'FORWARD',
];
const PERSONALITY_TRAITS = ['严谨', '开朗', '沉稳', '急躁', '幽默', '内向', '自信', '谦逊'];

/**
 * 生成主教练
 */
export function generateCoach(rng: SeededRandomSource): Person {
  const name = rng.pick(COACH_NAMES);
  const personality = rng.pick(PERSONALITY_TRAITS);
  const age = rng.nextInt(35, 55);
  return createPerson(`coach-${name}`, `${name}教练`, 'coach', age, personality);
}

/**
 * 生成两名队友（位置与球员不同）
 */
export function generateTeammates(playerPosition: string, rng: SeededRandomSource): Person[] {
  const teammates: Person[] = [];
  const usedPositions = new Set<string>();
  usedPositions.add(playerPosition);

  for (let i = 0; i < 2; i++) {
    const name = rng.pick(TEAMMATE_FIRST_NAMES);
    const personality = rng.pick(PERSONALITY_TRAITS);
    const availablePositions = TEAMMATE_POSITIONS.filter((p) => !usedPositions.has(p));
    const position =
      availablePositions.length > 0 ? rng.pick(availablePositions) : rng.pick(TEAMMATE_POSITIONS);
    usedPositions.add(position);
    const age = rng.nextInt(16, 18);
    const person = createPerson(`teammate-${i + 1}`, name, 'teammate', age, personality);
    teammates.push(person);
  }

  return teammates;
}
