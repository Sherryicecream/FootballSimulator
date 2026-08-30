import {
  YouthContentBundleSchema,
  type EventDefinition,
  type YouthContentBundle,
} from '@football/contracts';
import { getAllRegions } from '../regions';

const allowedEffectKeys = new Set([
  'fitness',
  'fatigue',
  'morale',
  'coachTrust',
  'confidence',
  'form',
  'firstTouch',
  'dribbling',
  'passing',
  'shooting',
  'defending',
  'aerialAbility',
  'pace',
  'strength',
  'stamina',
  'agility',
  'offTheBall',
  'vision',
  'decision',
  'composure',
  'determination',
  'discipline',
  'trust',
  'respect',
  'closeness',
]);

const realClubBrands = [
  '皇家马德里',
  '巴塞罗那',
  '曼联',
  '曼城',
  '拜仁',
  '尤文图斯',
  'real madrid',
  'barcelona',
  'manchester united',
];

export const validateYouthContent = (raw: YouthContentBundle): YouthContentBundle => {
  const content = YouthContentBundleSchema.parse(raw);
  assertUniqueIds(
    '青训机构',
    content.academies.map(({ id }) => id),
  );
  assertUniqueIds(
    '赛事',
    content.competitions.map(({ id }) => id),
  );
  assertUniqueIds(
    '人物原型',
    content.people.map(({ id }) => id),
  );
  assertUniqueIds(
    '事件',
    content.events.map(({ id }) => id),
  );

  const regionIds = new Set(getAllRegions().map(({ id }) => id));
  const academyIds = new Set(content.academies.map(({ id }) => id));
  for (const academy of content.academies) {
    if (!regionIds.has(academy.regionId)) {
      throw new Error(`未知地区：${academy.regionId}`);
    }
    assertNoRealClubBrand(academy.name);
    assertNoReplacementChar(academy.name);
  }

  // 事件文案必须可读：拒绝编码损坏产生的 U+FFFD 替换符。
  for (const event of content.events) {
    assertNoReplacementChar(event.title);
    assertNoReplacementChar(event.description);
    for (const choice of event.choices) {
      assertNoReplacementChar(choice.text);
    }
  }

  const competitionByAcademy = new Map<string, string>();
  for (const competition of content.competitions) {
    if (competition.targetFixtureCount.min > competition.targetFixtureCount.max) {
      throw new Error(`赛事场次数量范围无效：${competition.id}`);
    }
    assertUniqueIds(`赛事 ${competition.id} 的机构`, competition.participatingAcademyIds);
    for (const academyId of competition.participatingAcademyIds) {
      if (!academyIds.has(academyId)) {
        throw new Error(`未知青训机构：${academyId}`);
      }
      if (competitionByAcademy.has(academyId)) {
        throw new Error(`赛程冲突：${academyId}`);
      }
      competitionByAcademy.set(academyId, competition.id);
    }
    assertNoRealClubBrand(competition.name);
  }

  for (const archetype of content.people) {
    for (const [trait, range] of Object.entries(archetype.traitRanges)) {
      if (range.min > range.max) {
        throw new Error(`人物原型范围无效：${archetype.id}.${trait}`);
      }
    }
  }

  assertUniqueIds(
    '俱乐部',
    content.clubs.map(({ id }) => id),
  );
  assertUniqueIds(
    '经纪人',
    content.agents.map(({ id }) => id),
  );
  for (const club of content.clubs) {
    if (!regionIds.has(club.regionId)) {
      throw new Error(`未知地区：${club.regionId}`);
    }
    assertNoRealClubBrand(club.name);
    if (new Set(club.positionalNeeds).size !== club.positionalNeeds.length) {
      throw new Error(`俱乐部位置需求重复：${club.id}`);
    }
  }

  // 每个层级 ≥8 家俱乐部，保证同层联赛规模
  for (let tier = 3; tier <= 8; tier += 1) {
    const count = content.clubs.filter(({ tier: clubTierValue }) => clubTierValue === tier).length;
    if (count < 8) {
      throw new Error(`层级 ${tier} 的俱乐部不足 8 家：${count}`);
    }
  }

  for (const agent of content.agents) {
    if (agent.focusTierMin > agent.focusTierMax) {
      throw new Error(`经纪人层级区间无效：${agent.id}`);
    }
  }

  validateEvents(content.events);
  return content;
};

const validateEvents = (events: EventDefinition[]): void => {
  const eventIds = new Set(events.map(({ id }) => id));
  for (const event of events) {
    if (event.interaction === 'automatic' && event.choices.length !== 1) {
      throw new Error(`自动事件只能有一个选项：${event.id}`);
    }
    if ((event.rarity === 'rare' || event.rarity === 'legendary') && isEmpty(event.condition)) {
      throw new Error(`重大事件必须有条件：${event.id}`);
    }
    for (const choice of event.choices) {
      for (const effectKey of [
        ...Object.keys(choice.effects),
        ...Object.keys(choice.delayEffects ?? {}),
      ]) {
        if (!allowedEffectKeys.has(effectKey)) {
          throw new Error(`未知事件效果：${event.id}.${effectKey}`);
        }
      }
    }
    for (const nextEventId of event.nextEvents ?? []) {
      if (!eventIds.has(nextEventId)) {
        throw new Error(`断裂故事链：${event.id} -> ${nextEventId}`);
      }
    }
    assertNoRealClubBrand(`${event.title} ${event.description}`);
  }
};

const assertUniqueIds = (label: string, ids: string[]): void => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`${label}存在重复 ID：${id}`);
    }
    seen.add(id);
  }
};

const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

const assertNoReplacementChar = (text: string): void => {
  if (text.includes(REPLACEMENT_CHAR)) {
    throw new Error(`文案包含损坏的替换字符：${text.slice(0, 30)}`);
  }
};

const assertNoRealClubBrand = (text: string): void => {
  const normalized = text.toLowerCase();
  const brand = realClubBrands.find((candidate) => normalized.includes(candidate));
  if (brand) {
    throw new Error(`检测到真实俱乐部品牌：${brand}`);
  }
};

const isEmpty = (value: object): boolean => Object.keys(value).length === 0;
