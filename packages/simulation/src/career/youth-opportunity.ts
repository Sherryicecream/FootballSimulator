import type {
  CareerSave,
  YouthOpportunity,
  YouthOffer,
  RegionProfile,
  YouthAcademyProfile,
} from '@football/contracts';
import type { SeededRandomSource } from '../randomness/seeded-random-source';
import { createSeededRandomSource } from '../randomness';
import { generateCoach, generateTeammates } from '../relationships/initial-people';

/**
 * 根据地区和设施水平生成青年机会选项
 */
export function generateYouthOpportunity(
  _save: CareerSave,
  region: RegionProfile,
  academies: YouthAcademyProfile[],
  rng: SeededRandomSource,
  week: number,
): YouthOpportunity {
  if (academies.length === 0) {
    throw new Error('青训机构内容为空');
  }

  // 根据地区设施水平筛选可用的本地学院
  const localAcademies = academies.filter(
    (academy) => academy.pathway === 'local-academy' && academy.regionId === region.id,
  );

  // 校园精英计划（总是可用）
  const schoolAcademies = academies.filter(
    (academy) => academy.pathway === 'school-elite' && academy.regionId === region.id,
  );

  // 外地青训（relocation cost 影响权重）
  const relocationAcademies = academies.filter(
    (academy) => academy.pathway === 'relocation-academy' && academy.regionId !== region.id,
  );

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
  while (offers.length < 2 && relocationAcademies.length > 0) {
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

  if (offers.length < 2) {
    throw new Error(`地区 ${region.id} 没有足够的青训路径`);
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
      trainingFocus: null,
      trainingIntensity: 'normal' as const,
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
