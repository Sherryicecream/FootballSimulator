import type { CareerSave, WeeklyAdvanceResult } from '@football/contracts';

interface WeeklyReportProps {
  result: WeeklyAdvanceResult;
  save: CareerSave;
  onContinue: () => void;
}

const ACTIVITY_LABELS: Record<string, { icon: string; label: string }> = {
  training: { icon: '🏋️', label: '训练周' },
  match: { icon: '⚽', label: '比赛周' },
  event: { icon: '📰', label: '事件周' },
  quiet: { icon: '☕', label: '平淡周' },
};

export function WeeklyReport({ result, save, onContinue }: WeeklyReportProps) {
  const activity = ACTIVITY_LABELS[result.activity] ?? { icon: '📅', label: '普通周' };

  return (
    <div style={{ fontFamily: 'var(--font-serif)' }}>
      <div
        style={{
          borderBottom: '2px solid var(--color-accent)',
          paddingBottom: 'var(--space-sm)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-accent)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          周报
        </div>
        <div
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'bold',
            color: 'var(--color-ink)',
            marginTop: 'var(--space-xs)',
          }}
        >
          {activity.icon} 第 {result.week} 周 · {activity.label}
        </div>
        <div
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--space-xs)',
          }}
        >
          {result.date} · {result.season}赛季
        </div>
      </div>

      {/* Training Summary */}
      {result.trainingSummary && (
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'bold',
              color: 'var(--color-ink)',
              marginBottom: 'var(--space-md)',
            }}
          >
            🏋️ 训练
          </div>
          <div
            style={{
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-sm)',
            }}
          >
            训练重点：{result.trainingSummary.focus}
          </div>
          {result.trainingSummary.attributeChanges.length > 0 && (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              属性变化：
              {result.trainingSummary.attributeChanges.map((c, i) => (
                <span key={i} style={{ marginLeft: 'var(--space-sm)' }}>
                  {c.attribute} {c.oldValue} → <strong>{c.newValue}</strong>
                  {i < result.trainingSummary!.attributeChanges.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
          )}
          {result.trainingSummary.attributeChanges.length === 0 && (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              本周训练强度一般，属性无明显变化
            </div>
          )}
        </div>
      )}

      {/* Match Result */}
      {result.matchResult && (
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'bold',
              color: 'var(--color-ink)',
              marginBottom: 'var(--space-md)',
            }}
          >
            ⚽ 比赛
          </div>
          <div
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 'var(--space-sm)',
            }}
          >
            {result.matchResult.isHome ? '主场' : '客场'} vs {result.matchResult.opponent}
          </div>
          <div
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'bold',
              textAlign: 'center',
              color: 'var(--color-accent)',
              marginBottom: 'var(--space-md)',
            }}
          >
            {result.matchResult.homeScore} - {result.matchResult.awayScore}
          </div>
          {result.matchResult.played ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  marginBottom: 'var(--space-sm)',
                  flexWrap: 'wrap',
                }}
              >
                <span>出场 {result.matchResult.minutesPlayed}分钟</span>
                <span>
                  评分 <strong>{result.matchResult.rating}</strong>
                </span>
                {result.matchResult.goals > 0 && <span>⚽ {result.matchResult.goals}球</span>}
                {result.matchResult.assists > 0 && <span>🎯 {result.matchResult.assists}助</span>}
              </div>
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                {result.matchResult.performanceSummary}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
              未获得出场机会
            </div>
          )}
        </div>
      )}

      {/* State Changes */}
      {result.stateChanges.length > 0 && (
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'bold',
              color: 'var(--color-ink)',
              marginBottom: 'var(--space-md)',
            }}
          >
            📊 状态变化
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}
          >
            {result.stateChanges.map((c, i) => (
              <div
                key={i}
                style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}
              >
                {c.key}：{c.oldValue} →{' '}
                <strong
                  style={{
                    color:
                      c.newValue > c.oldValue
                        ? 'var(--color-risk-low)'
                        : 'var(--color-risk-high)',
                  }}
                >
                  {c.newValue}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      {result.hasPendingChoice ? (
        <div
          style={{
            background: '#fef9e7',
            border: '1px solid #f39c12',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-base)',
              color: '#e67e22',
              marginBottom: 'var(--space-sm)',
            }}
          >
            ⚠️ 你需要先处理一个事件才能继续推进
          </div>
        </div>
      ) : (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--space-lg)',
            textAlign: 'center',
          }}
        >
          <button
            onClick={onContinue}
            style={{
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              padding: 'var(--space-md) 40px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-lg)',
              fontWeight: 'bold',
              letterSpacing: '1px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            继续推进 →
          </button>
        </div>
      )}
    </div>
  );
}