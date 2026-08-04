import { z } from 'zod';

export const Position = {
  CenterBack: 'CENTER_BACK',
  FullBack: 'FULL_BACK',
  DefensiveMidfielder: 'DEFENSIVE_MIDFIELDER',
  Midfielder: 'MIDFIELDER',
  Winger: 'WINGER',
  Forward: 'FORWARD',
} as const;

export type Position = (typeof Position)[keyof typeof Position];

export const PositionSchema = z.enum(
  Object.values(Position) as [string, ...string[]]
);

export const Foot = {
  Left: 'LEFT',
  Right: 'RIGHT',
  Both: 'BOTH',
} as const;

export type Foot = (typeof Foot)[keyof typeof Foot];

export const FootSchema = z.enum(
  Object.values(Foot) as [string, ...string[]]
);

export const CareerStage = {
  Youth: 'YOUTH',
  Professional: 'PROFESSIONAL',
  Peak: 'PEAK',
  Decline: 'DECLINE',
  Retired: 'RETIRED',
} as const;

export type CareerStage = (typeof CareerStage)[keyof typeof CareerStage];

export const CareerStageSchema = z.enum(
  Object.values(CareerStage) as [string, ...string[]]
);