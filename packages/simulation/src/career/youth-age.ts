import { deriveAge } from './simulate-youth-week';

/** 青训赛季的最后完整年龄窗口；满 20 岁后必须转入职业市场。 */
export const MAX_YOUTH_AGE = 19;

export const isFinalYouthSeason = (age: number): boolean => age >= MAX_YOUTH_AGE;

export const canStartNextYouthSeason = (dateOfBirth: string, nextSeasonStart: string): boolean =>
  deriveAge(dateOfBirth, nextSeasonStart) <= MAX_YOUTH_AGE;
