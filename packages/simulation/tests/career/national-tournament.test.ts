import { describe, expect, it } from 'vitest';
import { CareerSaveV5Schema, migrateCareerSaveV5 } from '@football/contracts';
import { createYouthSave } from '../fixtures/youth-save';
import { isTournamentYear, simulateSummerTournament } from '../../src/career/national-tournament';

const cappedSave = (overrides: Record<string, unknown> = {}) =>
  CareerSaveV5Schema.parse({
    ...migrateCareerSaveV5(createYouthSave()),
    careerPhase: 'retired',
    nationalTeam: { capped: true, caps: 12, goals: 3, debutOn: '2029-09-01' },
    player: { ...migrateCareerSaveV5(createYouthSave()).player, age: 27, reputation: 66 },
    ...overrides,
  });

describe('isTournamentYear', () => {
  it('assigns the asian cup and world cup to alternating summers', () => {
    expect(isTournamentYear(2028)).toBe('asian-cup');
    expect(isTournamentYear(2030)).toBe('world-cup');
    expect(isTournamentYear(2029)).toBeNull();
    expect(isTournamentYear(2032)).toBe('asian-cup');
  });
});

describe('simulateSummerTournament', () => {
  it('returns null without national-team status, past the age cap or outside tournament years', () => {
    const uncapped = CareerSaveV5Schema.parse({
      ...migrateCareerSaveV5(createYouthSave()),
      nationalTeam: null,
      player: { ...migrateCareerSaveV5(createYouthSave()).player, age: 27 },
    });
    expect(simulateSummerTournament(uncapped, 2030)).toBeNull();
    expect(
      simulateSummerTournament(
        cappedSave({ player: { ...migrateCareerSaveV5(createYouthSave()).player, age: 38 } }),
        2030,
      ),
    ).toBeNull();
    expect(simulateSummerTournament(cappedSave(), 2029)).toBeNull();
  });

  it('produces a structurally valid tournament and is deterministic per seed', () => {
    const save = cappedSave();
    const a = simulateSummerTournament(save, 2030)!;
    const b = simulateSummerTournament(save, 2030)!;
    expect(a).toEqual(b);
    expect(a.competition).toBe('world-cup');
    expect(a.matchesPlayed).toBeGreaterThanOrEqual(3);
    expect(a.matchesPlayed).toBeLessThanOrEqual(7);
    expect(a.goals).toBeGreaterThanOrEqual(0);
    expect(a.summary).toContain('世界杯');
  });

  it('lets a strong national side win the trophy in some seeds', () => {
    const elite = cappedSave({
      player: { ...migrateCareerSaveV5(createYouthSave()).player, age: 27, reputation: 88 },
    });
    let championSeeds = 0;
    for (let seed = 1; seed <= 60; seed += 1) {
      const result = simulateSummerTournament(elite, 2032, seed)!;
      expect(result.competition).toBe('asian-cup');
      if (result.honour?.kind === 'asian-cup-champion') championSeeds += 1;
    }
    expect(championSeeds).toBeGreaterThan(0);
    expect(championSeeds).toBeLessThan(60);
  });

  it('keeps group-stage exits honest for weak sides', () => {
    const weak = cappedSave({
      player: { ...migrateCareerSaveV5(createYouthSave()).player, age: 27, reputation: 30 },
    });
    const groupExits = Array.from({ length: 20 }, (_, index) => index + 1)
      .map((seed) => simulateSummerTournament(weak, 2030, seed)!)
      .filter(({ bestRound }) => bestRound === 'group').length;
    expect(groupExits).toBeGreaterThanOrEqual(8);
  });
});
