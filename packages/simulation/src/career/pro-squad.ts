import type { Position, ProSquadMember } from '@football/contracts';
import type { ClubProfile } from '@football/contracts';
import type { SeededRandomSource } from '../randomness';

const POSITION_TEMPLATE: Position[] = [
  'CENTER_BACK',
  'CENTER_BACK',
  'CENTER_BACK',
  'FULL_BACK',
  'FULL_BACK',
  'FULL_BACK',
  'DEFENSIVE_MIDFIELDER',
  'DEFENSIVE_MIDFIELDER',
  'MIDFIELDER',
  'MIDFIELDER',
  'MIDFIELDER',
  'WINGER',
  'WINGER',
  'WINGER',
  'FORWARD',
  'FORWARD',
  'FORWARD',
];

const SURNAMES = [
  '陈',
  '林',
  '黄',
  '赵',
  '吴',
  '周',
  '徐',
  '孙',
  '马',
  '朱',
  '胡',
  '郭',
  '何',
  '高',
  '罗',
  '郑',
  '梁',
  '谢',
  '宋',
  '唐',
  '许',
  '韩',
  '冯',
  '邓',
];

const GIVEN_NAMES = [
  '志强',
  '文博',
  '俊凯',
  '嘉树',
  '思远',
  '浩然',
  '子墨',
  '天佑',
  '明轩',
  '越',
  '立诚',
  '弘毅',
  '景行',
  '振宇',
  '向阳',
  '承宇',
  '清源',
  '若愚',
  '望舒',
  '致远',
  '习之',
  '静川',
  '泽民',
  '观澜',
];

/**
 * 生成职业俱乐部阵容：17–21 人覆盖全部位置，
 * 能力围绕俱乐部层级（tier×8+20）波动；同位置包含 2–3 名竞争者。
 */
export const generateProSquad = (
  club: ClubProfile,
  playerPosition: Position,
  playerAbility: number,
  rng: SeededRandomSource,
): ProSquadMember[] => {
  const baseAbility = club.tier * 8 + 20;
  const squad: ProSquadMember[] = [];
  const template: Position[] = [...POSITION_TEMPLATE];
  // 保障与玩家同位置的竞争者数量：把模板中的若干名额替换为玩家位置
  const rivalCount = 2 + (rng.next() < 0.5 ? 1 : 0);
  for (let i = 0; i < rivalCount; i += 1) {
    template[(i * 5 + 2) % template.length] = playerPosition;
  }

  for (const position of template) {
    const isRival = position === playerPosition;
    // 同位置竞争者能力贴近玩家能力，构成直接竞争
    const delta = isRival
      ? Math.round((rng.next() - 0.35) * 14)
      : Math.round((rng.next() - 0.5) * 16);
    const ability = clampScore(baseAbility + delta);
    squad.push({
      personId: `${club.id}-p${squad.length + 1}`,
      name: pickName(rng),
      primaryPosition: position,
      currentAbility: isRival ? clampScore(Math.max(playerAbility - 6, ability)) : ability,
      age: 18 + Math.floor(rng.next() * 17),
      form: 45 + Math.floor(rng.next() * 20),
      fitness: 80 + Math.floor(rng.next() * 15),
      minutesPlayed: 0,
    });
  }
  return squad;
};

/** 深度图：每个位置按能力降序排列成员 ID。 */
export const buildDepthChart = (squad: readonly ProSquadMember[]): Record<string, string[]> => {
  const chart: Record<string, string[]> = {};
  for (const member of squad) {
    const list = chart[member.primaryPosition] ?? [];
    list.push(member.personId);
    chart[member.primaryPosition] = list;
  }
  for (const key of Object.keys(chart)) {
    chart[key] = [...chart[key]!].sort((left, right) => {
      const l = squad.find(({ personId }) => personId === left)!;
      const r = squad.find(({ personId }) => personId === right)!;
      return r.currentAbility - l.currentAbility;
    });
  }
  return chart;
};

/** 球员在同一位置深度图中的排位（1 = 队内最强；竞争者与球员共同参与排序）。 */
export const depthRank = (
  depthChart: Record<string, string[]>,
  position: Position,
  playerPersonId: string,
): number => {
  const list = depthChart[position] ?? [];
  const index = list.indexOf(playerPersonId);
  return index < 0 ? list.length + 1 : index + 1;
};

const pickName = (rng: SeededRandomSource): string => {
  const surname = SURNAMES[Math.floor(rng.next() * SURNAMES.length)]!;
  const given = GIVEN_NAMES[Math.floor(rng.next() * GIVEN_NAMES.length)]!;
  return `${surname}${given}${Math.floor(rng.next() * 90) + 10}`;
};

const clampScore = (value: number): number => Math.min(100, Math.max(20, Math.round(value)));
