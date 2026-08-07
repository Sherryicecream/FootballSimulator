import { describe, expect, it } from 'vitest';
import type { HealthState, PlayerCareerV2, TrainingPlan } from '@football/contracts';
import {
  accrueWeeklyDevelopment,
  settleMonthlyDevelopment,
} from '../../src/player-development/development';

describe('monthly player development', () => {
  it('accrues fractional progress without changing visible attributes during the week', () => {
    const player = createPlayer();
    const before = structuredClone(player.attributes);

    const accrual = accrueWeeklyDevelopment(player, technicalPlan, healthy, 70);

    expect(player.attributes).toEqual(before);
    expect(accrual.passing).toBeGreaterThan(0);
    expect(accrual.strength).toBeLessThan(accrual.passing);
  });

  it('settles whole points at month end without exceeding per-attribute potential', () => {
    const player = createPlayer();
    player.attributes.technical.passing = 69;
    player.development.attributePotential.technical.passing = 70;

    const settled = settleMonthlyDevelopment(player, {
      passing: 3.8,
      firstTouch: 1.2,
    });

    expect(settled.player.attributes.technical.passing).toBe(70);
    expect(settled.player.attributes.technical.firstTouch).toBe(51);
    expect(settled.attributeChanges).toEqual(
      expect.arrayContaining([
        { attribute: 'passing', oldValue: 69, newValue: 70 },
        { attribute: 'firstTouch', oldValue: 50, newValue: 51 },
      ]),
    );
    expect(settled.remainingAccrual.firstTouch).toBeCloseTo(0.2);
    expect(settled.remainingAccrual.passing).toBe(0);
  });
});

const technicalPlan: TrainingPlan = {
  focus: 'technical',
  intensity: 'normal',
  positionFocus: null,
};

const healthy: HealthState = {
  fitness: 80,
  fatigue: 10,
  recentLoad: 20,
  activeInjury: null,
  previousInjuries: [],
};

const createPlayer = (): PlayerCareerV2 => ({
  identity: {
    name: '林岳',
    hometown: '上海',
    homelandId: 'shanghai',
    dateOfBirth: '2008-01-01',
    primaryPosition: 'CENTER_BACK',
    preferredFoot: 'RIGHT',
    weakFootLevel: 30,
    growthBackground: 'academy',
    personalityTendency: 'composed',
  },
  attributes: {
    technical: {
      firstTouch: 50,
      dribbling: 50,
      passing: 50,
      shooting: 40,
      defending: 55,
      aerialAbility: 54,
    },
    physical: { pace: 52, strength: 55, stamina: 53, agility: 50 },
    mental: {
      offTheBall: 48,
      vision: 50,
      decision: 51,
      composure: 50,
      determination: 60,
      discipline: 58,
    },
  },
  development: {
    attributePotential: {
      technical: {
        firstTouch: 75,
        dribbling: 70,
        passing: 78,
        shooting: 65,
        defending: 80,
        aerialAbility: 78,
      },
      physical: { pace: 72, strength: 80, stamina: 76, agility: 70 },
      mental: {
        offTheBall: 72,
        vision: 75,
        decision: 78,
        composure: 74,
        determination: 82,
        discipline: 80,
      },
    },
    maturationPace: 'normal',
    professionalism: 70,
    stability: 60,
    pressureResistance: 62,
    adaptability: 55,
    injuryProneness: 25,
  },
  age: 16,
  careerStage: 'YOUTH',
  reputation: 10,
});
