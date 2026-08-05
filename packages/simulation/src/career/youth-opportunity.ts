import type { CareerSave, YouthOpportunity, YouthOffer, RegionProfile } from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import { createSeededRandomSource } from '../randomness';
import { generateCoach, generateTeammates } from '../relationships/initial-people';

/**
 * 青训学院数据
 */
interface AcademyDefinition {
  id: string;
  name: string;
  pathway: 'local-academy' | 'school-elite' | 'relocation-academy';
  regionId: string;
  minFacilityLevel: number;
}

/**
 * 中国青训学院池（按地区分类）
 */
const ACADEMIES: AcademyDefinition[] = [
  // 华东地区
  {
    id: 'shanghai-pujiang',
    name: '浦江青训中心',
    pathway: 'local-academy',
    regionId: 'shanghai',
    minFacilityLevel: 70,
  },
  {
    id: 'shanghai-shencheng',
    name: '申城竞技青年队',
    pathway: 'local-academy',
    regionId: 'shanghai',
    minFacilityLevel: 70,
  },
  {
    id: 'shandong-qilu',
    name: '齐鲁青训学院',
    pathway: 'local-academy',
    regionId: 'shandong',
    minFacilityLevel: 65,
  },
  {
    id: 'jiangsu-jiangnan',
    name: '江南青年训练营',
    pathway: 'local-academy',
    regionId: 'jiangsu-zhejiang',
    minFacilityLevel: 50,
  },
  // 华南地区
  {
    id: 'guangdong-nanling',
    name: '南岭足球学院',
    pathway: 'local-academy',
    regionId: 'guangdong',
    minFacilityLevel: 65,
  },
  {
    id: 'guangdong-yangcheng',
    name: '羊城联合青训营',
    pathway: 'local-academy',
    regionId: 'guangdong',
    minFacilityLevel: 60,
  },
  // 华北地区
  {
    id: 'beijing-jinghua',
    name: '京华青年训练营',
    pathway: 'local-academy',
    regionId: 'beijing-tianjin',
    minFacilityLevel: 55,
  },
  // 西南地区
  {
    id: 'sichuan-bashu',
    name: '巴蜀青年队',
    pathway: 'local-academy',
    regionId: 'sichuan-chongqing',
    minFacilityLevel: 50,
  },
  // 东北地区
  {
    id: 'dongbei-beijing',
    name: '北境青训基地',
    pathway: 'local-academy',
    regionId: 'dongbei',
    minFacilityLevel: 55,
  },
  // 全国性校园精英计划
  {
    id: '校园-上海',
    name: '上海校园精英计划',
    pathway: 'school-elite',
    regionId: 'shanghai',
    minFacilityLevel: 0,
  },
  {
    id: '校园-北京',
    name: '北京校园足球计划',
    pathway: 'school-elite',
    regionId: 'beijing-tianjin',
    minFacilityLevel: 0,
  },
  {
    id: '校园-全国',
    name: '全国校园足球选拔营',
    pathway: 'school-elite',
    regionId: '*',
    minFacilityLevel: 0,
  },
  // 外地青训（relocation）
  {
    id: 'relocation-qilu',
    name: '齐鲁新星足校（外地）',
    pathway: 'relocation-academy',
    regionId: '*',
    minFacilityLevel: 0,
  },
  {
    id: 'relocation-nanling',
    name: '南岭精英学院（外地）',
    pathway: 'relocation-academy',
    regionId: '*',
    minFacilityLevel: 0,
  },
  {
    id: 'relocation-pujiang',
    name: '浦江青年基地（外地）',
    pathway: 'relocation-academy',
    regionId: '*',
    minFacilityLevel: 0,
  },
];

/**
 * 根据地区和设施水平生成青年机会选项
 */
