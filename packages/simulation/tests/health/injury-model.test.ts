import { describe, expect, it } from 'vitest';
import type { HealthState, PlayerDevelopmentProfile } from '@football/contracts';
import { createSeededRandomSource } from '../../src/randomness';
import { simulateInjuryRisk } from '../../src/health/injury-model';

describe('simulateInjuryRisk', () => {
  it('produces more injuries for injury-prone exhausted players than rested durable players', () => {
    let highRiskInjuries = 0;
    let lowRiskInjuries = 0;

    for (let seed = 1; seed <= 500; seed++) {
      if (
        simulateInjuryRisk(
          highRiskProfile,
          exhausted,
          90,
          `2024-W${seed}`,
          createSeededRandomSource(seed),
        )
      ) {
        highRiskInjuries++;
      }
      if (
        simulateInjuryRisk(
          lowRiskProfile,
          rested,
          20,
          `2024-W${seed}`,
          createSeededRandomSource(seed),
        )
      ) {
        lowRiskInjuries++;
      }
    }

    expect(highRiskInjuries).toBeGreaterThan(lowRiskInjuries * 3);
    expect(lowRiskInjuries).toBeLessThan(20);
  });
});

const profile = (injuryProneness: number): PlayerDevelopmentProfile => ({
  attributePotential: {
    technical: {
      firstTouch: 70,
      dribbling: 70,
      passing: 70,
      shooting: 70,
      defending: 70,
      aerialAbility: 70,
    },
    physical: { pace: 70, strength: 70, stamina: 70, agility: 70 },
    mental: {
      offTheBall: 70,
      vision: 70,
      decision: 70,
      composure: 70,
      determination: 70,
      discipline: 70,
    },
  },
  maturationPace: 'normal',
  professionalism: 60,
  stability: 60,
  pressureResistance: 60,
  adaptability: 60,
  injuryProneness,
});

const health = (fitness: number, fatigue: number, recentLoad: number): HealthState => ({
  fitness,
  fatigue,
  recentLoad,
  activeInjury: null,
  previousInjuries: [],
});

const highRiskProfile = profile(90);
const lowRiskProfile = profile(10);
const exhausted = health(45, 85, 90);
const rested = health(90, 5, 10);
