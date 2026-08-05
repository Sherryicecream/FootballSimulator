import type { WeekActivity } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';

export interface WeekActivityResult {
  activity: WeekActivity;
  hasTraining: boolean;
  hasMatch: boolean;
}

/**
 * 生成周活动类型
 * - 训练：最常见（每周都训练，除非是平淡周）
 * - 比赛：每 3-4 周一次
 * - 事件：15% 概率
 * - 平淡周：5% 概率
 */
export function generateWeekActivity(
  weekNumber: number,
  _season: number,
  rng: SeededRandomSource,
): WeekActivityResult {
  const isMatchWeek = weekNumber % 4 === 0 || (weekNumber % 4 === 3 && rng.next() < 0.3);

  const roll = rng.next();
  const isEvent = !isMatchWeek && roll < 0.15;
  const isQuiet = !isMatchWeek && !isEvent && roll < 0.20;
  const hasTraining = !isQuiet && !isEvent;

  let activity: WeekActivity;
  if (isEvent) {
    activity = 'event';
  } else if (isMatchWeek) {
    activity = 'match';
  } else if (isQuiet) {
    activity = 'quiet';
  } else {
    activity = 'training';
  }

  return { activity, hasTraining: hasTraining || activity === 'training', hasMatch: isMatchWeek };
}
