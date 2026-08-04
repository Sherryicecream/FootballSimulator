import { describe, it, expect } from 'vitest';
import {
  TechnicalAttributesSchema,
  PhysicalAttributesSchema,
  MentalAttributesSchema,
  PlayerAttributesSchema,
  HiddenTraitsSchema,
  PlayerIdentitySchema,
} from '../src/player';

describe('TechnicalAttributes', () => {
  it('validates all 6 technical attributes (0-100)', () => {
    const valid = TechnicalAttributesSchema.parse({
      firstTouch: 65,
      dribbling: 70,
      passing: 75,
      shooting: 60,
      defending: 55,
      aerialAbility: 68,
    });
    expect(valid.firstTouch).toBe(65);
  });

  it('rejects values below 0', () => {
    expect(() =>
      TechnicalAttributesSchema.parse({
        firstTouch: -1,
        dribbling: 50,
        passing: 50,
        shooting: 50,
        defending: 50,
        aerialAbility: 50,
      }),
    ).toThrow();
  });

  it('rejects values above 100', () => {
    expect(() =>
      TechnicalAttributesSchema.parse({
        firstTouch: 101,
        dribbling: 50,
        passing: 50,
        shooting: 50,
        defending: 50,
        aerialAbility: 50,
      }),
    ).toThrow();
  });
});

describe('PhysicalAttributes', () => {
  it('validates all 4 physical attributes', () => {
    const valid = PhysicalAttributesSchema.parse({
      pace: 80,
      strength: 70,
      stamina: 75,
      agility: 78,
    });
    expect(valid.pace).toBe(80);
  });
});

describe('MentalAttributes', () => {
  it('validates all 6 mental attributes', () => {
    const valid = MentalAttributesSchema.parse({
      offTheBall: 65,
      vision: 70,
      decision: 68,
      composure: 72,
      determination: 80,
      discipline: 75,
    });
    expect(valid.offTheBall).toBe(65);
  });
});

describe('PlayerAttributes', () => {
  it('combines all 16 attributes into one structure', () => {
    const full = PlayerAttributesSchema.parse({
      technical: {
        firstTouch: 60,
        dribbling: 65,
        passing: 70,
        shooting: 55,
        defending: 50,
        aerialAbility: 62,
      },
      physical: { pace: 78, strength: 68, stamina: 72, agility: 74 },
      mental: {
        offTheBall: 60,
        vision: 65,
        decision: 63,
        composure: 67,
        determination: 75,
        discipline: 70,
      },
    });
    expect(full.technical.passing).toBe(70);
    expect(full.physical.pace).toBe(78);
    expect(full.mental.determination).toBe(75);
  });
});

describe('HiddenTraits', () => {
  it('validates all 6 hidden traits', () => {
    const valid = HiddenTraitsSchema.parse({
      potential: 85,
      stability: 70,
      professionalism: 75,
      pressureResistance: 65,
      adaptability: 60,
      injuryProneness: 40,
    });
    expect(valid.potential).toBe(85);
    expect(valid.injuryProneness).toBe(40);
  });
});

describe('PlayerIdentity', () => {
  it('validates a complete player identity', () => {
    const valid = PlayerIdentitySchema.parse({
      name: '张伟',
      hometown: '上海',
      homelandId: 'shanghai',
      dateOfBirth: '2008-06-15',
      primaryPosition: 'CENTER_BACK',
      secondaryPosition: 'FULL_BACK',
      preferredFoot: 'RIGHT',
      weakFootLevel: 30,
      growthBackground: '城市青训',
      personalityTendency: 'balanced',
    });
    expect(valid.name).toBe('张伟');
    expect(valid.homelandId).toBe('shanghai');
    expect(valid.primaryPosition).toBe('CENTER_BACK');
    expect(valid.secondaryPosition).toBe('FULL_BACK');
  });

  it('allows optional secondary position', () => {
    const valid = PlayerIdentitySchema.parse({
      name: '李强',
      hometown: '山东',
      homelandId: 'shandong',
      dateOfBirth: '2008-03-20',
      primaryPosition: 'FORWARD',
      preferredFoot: 'LEFT',
      weakFootLevel: 20,
      growthBackground: '校园足球',
      personalityTendency: 'ambitious',
    });
    expect(valid.secondaryPosition).toBeUndefined();
  });

  it('rejects invalid weakFootLevel', () => {
    expect(() =>
      PlayerIdentitySchema.parse({
        name: '王磊',
        hometown: '广东',
        homelandId: 'guangdong',
        dateOfBirth: '2008-01-01',
        primaryPosition: 'MIDFIELDER',
        preferredFoot: 'RIGHT',
        weakFootLevel: 150,
        growthBackground: '青训营',
        personalityTendency: 'balanced',
      }),
    ).toThrow();
  });
});
