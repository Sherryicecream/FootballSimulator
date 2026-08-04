import { describe, it, expect } from 'vitest';
import { PlayerCareerSchema, CareerSaveSchema } from '../src/career';

describe('PlayerCareer', () => {
  it('validates a complete player career state', () => {
    const valid = PlayerCareerSchema.parse({
      identity: {
        name: '张伟', hometown: '上海', dateOfBirth: '2008-06-15',
        primaryPosition: 'CENTER_BACK', secondaryPosition: 'FULL_BACK',
        preferredFoot: 'RIGHT', weakFootLevel: 30,
        growthBackground: '城市青训', personalityTendency: 'balanced',
      },
      attributes: {
        technical: { firstTouch: 60, dribbling: 65, passing: 70, shooting: 55, defending: 50, aerialAbility: 62 },
        physical: { pace: 78, strength: 68, stamina: 72, agility: 74 },
        mental: { offTheBall: 60, vision: 65, decision: 63, composure: 67, determination: 75, discipline: 70 },
      },
      hiddenTraits: {
        potential: 85, stability: 70, professionalism: 75,
        pressureResistance: 65, adaptability: 60, injuryProneness: 40,
      },
      age: 16,
      careerStage: 'YOUTH',
      reputation: 20,
    });
    expect(valid.age).toBe(16);
    expect(valid.careerStage).toBe('YOUTH');
    expect(valid.reputation).toBe(20);
  });

  it('rejects invalid career stage', () => {
    expect(() => PlayerCareerSchema.parse({
      identity: {
        name: '李强', hometown: '山东', dateOfBirth: '2008-03-20',
        primaryPosition: 'FORWARD', preferredFoot: 'LEFT',
        weakFootLevel: 20, growthBackground: '校园足球', personalityTendency: 'ambitious',
      },
      attributes: {
        technical: { firstTouch: 50, dribbling: 55, passing: 60, shooting: 65, defending: 30, aerialAbility: 58 },
        physical: { pace: 72, strength: 60, stamina: 65, agility: 70 },
        mental: { offTheBall: 55, vision: 60, decision: 58, composure: 62, determination: 70, discipline: 65 },
      },
      hiddenTraits: {
        potential: 80, stability: 65, professionalism: 70,
        pressureResistance: 60, adaptability: 55, injuryProneness: 45,
      },
      age: 16,
      careerStage: 'UNKNOWN',
      reputation: 15,
    })).toThrow();
  });
});

describe('CareerSave', () => {
  it('validates a complete career save', () => {
    const valid = CareerSaveSchema.parse({
      schemaVersion: 1,
      player: {
        identity: {
          name: '张伟', hometown: '上海', dateOfBirth: '2008-06-15',
          primaryPosition: 'CENTER_BACK', secondaryPosition: 'FULL_BACK',
          preferredFoot: 'RIGHT', weakFootLevel: 30,
          growthBackground: '城市青训', personalityTendency: 'balanced',
        },
        attributes: {
          technical: { firstTouch: 60, dribbling: 65, passing: 70, shooting: 55, defending: 50, aerialAbility: 62 },
          physical: { pace: 78, strength: 68, stamina: 72, agility: 74 },
          mental: { offTheBall: 60, vision: 65, decision: 63, composure: 67, determination: 75, discipline: 70 },
        },
        hiddenTraits: {
          potential: 85, stability: 70, professionalism: 75,
          pressureResistance: 65, adaptability: 60, injuryProneness: 40,
        },
        age: 16,
        careerStage: 'YOUTH',
        reputation: 20,
      },
      world: { currentDate: '2024-09-01', season: 2024 },
      randomState: { seed: 12345, sequencePosition: 0 },
    });
    expect(valid.schemaVersion).toBe(1);
    expect(valid.player.identity.name).toBe('张伟');
  });

  it('requires schemaVersion', () => {
    expect(() => CareerSaveSchema.parse({
      player: {}, world: {}, randomState: {},
    })).toThrow();
  });
});