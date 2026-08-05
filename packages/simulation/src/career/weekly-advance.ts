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

  if (trainingSummary) {
    playerState = applyDelta(playerState, stateChanges, 'fitness', trainingSummary.fitnessChange);
    playerState = applyDelta(playerState, stateChanges, 'morale', trainingSummary.moraleChange);
    playerState = applyDelta(
      playerState,
      stateChanges,
      'coachTrust',
      trainingSummary.coachTrustChange,
    );
  }

  if (matchResult) {
    playerState = applyDelta(playerState, stateChanges, 'fitness', matchResult.fitnessChange);
    playerState = applyDelta(playerState, stateChanges, 'morale', matchResult.moraleChange);
    playerState = applyDelta(playerState, stateChanges, 'coachTrust', matchResult.coachTrustChange);
  }

  // Fatigue decays slightly each week (toward 0)
  if (playerState.fatigue > 0) {
    const fatigueDecay = -Math.min(playerState.fatigue, 3);
    playerState = applyDelta(playerState, stateChanges, 'fatigue', fatigueDecay);
  }

  // Clamp
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
