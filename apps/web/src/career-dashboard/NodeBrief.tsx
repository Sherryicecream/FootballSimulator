import type { MonthSummary, NodeBrief as NodeBriefData } from '@football/contracts';

interface NodeBriefProps {
  brief: NodeBriefData;
  skippedMonths: readonly MonthSummary[];
}

const FATIGUE_LABELS: Record<MonthSummary['fatigueTrend'], string> = {
  up: '上升',
  down: '下降',
  flat: '持平',
};

export const NodeBrief = ({ brief, skippedMonths }: NodeBriefProps) => (
  <section className="node-brief" aria-label="节点简报">
    <header className="node-brief-header">
      <span className="eyebrow">推进回顾 · 节点简报</span>
      <h3>{brief.headline}</h3>
      <p>{brief.skippedSummary}</p>
    </header>

    {brief.changes.length > 0 && (
      <section className="node-brief-changes" aria-label="节点变化">
        <span className="node-brief-kicker">期间变化</span>
        <ul>
          {brief.changes.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      </section>
    )}

    <p className="node-brief-focus">
      <strong>下一步关注：</strong>
      {brief.nextFocus}
    </p>

    {skippedMonths.length > 0 && (
      <details className="node-brief-details">
        <summary>查看跳过月份详情</summary>
        <ol>
          {skippedMonths.map((month) => (
            <li key={month.monthKey}>
              <div>
                <strong>{month.monthKey}</strong>
                <span>
                  {month.matchCount} 场比赛 · {month.goalsFor}:{month.goalsAgainst}
                </span>
              </div>
              <span>体能{FATIGUE_LABELS[month.fatigueTrend]}</span>
              {month.notableChange && <p>{month.notableChange}</p>}
            </li>
          ))}
        </ol>
      </details>
    )}
  </section>
);