export function generateYouthOpportunity(
  _save: CareerSave,
  region: RegionProfile,
  rng: SeededRandomSource,
  week: number,
): YouthOpportunity {
  // 根据地区设施水平筛选可用的本地学院
  const localAcademies = ACADEMIES.filter(
    (a) =>
      a.pathway === 'local-academy' &&
      (a.regionId === region.id || a.regionId === '*') &&
      region.youthFacilityLevel >= a.minFacilityLevel,
  );

  // 校园精英计划（总是可用）
  const schoolAcademies = ACADEMIES.filter(
    (a) => a.pathway === 'school-elite' && (a.regionId === region.id || a.regionId === '*'),
  );

  // 外地青训（relocation cost 影响权重）
  const relocationAcademies = ACADEMIES.filter((a) => a.pathway === 'relocation-academy');

  const offers: YouthOffer[] = [];

  // 添加本地青训选项（如果有）
  if (localAcademies.length > 0) {
    const selected = rng.pick(localAcademies);
    const riskLabel =
      region.youthFacilityLevel >= 70 ? 'low' : region.youthFacilityLevel >= 50 ? 'medium' : 'high';
    offers.push({
      id: `offer-${selected.id}`,
      academyId: selected.id,
      academyName: selected.name,
      pathway: 'local-academy',
      riskLabel,
      description: `加入${selected.name}，留在熟悉的训练环境中发展。`,
    });
  }

  // 添加校园精英选项
  if (schoolAcademies.length > 0) {
    const selected = rng.pick(schoolAcademies);
    offers.push({
      id: `offer-${selected.id}`,
      academyId: selected.id,
      academyName: selected.name,
      pathway: 'school-elite',
      riskLabel: 'medium',
      description: `通过${selected.name}进入职业足球体系，兼顾学业与足球。`,
    });
  }

  // 添加外地青训选项（低设施水平地区更可能包含）
  const relocationChance = region.youthFacilityLevel < 50 ? 0.9 : 0.5;
  if (relocationAcademies.length > 0 && rng.next() < relocationChance) {
    const selected = rng.pick(relocationAcademies);
    offers.push({
      id: `offer-${selected.id}`,
      academyId: selected.id,
      academyName: selected.name,
      pathway: 'relocation-academy',
      riskLabel: 'high',
      description: `前往${selected.name}，离开家乡接受更高水平的训练。`,
    });
  }

  // 确保至少有 2 个选项
  while (offers.length < 2) {
    const fallback = relocationAcademies[rng.nextInt(0, relocationAcademies.length - 1)]!;
    offers.push({
      id: `offer-${fallback.id}-alt`,
      academyId: fallback.id,
      academyName: fallback.name,
      pathway: 'relocation-academy',
      riskLabel: 'high',
      description: `前往${fallback.name}，接受全新的训练环境挑战。`,
    });
  }

  return { week, offers };
}

/**
 * 选择青年机会选项
 * 验证选项存在后更新存档状态
 */
export function chooseYouthOpportunity(save: CareerSave, offerId: string): CareerSave {
  if (!save.context.pendingOpportunity) {
    throw new Error('当前没有待处理的青年机会');
  }

  const offer = save.context.pendingOpportunity.offers.find((o) => o.id === offerId);
  if (!offer) {
    throw new Error(`无效的选项 ID: ${offerId}`);
  }

  // Generate initial people (coach + teammates) from seeded RNG
  const peopleRng = createSeededRandomSource(save.randomState.seed + 1000);
  const coach = generateCoach(peopleRng);
  const teammates = generateTeammates(save.player.identity.primaryPosition, peopleRng);

  return {
    ...save,
    context: {
      academyId: offer.academyId,
      pendingOpportunity: null,
      playerState: save.context.playerState,
      pendingEvent: null,
    },
    story: {
      ...save.story,
      resolvedOpportunityIds: [...save.story.resolvedOpportunityIds, offerId],
    },
    relationships: {
      persons: [coach, ...teammates],
      activeRelations: [
        { personId: coach.id, relationType: 'coach', sinceSeason: save.world.season },
        { personId: teammates[0]!.id, relationType: 'teammate', sinceSeason: save.world.season },
        { personId: teammates[1]!.id, relationType: 'teammate', sinceSeason: save.world.season },
      ],
    },
    ledger: [
      ...save.ledger,
      {
        type: 'youth-opportunity-chosen',
        date: save.world.currentDate,
        week: save.context.pendingOpportunity.week,
        offerId: offer.id,
        academyId: offer.academyId,
        academyName: offer.academyName,
      },
    ],
  };
}
