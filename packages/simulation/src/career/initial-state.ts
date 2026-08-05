import type { PlayerState } from '@football/contracts';

/**
 * 初始化球员状态（青训选择后）
 */
export function initializePlayerState(): PlayerState {
  return {
    fitness: 70,
    morale: 60,
    coachTrust: 35,
    fatigue: 5,
    teamStatus: 'fringe',
  };
}