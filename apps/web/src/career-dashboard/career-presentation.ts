import type {
  CareerLedgerEntryV2,
  CareerSaveV2,
  MonthlyBeat,
  YouthEventTheme,
} from '@football/contracts';
import type { SceneKind } from '../design-system/scene-types';
import type { StatusBadgeTone } from '../design-system/StatusBadge';

const BEAT_INTENSITY_PRIORITY: Record<MonthlyBeat['intensity'], number> = {
  routine: 1,
  notable: 2,
  'turning-point': 3,
};

export const pickLeadBeat = (beats: readonly MonthlyBeat[]): MonthlyBeat | null => {
  let lead: MonthlyBeat | null = null;
  for (const beat of beats) {
    if (
      lead === null ||
      BEAT_INTENSITY_PRIORITY[beat.intensity] > BEAT_INTENSITY_PRIORITY[lead.intensity]
    ) {
      lead = beat;
    }
  }
  return lead;
};

export const statusToneForScore = (score: number, inverted = false): StatusBadgeTone => {
  const effectiveScore = inverted ? 100 - score : score;
  if (effectiveScore >= 70) return 'positive';
  if (effectiveScore >= 45) return 'neutral';
  if (effectiveScore >= 25) return 'caution';
  return 'danger';
};

export const sceneKindForBeat = (kind: MonthlyBeat['kind']): SceneKind => {
  switch (kind) {
    case 'training':
      return 'training';
    case 'match':
    case 'first-team':
      return 'match';
    case 'health':
      return 'recovery';
    case 'decision':
    case 'event':
    case 'relationship':
      return 'locker-room';
    case 'settlement':
      return 'neutral';
  }
};

export const sceneKindForTheme = (theme: YouthEventTheme | undefined): SceneKind => {
  switch (theme) {
    case 'match':
    case 'trajectory':
      return 'match';
    case 'training':
      return 'training';
    case 'health':
      return 'recovery';
    case 'relationships':
    case 'off-pitch':
      return 'locker-room';
    default:
      return 'neutral';
  }
};

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
};

/** 成长背景中属于隐藏设定（如成长节奏）的值：不在档案中展示。 */
const HIDDEN_BACKGROUNDS = new Set(['late-bloomer']);

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
  /** 隐藏型背景（如 late-bloomer）返回 null，档案不渲染该行。 */
  background: string | null;
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
    background: HIDDEN_BACKGROUNDS.has(player.identity.growthBackground)
      ? null
      : (BACKGROUND_LABELS[player.identity.growthBackground] ?? '其他经历'),
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

interface HighlightCandidate {
  line: string;
  priority: number;
  order: number;
}

const FIRST_TEAM_STAGE_LABELS: Record<string, string> = {
  watchlist: '进入一线队观察名单。',
  'training-invite': '获得一线队跟训机会。',
  'bench-list': '进入一线队比赛名单。',
  'substitute-appearance': '完成一线队替补出场。',
  'starting-appearance': '获得一线队首发机会。',
};

const summarizeFacts = (facts: CareerLedgerEntryV2[]): string[] => {
  const candidates = facts.flatMap((fact, order) => formatHighlight(fact, order));
  const matchCount = facts.filter(({ type }) => type === 'match').length;
  const trainingCount = facts.filter(({ type }) => type === 'training').length;

  if (
    matchCount > 0 &&
    !candidates.some(({ line }) => line.includes('比赛') || line.includes('爆冷'))
  ) {
    candidates.push({ line: `本月参加 ${matchCount} 场比赛。`, priority: 50, order: facts.length });
  }
  if (trainingCount > 0) {
    candidates.push({
      line: '本月按计划完成日常训练。',
      priority: 20,
      order: facts.length + 1,
    });
  }

  const seen = new Set<string>();
  return candidates
    .sort((left, right) => right.priority - left.priority || left.order - right.order)
    .filter(({ line }) => {
      const normalized = line.replace(/[\s，。！？]/g, '');
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, 3)
    .map(({ line }) => limitHighlight(line));
};

const formatHighlight = (fact: CareerLedgerEntryV2, order: number): HighlightCandidate[] => {
  const candidate = (line: string, priority: number): HighlightCandidate[] => [
    { line, priority, order },
  ];
  switch (fact.type) {
    case 'decision': {
      const titled = parseTitledSummary(fact.summary);
      return candidate(
        titled ? `在${titled.title}中，你选择${titled.detail}。` : '本月完成了一次关键选择。',
        titled ? 100 : 75,
      );
    }
    case 'first-team': {
      const stage = /推进至\s+([\w-]+)/.exec(fact.summary)?.[1];
      return candidate(
        (stage && FIRST_TEAM_STAGE_LABELS[stage]) ?? '获得一线队相关关注与机会。',
        90,
      );
    }
    case 'health': {
      const injury = /^(.+?)(轻伤|中伤|重伤)，预计恢复\s*(\d+)\s*周/.exec(fact.summary);
      return candidate(
        injury
          ? `${injury[1]}出现${injury[2]}，预计恢复 ${injury[3]} 周。`
          : '健康状态出现变化，需要关注恢复。',
        80,
      );
    }
    case 'match':
      if (/突出表现|爆冷/.test(fact.summary)) {
        return candidate(
          fact.summary.includes('爆冷') ? '本月随队完成了一场爆冷胜利。' : '本月比赛中有突出表现。',
          70,
        );
      }
      return [];
    case 'event': {
      const titled = parseTitledSummary(fact.summary);
      return candidate(
        titled ? `${titled.title}：${titled.detail}。` : '本月经历了一次场外变化。',
        titled ? 65 : 30,
      );
    }
    case 'monthly-settlement':
      return candidate('本月完成成长结算。', 40);
    case 'relationship':
      return candidate('与身边人的相处出现了新变化。', 35);
    case 'season-outcome':
      return candidate('本阶段青训生涯迎来赛季结论。', 95);
    default:
      return [];
  }
};

const parseTitledSummary = (summary: string): { title: string; detail: string } | null => {
  const match = /^\[([^\]]{1,30})\]\s*(.{1,60})$/.exec(summary.trim());
  if (!match?.[1] || !match[2]) return null;
  return { title: cleanText(match[1]), detail: cleanText(match[2]) };
};

const cleanText = (text: string): string =>
  text
    .replace(/[\[\]/]/g, ' ')
    .replace(
      /\b(?:decision|event|person|relationship|trust|respect|closeness|technical|physical|intense|normal)-?[\w-]*\b/gi,
      '',
    )
    .replace(/\s+/g, ' ')
    .replace(/[。！？]+$/g, '')
    .trim();

const limitHighlight = (line: string): string => {
  const clean = cleanText(line);
  const limited = clean.slice(0, 79);
  return `${limited.replace(/[，、：；]$/g, '')}。`;
};
