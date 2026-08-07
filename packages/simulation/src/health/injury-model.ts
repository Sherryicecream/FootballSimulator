import type { HealthState, InjuryStatus, PlayerDevelopmentProfile } from '@football/contracts';
import type { SeededRandomSource } from '../randomness';

export const simulateInjuryRisk = (
  development: PlayerDevelopmentProfile,
  health: HealthState,
  weeklyLoad: number,
  weekKey: string,
  rng: SeededRandomSource,
): InjuryStatus | null => {
  if (health.activeInjury) {
    return null;
  }

  const probability =
    0.001 +
    (development.injuryProneness / 100) * 0.01 +
    (Math.max(0, health.fatigue - 40) / 60) * 0.025 +
    (Math.min(100, weeklyLoad) / 100) * 0.015 +
    (Math.max(0, 70 - health.fitness) / 70) * 0.015;
  if (rng.next() >= probability) {
    return null;
  }

  const severityRoll = rng.next();
  const kind: InjuryStatus['kind'] =
    severityRoll < 0.6
      ? 'discomfort'
      : severityRoll < 0.88
        ? 'minor'
        : severityRoll < 0.98
          ? 'moderate'
          : 'severe';
  const recoveryRanges: Record<InjuryStatus['kind'], readonly [number, number]> = {
    discomfort: [1, 1],
    minor: [1, 3],
    moderate: [4, 8],
    severe: [9, 26],
  };
  const recoveryRange = recoveryRanges[kind];

  return {
    id: `injury-${weekKey}-${rng.getPosition()}`,
    kind,
    bodyArea: rng.pick(['大腿后侧', '小腿', '脚踝', '膝部']),
    occurredWeek: weekKey,
    expectedRecoveryWeeks: rng.nextInt(recoveryRange[0], recoveryRange[1]),
    recoveredWeeks: 0,
    recurrenceRisk: Math.min(1, 0.05 + development.injuryProneness / 200),
  };
};
