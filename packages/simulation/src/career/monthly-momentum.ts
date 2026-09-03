import type { CareerLedgerEntryV2, MonthlyMomentum } from '@football/contracts';

type AttributeChange = { attribute: string; oldValue: number; newValue: number };
type MonthlyBeat = MonthlyMomentum['beats'][number];

const KIND_PRIORITY: Record<MonthlyBeat['kind'], number> = {
  decision: 100,
  health: 90,
  'first-team': 88,
  relationship: 82,
  event: 78,
  match: 70,
  settlement: 24,
  training: 10,
};

const KIND_LABELS: Record<MonthlyBeat['kind'], string> = {
  training: '训练节奏',
  match: '比赛日',
  decision: '关键选择',
  event: '场外插曲',
  health: '健康警报',
  relationship: '关系变化',
  'first-team': '一线队信号',
  settlement: '月末结算',
};

export const buildMonthlyMomentum = (
  facts: readonly CareerLedgerEntryV2[],
  attributeChanges: readonly AttributeChange[],
): MonthlyMomentum => {
  const beats = [...groupFactsByWeek(facts).entries()]
    .sort(([left], [right]) => compareWeekKeys(left, right))
    .map(([weekKey, weekFacts]) => buildBeat(weekKey, weekFacts));
  const visibleBeats = beats.slice(-5);
  const highlight = beats.reduce<MonthlyBeat | null>(
    (best, beat) => (!best || KIND_PRIORITY[beat.kind] > KIND_PRIORITY[best.kind] ? beat : best),
    null,
  );
  const anchor: MonthlyBeat =
    highlight ??
    ({
      weekKey: '',
      kind: 'training',
      title: '训练节奏',
      detail: '本月没有留下特别突出的转折，但稳定的训练同样构成了成长。',
      intensity: 'routine',
    } satisfies MonthlyBeat);

  return {
    tone: toneFor(anchor.kind, attributeChanges),
    title: headlineFor(anchor),
    summary: summaryFor(anchor, beats.length, attributeChanges),
    nextFocus: nextFocusFor(anchor),
    beats: visibleBeats,
  };
};

const groupFactsByWeek = (facts: readonly CareerLedgerEntryV2[]) => {
  const grouped = new Map<string, CareerLedgerEntryV2[]>();
  for (const fact of facts) {
    const weekFacts = grouped.get(fact.weekKey) ?? [];
    weekFacts.push(fact);
    grouped.set(fact.weekKey, weekFacts);
  }
  return grouped;
};

const compareWeekKeys = (left: string, right: string): number => {
  const leftNumber = Number(/-W(\d+)$/.exec(left)?.[1] ?? 0);
  const rightNumber = Number(/-W(\d+)$/.exec(right)?.[1] ?? 0);
  return leftNumber - rightNumber || left.localeCompare(right);
};

const buildBeat = (weekKey: string, facts: readonly CareerLedgerEntryV2[]): MonthlyBeat => {
  const fact = [...facts].sort((left, right) => factPriority(right) - factPriority(left))[0]!;
  const kind =
    fact.type === 'pro-match'
      ? 'match'
      : fact.type === 'monthly-settlement'
        ? 'settlement'
        : fact.type;
  const normalizedKind = isBeatKind(kind) ? kind : 'event';
  return {
    weekKey,
    kind: normalizedKind,
    title: KIND_LABELS[normalizedKind],
    detail: describeFact(fact, normalizedKind),
    intensity: intensityFor(normalizedKind),
  };
};

const factPriority = (fact: CareerLedgerEntryV2): number => {
  if (fact.type === 'decision') return KIND_PRIORITY.decision;
  if (fact.type === 'health') return KIND_PRIORITY.health;
  if (fact.type === 'first-team') return KIND_PRIORITY['first-team'];
  if (fact.type === 'relationship') return KIND_PRIORITY.relationship;
  if (fact.type === 'event') return KIND_PRIORITY.event;
  if (fact.type === 'match' || fact.type === 'pro-match') return KIND_PRIORITY.match;
  if (fact.type === 'monthly-settlement') return KIND_PRIORITY.settlement;
  return KIND_PRIORITY.training;
};

const isBeatKind = (kind: string): kind is MonthlyBeat['kind'] => kind in KIND_LABELS;

const describeFact = (fact: CareerLedgerEntryV2, kind: MonthlyBeat['kind']): string => {
  const titled = /^\[([^\]]+)\]\s*(.+)$/.exec(fact.summary);
  if (kind === 'decision' && titled) return `${titled[1]}：你选择了${titled[2]}`;
  if (kind === 'training') return `完成${fact.summary}的训练安排。`;
  if (kind === 'settlement') return fact.summary.replace(/^月末成长结算：?/, '成长结算：');
  return fact.summary;
};

const intensityFor = (kind: MonthlyBeat['kind']): MonthlyBeat['intensity'] => {
  if (kind === 'decision' || kind === 'health' || kind === 'first-team') {
    return 'turning-point';
  }
  if (kind === 'match' || kind === 'event' || kind === 'relationship') return 'notable';
  return 'routine';
};

const toneFor = (
  kind: MonthlyBeat['kind'],
  attributeChanges: readonly AttributeChange[],
): MonthlyMomentum['tone'] => {
  if (kind === 'health') return 'warning';
  if (kind === 'decision' || kind === 'first-team' || kind === 'relationship') {
    return 'turning-point';
  }
  return attributeChanges.length > 0 || kind === 'match' ? 'progress' : 'steady';
};

const headlineFor = (beat: MonthlyBeat): string => {
  if (beat.kind === 'decision') return `${beat.title}：${beat.detail.split('：')[0]}`;
  if (beat.kind === 'health') return `身体状态需要回应：${beat.detail.slice(0, 32)}`;
  if (beat.kind === 'first-team') return '一线队的目光更近了一步';
  if (beat.kind === 'match') return '比赛给出了本月最直接的答案';
  return `${beat.title}：${beat.detail.slice(0, 36)}`;
};

const summaryFor = (
  beat: MonthlyBeat,
  beatCount: number,
  attributeChanges: readonly AttributeChange[],
): string => {
  const growth =
    attributeChanges.length > 0 ? `，并完成了 ${attributeChanges.length} 项成长结算` : '';
  return `本月经历 ${beatCount} 个周度节点。${beat.detail}${growth}。`;
};

const nextFocusFor = (beat: MonthlyBeat): string => {
  if (beat.kind === 'decision') {
    return `后续影响正在发酵：继续观察${beat.detail.split('：')[0]}在训练和比赛中的回应。`;
  }
  if (beat.kind === 'health') return '下个月先把恢复和负荷管理放在首位，再决定是否提高训练强度。';
  if (beat.kind === 'first-team') return '一线队机会正在靠近，保持训练质量比短期冒险更重要。';
  if (beat.kind === 'match')
    return '把比赛中的亮点或失误带回下一次训练，争取让偶然表现变成稳定能力。';
  if (beat.kind === 'relationship')
    return '关系的变化需要下一次真实配合来验证，别让一次谈话停在场外。';
  return '维持当前节奏，等待下一个能改变位置、关系或比赛机会的节点。';
};
