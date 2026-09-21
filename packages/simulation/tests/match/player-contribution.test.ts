import { describe, expect, it } from 'vitest';
import type { Position } from '@football/contracts';
import { allocatePlayerContribution } from '../../src/match/player-contribution';
import { createSeededRandomSource } from '../../src/randomness';

const positions: Position[] = [
  'CENTER_BACK',
  'FULL_BACK',
  'DEFENSIVE_MIDFIELDER',
  'MIDFIELDER',
  'WINGER',
  'FORWARD',
];

const allocate = (overrides: Partial<Parameters<typeof allocatePlayerContribution>[0]> = {}) =>
  allocatePlayerContribution({
    ownGoals: 3,
    minutes: 90,
    position: 'MIDFIELDER',
    shooting: 60,
    passing: 60,
    rng: createSeededRandomSource(42),
    ...overrides,
  });

describe('allocatePlayerContribution', () => {
  it('零进球或零分钟时没有个人贡献', () => {
    expect(allocate({ ownGoals: 0 })).toEqual({ goals: 0, assists: 0 });
    expect(allocate({ minutes: 0 })).toEqual({ goals: 0, assists: 0 });
    const oneGoal = allocate({ ownGoals: 1 });
    expect(oneGoal.goals + oneGoal.assists).toBeLessThanOrEqual(1);
  });

  it('每个己方进球最多归属一个个人贡献且覆盖所有外场位置', () => {
    for (const position of positions) {
      for (let seed = 0; seed < 100; seed += 1) {
        const value = allocatePlayerContribution({
          ownGoals: 6,
          minutes: 90,
          position,
          shooting: 100,
          passing: 100,
          rng: createSeededRandomSource(seed),
        });

        expect(value.goals).toBeGreaterThanOrEqual(0);
        expect(value.assists).toBeGreaterThanOrEqual(0);
        expect(value.goals + value.assists).toBeLessThanOrEqual(6);
      }
    }
  });

  it('同种子结果一致且能力与位置会影响贡献倾向', () => {
    const first = allocate({ ownGoals: 5, position: 'FORWARD', shooting: 90, passing: 80 });
    const second = allocate({ ownGoals: 5, position: 'FORWARD', shooting: 90, passing: 80 });
    expect(first).toEqual(second);

    let attackingTotal = 0;
    let defensiveTotal = 0;
    for (let seed = 0; seed < 1000; seed += 1) {
      attackingTotal += allocatePlayerContribution({
        ownGoals: 5,
        minutes: 90,
        position: 'FORWARD',
        shooting: 95,
        passing: 80,
        rng: createSeededRandomSource(seed),
      }).goals;
      defensiveTotal += allocatePlayerContribution({
        ownGoals: 5,
        minutes: 90,
        position: 'CENTER_BACK',
        shooting: 25,
        passing: 25,
        rng: createSeededRandomSource(seed),
      }).goals;
    }

    expect(attackingTotal).toBeGreaterThan(defensiveTotal);
  });
});
