import { describe, it, expect } from 'vitest';
import { simulateMatch } from '../../src/match/match-engine';
import { createSeededRandomSource } from '../../src/randomness/seeded-random-source';

describe('simulateMatch', () => {
  const homeStrength = { attack: 75, midfield: 70, defence: 68, overall: 71 };
  const awayStrength = { attack: 65, midfield: 68, defence: 70, overall: 68 };

  it('生成比赛结果，包含主客队比分', () => {
    const rng = createSeededRandomSource(42);
    const result = simulateMatch('shanghai-wings', 'beijing-dragons', homeStrength, awayStrength, 5, 2024, rng);

    expect(result.homeTeam).toBe('shanghai-wings');
    expect(result.awayTeam).toBe('beijing-dragons');
    expect(typeof result.homeScore).toBe('number');
    expect(typeof result.awayScore).toBe('number');
  });

  it('强队主场更可能获胜', () => {
    let homeWins = 0;
    for (let seed = 0; seed < 100; seed++) {
      const rng = createSeededRandomSource(seed);
      const result = simulateMatch('home', 'away', homeStrength, awayStrength, 1, 2024, rng);
      if (result.homeScore > result.awayScore) homeWins++;
    }
    expect(homeWins).toBeGreaterThanOrEqual(40);
  });

  it('同一种子生成相同结果', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);

    const result1 = simulateMatch('a', 'b', homeStrength, awayStrength, 1, 2024, rng1);
    const result2 = simulateMatch('a', 'b', homeStrength, awayStrength, 1, 2024, rng2);

    expect(result1).toEqual(result2);
  });

  it('生成合理的射门和技术统计', () => {
    const rng = createSeededRandomSource(42);
    const result = simulateMatch('a', 'b', homeStrength, awayStrength, 1, 2024, rng);

    expect(result.homeShots + result.awayShots).toBeGreaterThan(0);
    expect(result.homeShotsOnTarget).toBeLessThanOrEqual(result.homeShots);
    expect(result.awayShotsOnTarget).toBeLessThanOrEqual(result.awayShots);
    expect(result.homePossession + result.awayPossession).toBe(100);
  });

  it('比分不会过大', () => {
    const rng = createSeededRandomSource(42);
    const result = simulateMatch('a', 'b', homeStrength, awayStrength, 1, 2024, rng);

    expect(result.homeScore).toBeLessThanOrEqual(10);
    expect(result.awayScore).toBeLessThanOrEqual(10);
  });
});