import { describe, it, expect } from 'vitest';
import {
  generateYouthOpportunity,
  chooseYouthOpportunity,
} from '../../src/career/youth-opportunity';
import { createSeededRandomSource } from '../../src/randomness/seeded-random-source';
import type { CareerSave, RegionProfile, YouthAcademyProfile } from '@football/contracts';
import { createCalendar } from '../../src/career/calendar';

const neutralRegion: RegionProfile = {
  id: 'test-region',
  name: '测试地区',
  group: '华东',
  isKeyRegion: false,
  description: '测试用地区',
  youthFacilityLevel: 60,
  scoutingCoverage: 50,
  competitionIntensity: 50,
  trainingStyle: '均衡型',
  costOfLiving: '中',
  climate: '温和',
  footballCulture: '一般',
};

const academy = (
  id: string,
  name: string,
  regionId: string,
  pathway: YouthAcademyProfile['pathway'],
): YouthAcademyProfile => ({
  id,
  name,
  regionId,
  pathway,
  facilityLevel: 70,
  coachingLevel: 70,
  competitionLevel: 70,
  competitionIntensity: 70,
  developmentStyle: '均衡',
  firstTeamLevel: 65,
  promotionTendency: 55,
  relocationPressure: pathway === 'relocation-academy' ? 70 : 20,
});

const testAcademies: YouthAcademyProfile[] = [
  academy('local-test', '本地发展中心', 'test-region', 'local-academy'),
  academy('local-test-two', '城市青年中心', 'test-region', 'local-academy'),
  academy('local-shanghai', '浦江发展中心', 'shanghai', 'local-academy'),
  academy('local-shandong', '齐鲁发展中心', 'shandong', 'local-academy'),
  academy('local-guangdong', '南岭发展中心', 'guangdong', 'local-academy'),
  academy('local-beijing', '京华发展中心', 'beijing-tianjin', 'local-academy'),
  academy('school-test', '校园精英计划', 'test-region', 'school-elite'),
  academy('school-test-two', '校园联赛计划', 'test-region', 'school-elite'),
  academy('relocation-a', '远方新星学院', 'shandong', 'relocation-academy'),
  academy('relocation-b', '海湾青年学院', 'guangdong', 'relocation-academy'),
  academy('relocation-c', '北境竞技学院', 'dongbei', 'relocation-academy'),
];

function createMockSave(seed: number = 42): CareerSave {
  const calendar = createCalendar('2024-09-01', 2024);
  return {
    schemaVersion: 1,
    contentVersion: 'bootstrap-1',
    careerId: 'career-test',
    player: {
      identity: {
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
      },
      attributes: {
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
      },
      hiddenTraits: {
        potential: 85,
        stability: 70,
        professionalism: 75,
        pressureResistance: 65,
        adaptability: 60,
        injuryProneness: 40,
      },
      age: 16,
      careerStage: 'YOUTH',
      reputation: 20,
    },
    world: { currentDate: calendar.currentDate, season: calendar.season },
    context: { academyId: null, pendingOpportunity: null },
    relationships: { people: [], edges: [] },
    story: {
      bootstrapOpportunityWeek: 3,
      resolvedOpportunityIds: [],
      completedStoryIds: [],
      activeStorylines: [],
      cooldowns: {},
    },
    ledger: [
      {
        type: 'career-started',
        date: '2024-09-01',
        playerName: '张伟',
        age: 16,
        position: 'CENTER_BACK',
      },
    ],
    randomState: { seed, sequencePosition: 0 },
  };
}

