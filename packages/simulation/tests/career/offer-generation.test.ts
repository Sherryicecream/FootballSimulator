import { describe, expect, it } from 'vitest';
import { CareerSaveV3Schema, type CareerSaveV3, type ClubProfile } from '@football/contracts';
import { createSeededRandomSource } from '../../src/randomness';
import { generateOffers } from '../../src/career/offer-generation';
import { createYouthSave } from '../fixtures/youth-save';

const clubs: ClubProfile[] = [
  club('top-club', '申海港联', 8, 'shanghai', ['FORWARD', 'WINGER'], 'contending', 90),
  club(
    'mid-club',
    '蜀中天府',
    6,
    'sichuan-chongqing',
    ['CENTER_BACK', 'FORWARD'],
    'rebuilding',
    55,
  ),
  club('low-club', '秦川铁骑', 3, 'shaanxi-gansu', ['FORWARD', 'MIDFIELDER'], 'rebuilding', 26),
  club('stable-club', '闽江渔火', 5, 'fujian', ['WINGER', 'MIDFIELDER'], 'stable', 44),
  club('county-club', '云梦泽畔', 4, 'hubei-hunan', ['MIDFIELDER', 'FULL_BACK'], 'rebuilding', 36),
];

const asV3 = (overrides: Partial<CareerSaveV3> = {}): CareerSaveV3 =>
  CareerSaveV3Schema.parse({
    ...createYouthSave(),
    schemaVersion: 3,
    careerPhase: 'agent-preferences',
    ...overrides,
  });

const strongForward = {
  player: {
    ...createYouthSave().player,
    age: 18,
    attributes: {
      technical: {
        firstTouch: 70,
        dribbling: 68,
        passing: 66,
        shooting: 72,
        defending: 50,
        aerialAbility: 60,
      },
      physical: { pace: 74, strength: 66, stamina: 70, agility: 68 },
      mental: {
        offTheBall: 72,
        vision: 64,
        decision: 66,
        composure: 68,
        determination: 74,
        discipline: 70,
      },
    },
  },
  seasonStats: { appearances: 20, goals: 8, assists: 4, ratingSum: 140, ratingCount: 20 },
};

describe('generateOffers', () => {
  it('同种子同输入生成完全一致的要约', () => {
    const save = asV3(strongForward);
    const a = generateOffers(
      save,
      clubs,
      { leagueTierBias: 'balanced', priority: 'playing-time' },
      createSeededRandomSource(11),
    );
    const b = generateOffers(
      save,
      clubs,
      { leagueTierBias: 'balanced', priority: 'playing-time' },
      createSeededRandomSource(11),
    );
    expect(a).toEqual(b);
  });

  it('生成 2–4 份要约，字段符合设计区间', () => {
    const save = asV3(strongForward);
    const offers = generateOffers(
      save,
      clubs,
      { leagueTierBias: 'balanced', priority: 'playing-time' },
      createSeededRandomSource(11),
    );
    expect(offers.length).toBeGreaterThanOrEqual(2);
    expect(offers.length).toBeLessThanOrEqual(4);
    for (const offer of offers) {
      expect(offer.contractYears).toBeGreaterThanOrEqual(1);
      expect(offer.contractYears).toBeLessThanOrEqual(3);
      expect(offer.salaryPerYear).toBeGreaterThan(0);
      expect(['youth-team', 'rotation', 'first-team-rotation', 'highlighted-prospect']).toContain(
        offer.squadRole,
      );
      expect(['none', 'playing-time', 'position-guarantee']).toContain(offer.promise.kind);
    }
    const ids = new Set(offers.map(({ clubId }) => clubId));
    expect(ids.size).toBe(offers.length);
  });

  it('高层级俱乐部薪资更高但承诺更少', () => {
    const save = asV3(strongForward);
    const offers = generateOffers(
      save,
      clubs,
      { leagueTierBias: 'balanced', priority: 'salary' },
      createSeededRandomSource(3),
    );
    expect(offers.length).toBeGreaterThanOrEqual(2);
    const byTier = [...offers].sort((a, b) => b.clubTier - a.clubTier);
    expect(byTier[0]!.salaryPerYear).toBeGreaterThanOrEqual(
      byTier[byTier.length - 1]!.salaryPerYear,
    );
    for (const offer of offers) {
      if (offer.clubTier >= 6) {
        expect(offer.releaseClauseNote).toContain('降级');
      }
    }
  });

  it('偏好出场时间的玩家会得到出场承诺要约', () => {
    const save = asV3(strongForward);
    const offers = generateOffers(
      save,
      clubs,
      { leagueTierBias: 'low', priority: 'playing-time' },
      createSeededRandomSource(5),
    );
    expect(offers.some(({ promise }) => promise.kind === 'playing-time')).toBe(true);
  });

  it('表现不足的玩家只会得到少量低层级保底要约', () => {
    const weak = asV3({
      player: { ...createYouthSave().player, age: 17 },
      seasonStats: { appearances: 3, goals: 0, assists: 0, ratingSum: 12, ratingCount: 3 },
    });
    const offers = generateOffers(
      weak,
      clubs,
      { leagueTierBias: 'balanced', priority: 'playing-time' },
      createSeededRandomSource(9),
    );
    expect(offers.length).toBeGreaterThanOrEqual(2);
    expect(offers.every(({ clubTier }) => clubTier <= 6)).toBe(true);
    expect(offers.some(({ clubTier }) => clubTier >= 7)).toBe(false);
  });

  it('跨国吸引力只压低海外兴趣，并保留目标国家字段', () => {
    const domestic = clubs.find(({ id }) => id === 'low-club')!;
    const overseas = {
      ...domestic,
      id: 'england-low-club',
      name: '英格兰低级联赛队',
      overseas: true,
      overseasRegion: 'europe' as const,
      country: 'england' as const,
    };
    const offers = generateOffers(
      asV3(strongForward),
      [domestic, overseas],
      { leagueTierBias: 'balanced', priority: 'salary' },
      createSeededRandomSource(11),
      {
        allowFallback: false,
        interestMultiplier: (club) => (club.overseas ? 0.38 : 1),
      },
    );

    expect(offers.every(({ country }) => country === 'china')).toBe(true);
  });
});

function club(
  id: string,
  name: string,
  tier: number,
  regionId: string,
  positionalNeeds: ClubProfile['positionalNeeds'],
  youthCycle: ClubProfile['youthCycle'],
  wageBudget: number,
): ClubProfile {
  return { id, name, tier, regionId, positionalNeeds, youthCycle, wageBudget };
}
