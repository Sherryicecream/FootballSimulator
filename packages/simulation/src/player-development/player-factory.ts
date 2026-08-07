import {
  type PlayerCareer,
  type PlayerIdentity,
  type PlayerAttributes,
  type TechnicalAttributes,
  type PhysicalAttributes,
  type MentalAttributes,
  type HiddenTraits,
  type Position,
} from '@football/contracts';
import { type SeededRandomSource } from '../randomness/seeded-random-source';

export interface CreatePlayerParams {
  name: string;
  hometown: string;
  primaryPosition: Position;
  secondaryPosition?: Position;
  preferredFoot: 'LEFT' | 'RIGHT' | 'BOTH';
  regionId: string;
}

const GROWTH_BACKGROUNDS = ['academy', 'school', 'community', 'late-bloomer'] as const;
const PERSONALITY_TENDENCIES = ['ambitious', 'composed', 'disciplined', 'expressive'] as const;

/** 位置属性权重：每种位置对 16 项属性的侧重 */
const positionWeights: Record<
  Position,
  {
    technical: Partial<Record<keyof TechnicalAttributes, number>>;
    physical: Partial<Record<keyof PhysicalAttributes, number>>;
    mental: Partial<Record<keyof MentalAttributes, number>>;
  }
> = {
  CENTER_BACK: {
    technical: {
      defending: 1.5,
      aerialAbility: 1.4,
      passing: 0.8,
      firstTouch: 0.7,
      dribbling: 0.5,
      shooting: 0.3,
    },
    physical: { strength: 1.4, stamina: 1.0, pace: 0.9, agility: 0.7 },
    mental: {
      decision: 1.3,
      composure: 1.3,
      discipline: 1.2,
      determination: 1.1,
      offTheBall: 0.7,
      vision: 0.7,
    },
  },
  FULL_BACK: {
    technical: {
      defending: 1.3,
      passing: 1.1,
      firstTouch: 1.0,
      dribbling: 1.0,
      aerialAbility: 0.7,
      shooting: 0.5,
    },
    physical: { pace: 1.4, stamina: 1.4, agility: 1.2, strength: 0.8 },
    mental: {
      decision: 1.1,
      discipline: 1.1,
      determination: 1.0,
      composure: 1.0,
      offTheBall: 0.9,
      vision: 0.8,
    },
  },
  DEFENSIVE_MIDFIELDER: {
    technical: {
      defending: 1.3,
      passing: 1.2,
      firstTouch: 1.0,
      aerialAbility: 1.0,
      dribbling: 0.7,
      shooting: 0.5,
    },
    physical: { stamina: 1.4, strength: 1.2, pace: 0.8, agility: 0.8 },
    mental: {
      decision: 1.4,
      discipline: 1.3,
      determination: 1.2,
      vision: 1.1,
      composure: 1.1,
      offTheBall: 0.8,
    },
  },
  MIDFIELDER: {
    technical: {
      passing: 1.4,
      firstTouch: 1.3,
      dribbling: 1.2,
      shooting: 0.9,
      defending: 0.6,
      aerialAbility: 0.6,
    },
    physical: { stamina: 1.3, agility: 1.1, pace: 0.9, strength: 0.7 },
    mental: {
      vision: 1.4,
      decision: 1.2,
      composure: 1.2,
      offTheBall: 1.1,
      determination: 1.0,
      discipline: 0.9,
    },
  },
  WINGER: {
    technical: {
      dribbling: 1.4,
      firstTouch: 1.3,
      passing: 1.1,
      shooting: 1.0,
      defending: 0.4,
      aerialAbility: 0.5,
    },
    physical: { pace: 1.5, agility: 1.4, stamina: 1.1, strength: 0.6 },
    mental: {
      offTheBall: 1.3,
      composure: 1.1,
      vision: 1.1,
      decision: 1.0,
      determination: 0.9,
      discipline: 0.7,
    },
  },
  FORWARD: {
    technical: {
      shooting: 1.5,
      firstTouch: 1.3,
      dribbling: 1.2,
      aerialAbility: 1.1,
      passing: 0.8,
      defending: 0.3,
    },
    physical: { pace: 1.3, strength: 1.1, agility: 1.2, stamina: 0.9 },
    mental: {
      offTheBall: 1.4,
      composure: 1.3,
      decision: 1.2,
      determination: 1.1,
      vision: 0.9,
      discipline: 0.6,
    },
  },
};