describe('generateYouthOpportunity', () => {
  it('生成包含 2-3 个选项的机会', () => {
    const rng = createSeededRandomSource(42);
    const opportunity = generateYouthOpportunity(
      createMockSave(42),
      neutralRegion,
      testAcademies,
      rng,
      3,
    );

    expect(opportunity.week).toBe(3);
    expect(opportunity.offers.length).toBeGreaterThanOrEqual(2);
    expect(opportunity.offers.length).toBeLessThanOrEqual(3);
  });

  it('同一种子生成相同选项', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(42);

    const opp1 = generateYouthOpportunity(
      createMockSave(42),
      neutralRegion,
      testAcademies,
      rng1,
      3,
    );
    const opp2 = generateYouthOpportunity(
      createMockSave(42),
      neutralRegion,
      testAcademies,
      rng2,
      3,
    );

    expect(opp1.offers.map((o) => o.academyId)).toEqual(opp2.offers.map((o) => o.academyId));
    expect(opp1.offers.map((o) => o.pathway)).toEqual(opp2.offers.map((o) => o.pathway));
  });

  it('高青训设施地区有本地青训选项', () => {
    const highFacilityRegion: RegionProfile = {
      ...neutralRegion,
      id: 'shanghai',
      youthFacilityLevel: 85,
      scoutingCoverage: 80,
    };
    const rng = createSeededRandomSource(42);
    const opportunity = generateYouthOpportunity(
      createMockSave(42),
      highFacilityRegion,
      testAcademies,
      rng,
      3,
    );

    const pathways = opportunity.offers.map((o) => o.pathway);
    expect(pathways).toContain('local-academy');
  });

  it('低青训设施地区更可能包含 relocation 选项', () => {
    const lowFacilityRegion: RegionProfile = {
      ...neutralRegion,
      id: 'remote',
      youthFacilityLevel: 35,
      scoutingCoverage: 30,
    };
    const rng = createSeededRandomSource(42);
    const opportunity = generateYouthOpportunity(
      createMockSave(42),
      lowFacilityRegion,
      testAcademies,
      rng,
      3,
    );

    const pathways = opportunity.offers.map((o) => o.pathway);
    expect(pathways).toContain('relocation-academy');
  });

  it('所有选项有唯一的 ID', () => {
    const rng = createSeededRandomSource(42);
    const opportunity = generateYouthOpportunity(
      createMockSave(42),
      neutralRegion,
      testAcademies,
      rng,
      3,
    );

    const ids = opportunity.offers.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('不同种子生成不同选项组合', () => {
    const rng1 = createSeededRandomSource(42);
    const rng2 = createSeededRandomSource(99);

    const opp1 = generateYouthOpportunity(
      createMockSave(42),
      neutralRegion,
      testAcademies,
      rng1,
      3,
    );
    const opp2 = generateYouthOpportunity(
      createMockSave(99),
      neutralRegion,
      testAcademies,
      rng2,
      3,
    );

    // 至少有一个选项不同
    const ids1 = opp1.offers.map((o) => o.academyId).join(',');
    const ids2 = opp2.offers.map((o) => o.academyId).join(',');
    expect(ids1).not.toBe(ids2);
  });

  it('只生成原创的虚构青训机构名称', () => {
    const blockedBrands = /根宝|申花|鲁能|苏宁|恒大|富力|国安|冠城|亚泰/;
    const regions = [
      { ...neutralRegion, id: 'shanghai', youthFacilityLevel: 85 },
      { ...neutralRegion, id: 'shandong', youthFacilityLevel: 80 },
      { ...neutralRegion, id: 'guangdong', youthFacilityLevel: 78 },
      { ...neutralRegion, id: 'beijing-tianjin', youthFacilityLevel: 70 },
    ];

    for (const region of regions) {
      for (let seed = 1; seed <= 20; seed += 1) {
        const opportunity = generateYouthOpportunity(
          createMockSave(seed),
          region,
          testAcademies,
          createSeededRandomSource(seed),
          3,
        );
        for (const offer of opportunity.offers) {
          expect(offer.academyName).not.toMatch(blockedBrands);
        }
      }
    }
  });
});

describe('chooseYouthOpportunity', () => {
  it('选择选项后设置 academyId 并清除 pendingOpportunity', () => {
    const save = createMockSave(42);
    const rng = createSeededRandomSource(42);
    const opportunity = generateYouthOpportunity(save, neutralRegion, testAcademies, rng, 3);

    const saveWithOpp = {
      ...save,
      context: { ...save.context, pendingOpportunity: opportunity },
    };

    const offerId = opportunity.offers[0]!.id;
    const result = chooseYouthOpportunity(saveWithOpp, offerId);

    expect(result.context.academyId).toBe(opportunity.offers[0]!.academyId);
    expect(result.context.pendingOpportunity).toBeNull();
    expect(result.story.resolvedOpportunityIds).toContain(offerId);
  });

  it('选择后追加一条账本条目', () => {
    const save = createMockSave(42);
    const rng = createSeededRandomSource(42);
    const opportunity = generateYouthOpportunity(save, neutralRegion, testAcademies, rng, 3);

    const saveWithOpp = {
      ...save,
      context: { ...save.context, pendingOpportunity: opportunity },
    };

    const result = chooseYouthOpportunity(saveWithOpp, opportunity.offers[0]!.id);
    expect(result.ledger.length).toBe(save.ledger.length + 1);
    expect(result.ledger[result.ledger.length - 1]!.type).toBe('youth-opportunity-chosen');
  });

  it('使用不存在的选项 ID 抛出错误', () => {
    const save = createMockSave(42);
    const rng = createSeededRandomSource(42);
    const opportunity = generateYouthOpportunity(save, neutralRegion, testAcademies, rng, 3);

    const saveWithOpp = {
      ...save,
      context: { ...save.context, pendingOpportunity: opportunity },
    };

    expect(() => chooseYouthOpportunity(saveWithOpp, 'nonexistent')).toThrow();
  });

  it('没有待处理机会时抛出错误', () => {
    const save = createMockSave(42);
    expect(() => chooseYouthOpportunity(save, 'any-id')).toThrow();
  });
});
