import type { Position } from '@football/contracts';
import type { SeededRandomSource } from '../randomness';

export type PlayerContribution = {
  goals: number;
  assists: number;
};

type PositionContributionProfile = {
  scorer: number;
  assister: number;
};

const POSITION_PROFILES: Record<Position, PositionContributionProfile> = {
  CENTER_BACK: { scorer: 0.08, assister: 0.18 },
  FULL_BACK: { scorer: 0.1, assister: 0.28 },
  DEFENSIVE_MIDFIELDER: { scorer: 0.14, assister: 0.38 },
  MIDFIELDER: { scorer: 0.2, assister: 0.5 },
  WINGER: { scorer: 2.5, assister: 1.8 },
  FORWARD: { scorer: 2.5, assister: 1.8 },
};

const clampScore = (value: number): number => Math.min(100, Math.max(0, value));

export const allocatePlayerContribution = ({
  ownGoals,
  minutes,
  position,
  shooting,
  passing,
  rng,
}: {
  ownGoals: number;
  minutes: number;
  position: Position;
  shooting: number;
  passing: number;
  rng: SeededRandomSource;
}): PlayerContribution => {
  const goalCount = Math.max(0, Math.floor(ownGoals));
  const minutesFactor = Math.min(1, Math.max(0, minutes / 90));
  if (goalCount === 0 || minutesFactor === 0) return { goals: 0, assists: 0 };

  const profile = POSITION_PROFILES[position];
  const scorerWeight =
    profile.scorer * minutesFactor * (0.45 + (clampScore(shooting) / 100) * 0.55);
  const assisterWeight =
    profile.assister * minutesFactor * (0.45 + (clampScore(passing) / 100) * 0.55);

  let goals = 0;
  let assists = 0;
  for (let index = 0; index < goalCount; index += 1) {
    const contribution = rng.pickWeighted(['goal', 'assist', 'none'] as const, [
      scorerWeight,
      assisterWeight,
      1,
    ]);
    if (contribution === 'goal') goals += 1;
    if (contribution === 'assist') assists += 1;
  }

  return { goals, assists };
};
