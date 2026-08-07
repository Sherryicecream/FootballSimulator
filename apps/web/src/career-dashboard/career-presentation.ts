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
