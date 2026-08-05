import type {
  CareerSave,
  WeeklyAdvanceResult,
  PlayerState,
  StateChange,
} from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import { advanceOneWeek } from './calendar';
import { generateWeekActivity } from './week-activities';
import { simulateTraining } from '../player-development/training';
import { simulateYouthMatch } from '../match/youth-match';

/**
 * 推进一周
 * 整合：日历推进 → 活动生成 → 训练/比赛模拟 → 状态更新
 *
 * 状态平衡原则：
 * - 体能每周自然恢复 3-5 点；训练消耗 1-4，比赛消耗 5-12
 * - 长期趋势：体能稳定在 50-80 区间
 * - 疲劳值由训练（+2~5）和比赛（+5~10）累积，每周自然衰减 3-5
 * - 长期趋势：疲劳在 5-30 区间波动
 * - 教练信任增长缓慢（训练 +0~1），表现差时下降
 * - 长期趋势：稳定在 30-70 区间
 * - 士气向 50 回归，避免无限膨胀或归零
 */
export function advanceCareerWeek(save: CareerSave, rng: SeededRandomSource): WeeklyAdvanceResult {
  const advanced = advanceOneWeek({
    currentDate: save.world.currentDate,
    season: save.world.season,
    weekNumber: save.world.weekNumber,
    month: parseInt(save.world.currentDate.split('-')[1]!, 10),
  });

  const weekNumber = advanced.weekNumber;
  const season = advanced.season;
  const date = advanced.currentDate;

  // Generate week activity
  const weekActivity = generateWeekActivity(weekNumber, season, rng);

  // Execute training
  const trainingSummary = weekActivity.hasTraining
    ? simulateTraining(save.player, save.context.playerState, rng)
    : null;

  // Execute match
  const matchResult = weekActivity.hasMatch
    ? simulateYouthMatch(save.player, save.context.playerState, weekNumber, season, rng)
    : null;

  // Apply state changes
  let playerState: PlayerState = { ...save.context.playerState };
  const stateChanges: StateChange[] = [];

  // 1. Training effects
  if (trainingSummary) {
    playerState = applyDelta(playerState, stateChanges, 'fitness', trainingSummary.fitnessChange);
    playerState = applyDelta(playerState, stateChanges, 'morale', trainingSummary.moraleChange);
    playerState = applyDelta(
      playerState,
      stateChanges,
      'coachTrust',
      trainingSummary.coachTrustChange,
    );
    // 疲劳累积：训练
    playerState = applyDelta(playerState, stateChanges, 'fatigue', rng.nextInt(2, 5));
  }

  // 2. Match effects
  if (matchResult) {
    playerState = applyDelta(playerState, stateChanges, 'fitness', matchResult.fitnessChange);
    playerState = applyDelta(playerState, stateChanges, 'morale', matchResult.moraleChange);
    playerState = applyDelta(playerState, stateChanges, 'coachTrust', matchResult.coachTrustChange);
    // 疲劳累积：比赛
    const fatigueFromMatch = matchResult.played ? rng.nextInt(5, 10) : rng.nextInt(1, 3);
    playerState = applyDelta(playerState, stateChanges, 'fatigue', fatigueFromMatch);
  }

  // 3. 基础恢复（每周固定）
  // 体能自然恢复：平淡周恢复更多，比赛周恢复更少
  const baseRecovery =
    weekActivity.activity === 'quiet'
      ? rng.nextInt(6, 10)
      : weekActivity.activity === 'match'
        ? rng.nextInt(2, 4)
        : rng.nextInt(3, 5);
  playerState = applyDelta(playerState, stateChanges, 'fitness', baseRecovery);

  // 疲劳自然衰减
  const fatigueDecay = -Math.min(playerState.fatigue, rng.nextInt(3, 5));
  playerState = applyDelta(playerState, stateChanges, 'fatigue', fatigueDecay);

  // 4. 回归趋势：防止士气/教练信任无限膨胀
  // 士气向 50 回归（每周回归 10%）
  const moraleRegression = Math.round((50 - playerState.morale) * 0.1);
  playerState = applyDelta(playerState, stateChanges, 'morale', moraleRegression);

  // 教练信任向 45 回归（每周回归 5%）
  const trustRegression = Math.round((45 - playerState.coachTrust) * 0.05);
  playerState = applyDelta(playerState, stateChanges, 'coachTrust', trustRegression);

  // 5. Clamp all values
  playerState = {
    ...playerState,
    fitness: clamp(playerState.fitness, 0, 100),
    morale: clamp(playerState.morale, 0, 100),
    coachTrust: clamp(playerState.coachTrust, 0, 100),
    fatigue: clamp(playerState.fatigue, 0, 100),
  };

  return {
    date,
    week: weekNumber,
    season,
    activity: weekActivity.activity,
    trainingSummary,
    matchResult,
    event: null,
    stateChanges,
    hasPendingChoice: false,
  };
}

function applyDelta(
  state: PlayerState,
  changes: StateChange[],
  key: string,
  delta: number,
): PlayerState {
  if (delta === 0) return state;
  const oldValue = (state as Record<string, string | number>)[key] as number;
  const newValue = Math.round(oldValue + delta);
  changes.push({ key, oldValue, newValue: Math.round(newValue) });
  return { ...state, [key]: newValue };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
