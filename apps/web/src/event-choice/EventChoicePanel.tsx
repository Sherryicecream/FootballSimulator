import { useRef, useState } from 'react';
import type { EventInstance, YouthEventInstance } from '@football/contracts';
import { SceneBanner } from '../design-system/SceneBanner';
import { StatusBadge, type StatusBadgeTone } from '../design-system/StatusBadge';
import type { SceneKind } from '../design-system/scene-types';

interface EventChoicePanelProps {
  event: EventInstance | YouthEventInstance;
  sceneKind?: SceneKind;
  onSubmit: (choiceId: string) => void;
}

type RiskLabel = 'low' | 'medium' | 'high';

const RISK_LABELS: Record<RiskLabel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const normalizeRiskLabel = (value: string): RiskLabel =>
  value === 'low' || value === 'medium' || value === 'high' ? value : 'medium';

const RISK_TONES: Record<string, StatusBadgeTone> = {
  low: 'positive',
  medium: 'caution',
  high: 'danger',
};

const RISK_GLYPHS: Record<string, 'form' | 'warning' | 'match'> = {
  low: 'form',
  medium: 'match',
  high: 'warning',
};

export function EventChoicePanel({
  event,
  sceneKind = 'neutral',
  onSubmit,
}: EventChoicePanelProps) {
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
    <section className="event-choice-panel" aria-label="事件选择">
      <SceneBanner
        kind={sceneKind}
        eyebrow="生涯事件 · 需要决定"
        title={event.title}
        detail={event.description}
      />

      <div className="event-choice-card">
        <div className="event-choice-intro">
          <span className="event-choice-kicker">请选择行动</span>
          <p>你的选择会留下生涯记录，也可能改变接下来几周的训练与关系。</p>
        </div>

        <div className="event-choice-list">
          {event.choices.map((choice) => {
            const isChosen = selectedId === choice.id || event.resolvedChoiceId === choice.id;
            const riskKey = normalizeRiskLabel(choice.riskLabel);
            const riskLabel = RISK_LABELS[riskKey];
            const riskTone = RISK_TONES[riskKey] ?? 'neutral';
            const riskGlyph = RISK_GLYPHS[riskKey] ?? 'match';
            return (
              <button
                key={choice.id}
                className={'event-choice' + (isChosen ? ' event-choice--chosen' : '')}
                type="button"
                onClick={() => handleChoice(choice.id)}
                disabled={committed.current || isResolved}
                aria-pressed={isChosen}
              >
                <span className="event-choice-copy">
                  <strong>{choice.text}</strong>
                  {isChosen && <small>已选择 · 等待记录</small>}
                </span>
                <StatusBadge glyph={riskGlyph} label="风险" value={riskLabel} tone={riskTone} />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
