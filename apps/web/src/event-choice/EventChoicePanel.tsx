import { useState, useRef } from 'react';
import type { EventInstance, YouthEventInstance } from '@football/contracts';

interface EventChoicePanelProps {
  event: EventInstance | YouthEventInstance;
  onSubmit: (choiceId: string) => void;
}

export function EventChoicePanel({ event, onSubmit }: EventChoicePanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const committed = useRef(false);
  const isResolved = event.resolvedChoiceId !== null;

  const handleChoice = (choiceId: string) => {
    if (committed.current || isResolved) return;
    committed.current = true;
    setSelectedId(choiceId);
    onSubmit(choiceId);
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
          事件
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
            fontSize: 'var(--text-base)',
            color: 'var(--color-ink)',
            lineHeight: '1.6',
            marginBottom: 'var(--space-lg)',
          }}
        >
          {event.description}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {event.choices.map((choice) => {
            const isChosen = selectedId === choice.id || event.resolvedChoiceId === choice.id;
            const riskColor =
              choice.riskLabel === 'low'
                ? '#27ae60'
                : choice.riskLabel === 'medium'
                  ? '#f39c12'
                  : '#e74c3c';
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChoice(choice.id)}
                disabled={committed.current || isResolved}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: `${isChosen ? 2 : 1}px solid ${isChosen ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-lg)',
                  background: 'var(--color-card)',
                  cursor: committed.current || isResolved ? 'default' : 'pointer',
                  opacity: committed.current && !isChosen ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink)' }}>
                    {choice.text}
                  </span>
                  <span
                    style={{
                      background: riskColor,
                      color: '#fff',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'bold',
                    }}
                  >
                    {choice.riskLabel === 'low'
                      ? '低风险'
                      : choice.riskLabel === 'medium'
                        ? '中风险'
                        : '高风险'}
                  </span>
                </div>
                {isChosen && (
                  <div
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-accent)',
                      marginTop: 'var(--space-sm)',
                      fontStyle: 'italic',
                    }}
                  >
                    ← 已选择
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
