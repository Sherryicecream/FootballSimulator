import type { MatchResult, TeamStrength } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';

export function simulateMatch(
  homeTeam: string,
  awayTeam: string,
  homeStrength: TeamStrength,
  awayStrength: TeamStrength,
  weekNumber: number,
  season: number,
  rng: SeededRandomSource,
): MatchResult {
  const homeAdvantage = 5;
  const effectiveHome = homeStrength.overall + homeAdvantage;
  const effectiveAway = awayStrength.overall;
  const totalStrength = effectiveHome + effectiveAway;

  const homePossession = Math.round(50 + (homeStrength.midfield - awayStrength.midfield) * 0.8 + rng.nextInt(-5, 5));
  const clampedHomePossession = Math.min(75, Math.max(25, homePossession));

  const homeShots = Math.max(0, Math.round((effectiveHome / totalStrength) * 15 + rng.nextInt(-3, 5)));
  const awayShots = Math.max(0, Math.round((effectiveAway / totalStrength) * 12 + rng.nextInt(-3, 4)));

  const homeShotAccuracy = 0.3 + (homeStrength.attack - awayStrength.defence) / 200;
  const awayShotAccuracy = 0.3 + (awayStrength.attack - homeStrength.defence) / 200;

  const homeShotsOnTarget = Math.min(homeShots, Math.max(0, Math.round(homeShots * homeShotAccuracy * (0.8 + rng.next() * 0.4))));
  const awayShotsOnTarget = Math.min(awayShots, Math.max(0, Math.round(awayShots * awayShotAccuracy * (0.8 + rng.next() * 0.4))));

  const homeScore = calculateGoals(homeShotsOnTarget, homeStrength.attack, awayStrength.defence, rng);
  const awayScore = calculateGoals(awayShotsOnTarget, awayStrength.attack, homeStrength.defence, rng);

  return {
    homeTeam, awayTeam, homeScore, awayScore,
    homeStrength, awayStrength,
    homePossession: clampedHomePossession,
    awayPossession: 100 - clampedHomePossession,
    homeShots, awayShots,
    homeShotsOnTarget, awayShotsOnTarget,
    weekNumber, season,
  };
}

function calculateGoals(
  shotsOnTarget: number,
  attack: number,
  defence: number,
  rng: SeededRandomSource,
): number {
  if (shotsOnTarget === 0) return 0;
  const conversionRate = 0.1 + (attack - defence) / 300 + rng.next() * 0.1;
  const rawGoals = shotsOnTarget * Math.max(0.05, Math.min(0.5, conversionRate));
  return Math.min(10, Math.round(rawGoals + (rng.next() < 0.2 ? rng.nextInt(-1, 1) : 0)));
}