/** 区域青训系数：根据 youthFacilityLevel 影响初始属性范围 */
function getRegionFacilityBonus(regionId: string): number {
  const bonuses: Record<string, number> = {
    shanghai: 3,
    shandong: 2,
    xinjiang: 0,
    guangdong: 2,
    'sichuan-chongqing': 1,
    dongbei: 1,
  };
  return bonuses[regionId] ?? 0;
}

/** 根据位置和区域生成 16 岁青年球员 */
export function createPlayer(params: CreatePlayerParams, rng: SeededRandomSource): PlayerCareer {
  const weights = positionWeights[params.primaryPosition];
  const facilityBonus = getRegionFacilityBonus(params.regionId);
  const growthBackground = rng.pick(GROWTH_BACKGROUNDS);
  const personalityTendency = rng.pick(PERSONALITY_TENDENCIES);
  const weakFootLevel = rng.nextInt(1, 5);

  const baseMin = 30;
  const baseMax = 60;

  const generateAttribute = (weight: number): number => {
    const base = rng.nextInt(baseMin, baseMax);
    const weighted = Math.round(base * weight) + facilityBonus;
    return Math.min(100, Math.max(1, weighted));
  };

  const identity: PlayerIdentity = {
    name: params.name,
    hometown: params.hometown,
    homelandId: params.regionId,
    dateOfBirth: (() => {
      const birthYear = 2008;
      const birthMonth = rng.nextInt(1, 12);
      const birthDay = rng.nextInt(1, 28);
      return `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
    })(),
    primaryPosition: params.primaryPosition,
    secondaryPosition: params.secondaryPosition,
    preferredFoot: params.preferredFoot,
    weakFootLevel,
    growthBackground,
    personalityTendency,
  };

  const technical: TechnicalAttributes = {
    firstTouch: generateAttribute(weights.technical.firstTouch ?? 1.0),
    dribbling: generateAttribute(weights.technical.dribbling ?? 1.0),
    passing: generateAttribute(weights.technical.passing ?? 1.0),
    shooting: generateAttribute(weights.technical.shooting ?? 1.0),
    defending: generateAttribute(weights.technical.defending ?? 1.0),
    aerialAbility: generateAttribute(weights.technical.aerialAbility ?? 1.0),
  };

  const physical: PhysicalAttributes = {
    pace: generateAttribute(weights.physical.pace ?? 1.0),
    strength: generateAttribute(weights.physical.strength ?? 1.0),
    stamina: generateAttribute(weights.physical.stamina ?? 1.0),
    agility: generateAttribute(weights.physical.agility ?? 1.0),
  };

  const mental: MentalAttributes = {
    offTheBall: generateAttribute(weights.mental.offTheBall ?? 1.0),
    vision: generateAttribute(weights.mental.vision ?? 1.0),
    decision: generateAttribute(weights.mental.decision ?? 1.0),
    composure: generateAttribute(weights.mental.composure ?? 1.0),
    determination: generateAttribute(weights.mental.determination ?? 1.0),
    discipline: generateAttribute(weights.mental.discipline ?? 1.0),
  };

  const attributes: PlayerAttributes = { technical, physical, mental };

  const hiddenTraits: HiddenTraits = {
    potential: rng.nextInt(60, 95),
    stability: rng.nextInt(40, 85),
    professionalism: rng.nextInt(40, 90),
    pressureResistance: rng.nextInt(35, 85),
    adaptability: rng.nextInt(40, 80),
    injuryProneness: rng.nextInt(15, 60),
  };

  return {
    identity,
    attributes,
    hiddenTraits,
    age: 16,
    careerStage: 'YOUTH',
    reputation: rng.nextInt(10, 30),
  };
}
