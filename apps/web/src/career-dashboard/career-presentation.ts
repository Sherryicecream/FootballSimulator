import type { CareerLedgerEntryV2, CareerSaveV2 } from '@football/contracts';

export const ATTRIBUTE_LABELS = {
  firstTouch: '停球',
  dribbling: '盘带',
  passing: '传球',
  shooting: '射门',
  defending: '防守',
  aerialAbility: '头球',
  pace: '速度',
  strength: '力量',
  stamina: '耐力',
  agility: '灵活',
  offTheBall: '无球跑动',
  vision: '视野',
  decision: '决策',
  composure: '镇定',
  determination: '意志',
  discipline: '自律',
} as const;

export const labelAttribute = (attribute: string): string =>
  ATTRIBUTE_LABELS[attribute as keyof typeof ATTRIBUTE_LABELS] ?? '其他能力';

const BACKGROUND_LABELS: Record<string, string> = {
  academy: '青训营',
  school: '校园足球',
  community: '社区足球',
  'late-bloomer': '大器晚成',
};

const PERSONALITY_LABELS: Record<string, string> = {
  ambitious: '雄心勃勃',
  composed: '沉稳',
  disciplined: '自律',
  expressive: '张扬',
};

const FOOT_LABELS: Record<CareerSaveV2['player']['identity']['preferredFoot'], string> = {
  LEFT: '左脚',
  RIGHT: '右脚',
  BOTH: '双足',
};

const WEAK_FOOT_LABELS = ['极弱', '极弱', '较弱', '中等', '较好', '出色'] as const;

export interface PlayerProfileView {
  background: string;
  personality: string;
  preferredFoot: string;
  weakFoot: string;
  strengths: Array<{ label: string; value: number }>;
}

export const buildPlayerProfile = (player: CareerSaveV2['player']): PlayerProfileView => {
  const visibleValues = {
    ...player.attributes.technical,
    ...player.attributes.physical,
    ...player.attributes.mental,
  };
  const strengths = Object.keys(ATTRIBUTE_LABELS)
    .map((key, order) => ({
      label: labelAttribute(key),
      value: visibleValues[key as keyof typeof visibleValues],
      order,
    }))
    .sort((left, right) => right.value - left.value || left.order - right.order)
    .slice(0, 3)
    .map(({ label, value }) => ({ label, value }));
  const weakFootLevel = Math.max(1, Math.min(5, Math.round(player.identity.weakFootLevel)));

  return {
    background: BACKGROUND_LABELS[player.identity.growthBackground] ?? '其他经历',
    personality: PERSONALITY_LABELS[player.identity.personalityTendency] ?? '尚待观察',
    preferredFoot: FOOT_LABELS[player.identity.preferredFoot] ?? '尚待观察',
    weakFoot: WEAK_FOOT_LABELS[weakFootLevel] ?? '尚待观察',
    strengths,
  };
};

export interface RecentRecord {
  monthKey: string;
  lines: string[];
}

type RecordProjection = Pick<CareerSaveV2, 'season' | 'ledger'>;

export const buildRecentRecords = (save: RecordProjection, limit = 3): RecentRecord[] => {
  const factsByMonth = new Map<string, CareerLedgerEntryV2[]>();

  for (const fact of save.ledger) {
    const monthKey = weekKeyToMonth(save.season.startDate, fact.weekKey);
    const facts = factsByMonth.get(monthKey) ?? [];
    facts.push(fact);
    factsByMonth.set(monthKey, facts);
  }

  return [...factsByMonth.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, Math.max(0, limit))
    .map(([monthKey, facts]) => ({ monthKey, lines: summarizeFacts(facts) }))
    .filter(({ lines }) => lines.length > 0);
};

const weekKeyToMonth = (startDate: string, weekKey: string): string => {
  const match = /-W(\d{1,2})$/.exec(weekKey);
  const weekNumber = match ? Number(match[1]) : 1;
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (Math.max(1, weekNumber) - 1) * 7);
  return date.toISOString().slice(0, 7);
};

const summarizeFacts = (facts: CareerLedgerEntryV2[]): string[] => {
  const count = (type: CareerLedgerEntryV2['type']) =>
    facts.filter((fact) => fact.type === type).length;
  const matchCount = count('match');
  const trainingCount = count('training');
  const settlementCount = count('monthly-settlement');
  const healthCount = count('health');
  const firstTeamCount = count('first-team');
  const eventCount = count('event');
  const decisionCount = count('decision');
  const relationshipCount = count('relationship');
  const lines: string[] = [];

  if (matchCount > 0) lines.push(`本月参加 ${matchCount} 场比赛。`);
  if (trainingCount + settlementCount > 0) lines.push('本月持续完成训练与能力积累。');
  if (healthCount > 0) lines.push('本月出现健康状态变化，恢复情况需要关注。');
  if (firstTeamCount > 0) lines.push('本月获得一线队相关关注与机会。');
  const offFieldCount = eventCount + relationshipCount;
  if (offFieldCount > 0 || decisionCount > 0) {
    lines.push(`本月经历 ${offFieldCount} 次重要事件，并完成 ${decisionCount} 次关键选择。`);
  }

  return lines;
};
