import { describe, expect, it } from 'vitest';
import type { CareerSaveV5Like } from '@football/contracts';
import { createSeededRandomSource } from '../../src/randomness';
import { accrueNationalTeam, isEligibleForNationalTeam } from '../../src/career/national-team';
import { createProSave } from '../fixtures/pro-save';

const eligibleSave = (): CareerSaveV5Like =>
  ({
    ...createProSave(),
    schemaVersion: 5,
    player: {
      ...createProSave().player,
      age: 25,
      reputation: 70,
    },
    proSeasonStats: {
      ...createProSave().proSeasonStats,
      leagueAppearances: 15,
    },
  }) as CareerSaveV5Like;

describe('national team eligibility', () => {
  it('requires age, reputation and league appearance thresholds', () => {
    expect(isEligibleForNationalTeam(eligibleSave())).toBe(true);
    expect(
      isEligibleForNationalTeam({
        ...eligibleSave(),
        player: { ...eligibleSave().player, age: 36 },
      }),
    ).toBe(false);
    expect(
      isEligibleForNationalTeam({
        ...eligibleSave(),
        player: { ...eligibleSave().player, reputation: 55 },
      }),
    ).toBe(false);
    expect(
      isEligibleForNationalTeam({
        ...eligibleSave(),
        proSeasonStats: { ...eligibleSave().proSeasonStats, leagueAppearances: 14 },
      }),
    ).toBe(false);
  });

  it('accumulates deterministic caps and goals for an existing international player', () => {
    const save = {
      ...eligibleSave(),
      nationalTeam: { capped: true, caps: 10, goals: 2, debutOn: '2028-05-31' },
    };
    const a = accrueNationalTeam(save, createSeededRandomSource(17));
    const b = accrueNationalTeam(save, createSeededRandomSource(17));

    expect(a).toEqual(b);
    expect(a?.nationalTeam.caps).toBeGreaterThan(10);
    expect(a?.nationalTeam.goals).toBeGreaterThanOrEqual(2);
    expect(a?.reputationDelta).toBeGreaterThan(0);
  });
});
