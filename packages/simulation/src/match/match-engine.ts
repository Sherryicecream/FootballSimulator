import type { MatchResult, TeamStrength } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';

const HOME_ADVANTAGE = 5;
const POSSESSION_MIDFIELD_WEIGHT = 0.8;
const BASE_SHOTS_HOME = 15;
const BASE_SHOTS_AWAY = 12;
const SHOT_ACCURACY_BASELINE = 0.38;
const CONVERSION_RATE_BASELINE = 0.2;
const CONVERSION_RATE_RANGE = 0.34;
const MAX_GOALS = 10;

export function simulateMatch(
  homeTeam: string,
  awayTeam: string,
  homeStrength: TeamStrength,
  awayStrength: TeamStrength,
  weekNumber: number,
  season: number,
  rng: SeededRandomSource,
): MatchResult {
  const homeAdvantage = HOME_ADVANTAGE;
  const effectiveHome = homeStrength.overall + homeAdvantage;
  const effectiveAway = awayStrength.overall;
  const totalStrength = effectiveHome + effectiveAway;

  const homePossession = Math.round(
    50 +
      (homeStrength.midfield - awayStrength.midfield) * POSSESSION_MIDFIELD_WEIGHT +
      rng.nextInt(-5, 5),
  );
  const clampedHomePossession = Math.min(75, Math.max(25, homePossession));

  const homeShots = Math.max(
    0,
    Math.round((effectiveHome / totalStrength) * BASE_SHOTS_HOME + rng.nextInt(-3, 5)),
  );
  const awayShots = Math.max(
    0,
    Math.round((effectiveAway / totalStrength) * BASE_SHOTS_AWAY + rng.nextInt(-3, 4)),
  );

  const homeShotAccuracy = Math.min(
    1,
    Math.max(0, SHOT_ACCURACY_BASELINE + (homeStrength.attack - awayStrength.defence) / 200),
  );
  const awayShotAccuracy = Math.min(
    1,
    Math.max(0, SHOT_ACCURACY_BASELINE + (awayStrength.attack - homeStrength.defence) / 200),
  );

  const homeShotsOnTarget = Math.min(
    homeShots,
    Math.max(0, Math.round(homeShots * homeShotAccuracy * (0.8 + rng.next() * 0.4))),
  );
  const awayShotsOnTarget = Math.min(
    awayShots,
    Math.max(0, Math.round(awayShots * awayShotAccuracy * (0.8 + rng.next() * 0.4))),
  );

  const homeScore = calculateGoals(
    homeShotsOnTarget,
    homeStrength.attack,
    awayStrength.defence,
    rng,
  );
  const awayScore = calculateGoals(
    awayShotsOnTarget,
    awayStrength.attack,
    homeStrength.defence,
    rng,
  );

  return {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    homeStrength,
    awayStrength,
    homePossession: clampedHomePossession,
    awayPossession: 100 - clampedHomePossession,
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    weekNumber,
    season,
  };
}

function calculateGoals(
  shotsOnTarget: number,
  attack: number,
  defence: number,
  rng: SeededRandomSource,
): number {
  if (shotsOnTarget === 0) return 0;
  const conversionRate =
    CONVERSION_RATE_BASELINE + (attack - defence) / 300 + rng.next() * CONVERSION_RATE_RANGE;
  const rawGoals = shotsOnTarget * Math.max(0.05, Math.min(0.5, conversionRate));
  const variation = rng.next() < 0.2 ? rng.nextInt(-1, 1) : 0;
  return Math.min(MAX_GOALS, Math.max(0, Math.round(rawGoals + variation)));
}
