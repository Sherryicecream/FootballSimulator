import type {
  ClubProfile,
  WorldClubPulse,
  WorldRegistry,
  WorldTransferActivity,
  WorldTransferWindowState,
} from '@football/contracts';
import { simulateWorldTransferWindow } from '@football/simulation';
import { writeWorldTransferWindow } from '../world/world-registry';

export type SettleWorldTransferWindowInput = {
  registry: WorldRegistry;
  clubs: readonly ClubProfile[];
  pulses: readonly WorldClubPulse[];
  seasonId: string;
  window: 'summer' | 'winter';
  seed: number;
};

export type SettleWorldTransferWindowResult = {
  registry: WorldRegistry;
  activities: readonly WorldTransferActivity[];
};

/** Generates and persists one resumable world window; repeating the same key is idempotent. */
export const settleWorldTransferWindow = ({
  registry,
  clubs,
  pulses,
  seasonId,
  window,
  seed,
}: SettleWorldTransferWindowInput): SettleWorldTransferWindowResult => {
  const existing = registry.transferWindow;
  if (
    existing &&
    existing.seasonId === seasonId &&
    existing.window === window &&
    existing.seed === seed
  ) {
    return { registry, activities: existing.activities };
  }
  const activities = simulateWorldTransferWindow({
    clubs,
    pulses,
    previous: existing?.activities ?? [],
    seasonId,
    window,
    seed,
  });
  const state: WorldTransferWindowState = {
    seasonId,
    window,
    seed,
    activities,
    newsCursor: existing?.newsCursor ?? null,
  };
  return { registry: writeWorldTransferWindow(registry, state), activities };
};
