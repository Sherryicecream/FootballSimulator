import type { EventInstance, PlayerState } from '@football/contracts';

interface EventResultPanelProps {
  event: EventInstance;
  chosenChoiceId: string;
  oldPlayerState: PlayerState;
  newPlayerState: PlayerState;
  onContinue: () => void;
}

/**
 * 事件结果展示面板
 * 在玩家做出选择后，显示选择内容、效果变化和状态前后对比
 */
export function EventResultPanel({
  event,
  chosenChoiceId,
  oldPlayerState,
  newPlayerState,
  onContinue,
}: EventResultPanelProps) {
  const chosenChoice = event.choices.find((c) => c.id === chosenChoiceId);
  if (!chosenChoice) return null;

  const effects = chosenChoice.effects || {};

  const effectLabels: Record<string, string> = {
    fitness: '体能',
    morale: '士气',
    coachTrust: '教练信任',
    fatigue: '疲劳',
  };

  const effectColors: Record<string, string> = {
    fitness: '#27ae60',
    morale: '#2980b9',
    coachTrust: '#8e44ad',
    fatigue: '#e67e22',
  };

  const stateLabels: Record<string, string> = {
    fitness: '体能',
    morale: '士气',
    coachTrust: '教练信任',
    fatigue: '疲劳',
  };

  const stateColors: Record<string, string> = {
    fitness: '#27ae60',
    morale: '#2980b9',
    coachTrust: '#8e44ad',
    fatigue: '#e67e22',
  };

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
          事件结果
        </div>
        <div
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'bold',
            color: 'var(--color-ink)',
            marginTop: 'var(--space-xs)',
          }}
        >
          {event.title}
        </div>
      </div>

      {/* Chosen Option */}
      <div
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-xs)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          你的选择
        </div>
        <div
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--color-ink)',
            fontWeight: 'bold',
            marginBottom: 'var(--space-md)',
          }}
        >
          {chosenChoice.text}
        </div>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            fontStyle: 'italic',
            lineHeight: '1.6',
          }}
        >
          {event.description}
        </div>
      </div>

      {/* Effects */}
      {Object.keys(effects).length > 0 && (
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
              fontSize: 'var(--text-sm)',
              fontWeight: 'bold',
              color: 'var(--color-ink)',
              marginBottom: 'var(--space-md)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            效果变化
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {Object.entries(effects).map(([key, value]) => {
              const label = effectLabels[key] ?? key;
              const color = effectColors[key] ?? '#666';
              const sign = value > 0 ? '+' : '';
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-xs) 0',
                    borderBottom: '1px solid var(--color-border-light)',
                  }}
                >
                  <span
                    style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontWeight: 'bold',
                      color: value > 0 ? color : '#e74c3c',
                      fontSize: 'var(--text-lg)',
                    }}
                  >
                    {sign}
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* State Comparison */}
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
            fontSize: 'var(--text-sm)',
            fontWeight: 'bold',
            color: 'var(--color-ink)',
            marginBottom: 'var(--space-md)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          状态变化
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 'var(--space-sm)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <div style={{ color: 'var(--color-text-muted)' }}>属性</div>
          <div style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>之前</div>
          <div style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>之后</div>

          {(['fitness', 'morale', 'coachTrust', 'fatigue'] as const).map((key) => {
            const oldVal = oldPlayerState[key];
            const newVal = newPlayerState[key];
            const changed = oldVal !== newVal;
            const color = stateColors[key] ?? '#666';
            return (
              <div key={key} style={{ display: 'contents' }}>
                <div style={{ color: 'var(--color-text-secondary)', padding: '2px 0' }}>
                  {stateLabels[key]}
                </div>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2px 0',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {oldVal}
                </div>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2px 0',
                    fontWeight: 'bold',
                    color: changed ? color : 'var(--color-text-secondary)',
                  }}
                >
                  {newVal}
                  {changed && (
                    <span style={{ fontSize: 'var(--text-xs)', marginLeft: '2px' }}>
                      ({newVal > oldVal ? '+' : ''}
                      {newVal - oldVal})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Continue */}
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
    </div>
  );
}
