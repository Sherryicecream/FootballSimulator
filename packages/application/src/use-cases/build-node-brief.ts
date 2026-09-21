import type {
  MonthSummary,
  NodeBrief,
  NodeStopReason,
  YouthEventInstance,
} from '@football/contracts';

export const buildNodeBrief = (
  summaries: readonly MonthSummary[],
  stopReason: NodeStopReason,
  stopEvent?: YouthEventInstance,
  stopMonthKey?: string,
): NodeBrief => {
  const headline = buildHeadline(summaries, stopReason, stopEvent, stopMonthKey);
  const matches = summaries.reduce((total, summary) => total + summary.matchCount, 0);
  const goalsFor = summaries.reduce((total, summary) => total + summary.goalsFor, 0);
  const goalsAgainst = summaries.reduce((total, summary) => total + summary.goalsAgainst, 0);
  const changes = [
    ...new Set(summaries.flatMap(({ notableChange }) => (notableChange ? [notableChange] : []))),
  ];
  const fatigue = fatigueLabel(summaries);

  return {
    headline,
    skippedSummary:
      summaries.length > 0
        ? `${summaries.length} 个月，${matches} 场比赛，球队进球 ${goalsFor}，丢球 ${goalsAgainst}；体能${fatigue}。`
        : '本次推进没有跳过完整月份，当前节点需要你的处理。',
    changes: changes.slice(0, 8),
    nextFocus: nextFocusFor(stopReason, stopEvent),
  };
};

const buildHeadline = (
  summaries: readonly MonthSummary[],
  stopReason: NodeStopReason,
  stopEvent: YouthEventInstance | undefined,
  stopMonthKey: string | undefined,
): string => {
  if (stopReason === 'event') {
    return `${stopMonthKey ? formatMonth(stopMonthKey) : monthRange(summaries, stopMonthKey)}：${stopEvent?.title ?? '关键选择'}等待你决定`;
  }
  const range = monthRange(summaries, stopMonthKey);
  if (stopReason === 'season-end') return `${range}：赛季结束，等待赛季总结`;
  if (stopReason === 'injury') return `${range}：出现伤病，需要确认恢复安排`;
  if (stopReason === 'contract') return `${range}：合同状态发生变化`;
  if (stopReason === 'offer') return `${range}：新的报价已经到来`;
  return `${range}：国家队窗口发生变化`;
};

const monthRange = (summaries: readonly MonthSummary[], stopMonthKey?: string): string => {
  const first = summaries[0]?.monthKey ?? stopMonthKey;
  const last = summaries.at(-1)?.monthKey ?? stopMonthKey;
  if (!first) return '当前节点';
  if (!last || first === last) return formatMonth(first);
  return `${formatMonth(first)}—${formatMonth(last)}`;
};

const formatMonth = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  return `${year}年${Number(month)}月`;
};

const fatigueLabel = (summaries: readonly MonthSummary[]): string => {
  const up = summaries.filter(({ fatigueTrend }) => fatigueTrend === 'up').length;
  const down = summaries.filter(({ fatigueTrend }) => fatigueTrend === 'down').length;
  if (up > down) return '上升';
  if (down > up) return '下降';
  return '保持稳定';
};

const nextFocusFor = (
  stopReason: NodeStopReason,
  stopEvent: YouthEventInstance | undefined,
): string => {
  if (stopReason === 'event')
    return `关键选择等待你决定${stopEvent ? `：${stopEvent.title}` : ''}。`;
  if (stopReason === 'season-end') return '先阅读赛季总结，再决定下一阶段的去向。';
  if (stopReason === 'injury') return '优先确认伤病恢复安排，避免带伤继续推进。';
  if (stopReason === 'contract') return '查看合同状态，并确认下一步职业安排。';
  if (stopReason === 'offer') return '查看新的报价，再决定是否进入谈判。';
  return '查看国家队窗口信息，并处理征召相关选择。';
};
