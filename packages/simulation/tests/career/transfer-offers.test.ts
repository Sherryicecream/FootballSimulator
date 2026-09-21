import { describe, expect, it } from 'vitest';
import { CareerSaveV5Schema, type ClubProfile, type YouthContentBundle } from '@football/contracts';
import { createSeededRandomSource } from '../../src/randomness';
import { generateProfessionalMarketOffers, selectOverseasMarketRepresentatives } from '../../src';
import { createProSave } from '../fixtures/pro-save';

const content: YouthContentBundle = {
  academies: [],
  competitions: [],
  people: [],
  events: [],
  clubs: [
    club('current-club', '当前俱乐部', 5, false),
    club('domestic-low', '低级联赛队', 3, false),
    club('domestic-mid', '中游联赛队', 4, false),
    club('domestic-high', '高位联赛队', 6, false),
    club('domestic-top', '顶级联赛队', 7, false),
  ],
  overseasClubs: [
    club('overseas-mid', '海外中游队', 4, true),
    club('overseas-high', '海外高位队', 6, true),
  ],
  agents: [],
};

const saveWithContract = buildSave();
const highAbilitySave = buildSave('high');
const lowAbilitySave = buildSave('low');
const lowAdaptabilitySave = buildSave('high', 40);

describe('generateProfessionalMarketOffers', () => {
  it('同一存档、市场类型和种子生成完全相同报价', () => {
    const first = generateProfessionalMarketOffers(
      saveWithContract,
      content,
      createSeededRandomSource(77),
      'loan',
    );
    const second = generateProfessionalMarketOffers(
      saveWithContract,
      content,
      createSeededRandomSource(77),
      'loan',
    );

    expect(second).toEqual(first);
  });

  it('租借报价固定一年且排除当前合同俱乐部', () => {
    const offers = generateProfessionalMarketOffers(
      saveWithContract,
      content,
      createSeededRandomSource(11),
      'loan',
    );

    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((offer) => offer.offerKind === 'loan')).toBe(true);
    expect(offers.every((offer) => offer.contractYears === 1)).toBe(true);
    expect(offers.every((offer) => offer.clubId !== saveWithContract.contract!.clubId)).toBe(true);
  });

  it('能力天花板保持单调，适应力不足时没有海外报价', () => {
    const high = generateProfessionalMarketOffers(
      highAbilitySave,
      content,
      createSeededRandomSource(3),
      'permanent',
    );
    const low = generateProfessionalMarketOffers(
      lowAbilitySave,
      content,
      createSeededRandomSource(3),
      'permanent',
    );

    expect(Math.max(...high.map((offer) => offer.clubTier), 0)).toBeGreaterThanOrEqual(
      Math.max(...low.map((offer) => offer.clubTier), 0),
    );
    expect(
      generateProfessionalMarketOffers(
        lowAdaptabilitySave,
        content,
        createSeededRandomSource(3),
        'permanent',
      ).every((offer) => !offer.overseas),
    ).toBe(true);
  });

  it('海外俱乐部扩容后按国别抽取固定代表，避免市场概率随内容数量膨胀', () => {
    const countries = ['england', 'spain', 'germany', 'italy', 'france', 'japan', 'korea'] as const;
    const expanded = countries.flatMap((country) =>
      Array.from({ length: 24 }, (_, index) => ({
        ...club('expanded-' + country + '-' + index, country + '-' + index, 5 + (index % 2), true),
        country,
      })),
    );

    const representatives = selectOverseasMarketRepresentatives(expanded, 3);

    expect(representatives).toHaveLength(21);
    expect(
      Object.fromEntries(
        countries.map((country) => [
          country,
          representatives.filter((club) => club.country === country).length,
        ]),
      ),
    ).toEqual(Object.fromEntries(countries.map((country) => [country, 3])));
    expect(representatives.filter((club) => club.tier === 5)).toHaveLength(14);
    expect(representatives.filter((club) => club.tier === 6)).toHaveLength(7);
  });

  it('跨多个固定市场种子轮换海外国家曝光，不让亚洲高吸引力吞掉欧洲候选', () => {
    const countries = ['england', 'spain', 'germany', 'italy', 'france', 'japan', 'korea'] as const;
    const expandedContent: YouthContentBundle = {
      ...content,
      overseasClubs: countries.map((country) => ({
        ...club('market-' + country, country + '-market', 5, true),
        country,
      })),
    };
    const exposedCountries = new Set<string>();

    for (let seed = 1; seed <= 70; seed += 1) {
      const save = CareerSaveV5Schema.parse({
        ...highAbilitySave,
        randomState: { ...highAbilitySave.randomState, seed },
      });
      const offers = generateProfessionalMarketOffers(
        save,
        expandedContent,
        createSeededRandomSource(seed),
        'permanent',
      );
      for (const offer of offers) {
        if (offer.overseas && offer.country) exposedCountries.add(offer.country);
      }
    }

    expect([...exposedCountries]).toEqual(expect.arrayContaining(['spain', 'germany', 'france']));
  });
});

function buildSave(abilityLevel: 'high' | 'low' | 'default' = 'default', adaptability = 60) {
  const source = createProSave();
  const save = CareerSaveV5Schema.parse({
    ...source,
    schemaVersion: 5,
    careerPhase: 'pro-offseason',
    proPhase: 'settled',
    proSeason: { ...source.proSeason!, completed: true },
    contract: { ...source.contract!, clubId: 'current-club', clubName: '当前俱乐部' },
  });

  if (abilityLevel === 'default') return save;

  const value = abilityLevel === 'high' ? 85 : 30;
  return CareerSaveV5Schema.parse({
    ...save,
    player: {
      ...save.player,
      attributes: {
        technical: {
          firstTouch: value,
          dribbling: value,
          passing: value,
          shooting: value,
          defending: value,
          aerialAbility: value,
        },
        physical: { pace: value, strength: value, stamina: value, agility: value },
        mental: {
          offTheBall: value,
          vision: value,
          decision: value,
          composure: value,
          determination: value,
          discipline: value,
        },
      },
      development: { ...save.player.development, adaptability },
    },
  });
}

function club(id: string, name: string, tier: number, overseas: boolean): ClubProfile {
  return {
    id,
    name,
    tier,
    regionId: 'test',
    positionalNeeds: ['FORWARD'],
    youthCycle: 'rebuilding',
    overseas,
    wageBudget: 80,
  };
}
