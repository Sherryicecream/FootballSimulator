import type { EventFeedback } from '@football/contracts';
import { SceneBanner } from '../design-system/SceneBanner';
import { FootballGlyph, type FootballGlyphName } from '../design-system/FootballGlyph';
import type { SceneKind } from '../design-system/scene-types';

interface EventFeedbackPanelProps {
  feedback: EventFeedback;
  nextEvents?: readonly { id: string; title: string }[];
  sceneKind?: SceneKind;
  onContinue: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  'youth-coach': '教练',
  'assistant-coach': '助教',
  teammate: '队友',
  rival: '竞争者',
  family: '家人',
};
const SPEAKER_GLYPHS: Record<string, FootballGlyphName> = {
  'youth-coach': 'coach-trust',
  'assistant-coach': 'coach-trust',
  teammate: 'relationship',
  rival: 'form',
  family: 'relationship',
};

const STATE_LABELS: Record<string, string> = {
  morale: '士气',
  form: '状态',
  confidence: '信心',
  fitness: '体能',
  fatigue: '疲劳',
  coachTrust: '教练评价',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  trust: '教练信任',
  respect: '尊重',
  closeness: '亲近度',
};
const ATTRIBUTE_LABELS: Record<string, string> = {
  firstTouch: '停球',
  dribbling: '盘带',
  passing: '传球',
  shooting: '射门',
  defending: '防守',
  aerialAbility: '空中能力',
  pace: '速度',
  strength: '力量',
  stamina: '耐力',
  agility: '灵活',
  offTheBall: '跑位',
  vision: '视野',
  decision: '决策',
  composure: '镇定',
  determination: '意志',
  discipline: '纪律',
};

type ResultTone = NonNullable<EventFeedback['resultTone']>;
const RESULT_TONE_LABELS: Record<ResultTone, string> = {
  success: '成功',
  partial: '部分达成',
  failure: '受挫',
  neutral: '中性记录',
};

export function EventFeedbackPanel({
  feedback,
  nextEvents = [],
  sceneKind = 'neutral',
  onContinue,
}: EventFeedbackPanelProps) {
  const resultTone: ResultTone = feedback.resultTone ?? feedback.outcome?.outcome ?? 'neutral';
  const resultToneLabel = RESULT_TONE_LABELS[resultTone];
  const resultTitle = feedback.resultTitle ?? feedback.outcome?.label ?? '事件暂告一段落';
  return (
    <section className="event-feedback-panel" aria-label="事件反馈">
      <SceneBanner
        kind={sceneKind}
        eyebrow="事件反馈 · 已记录"
        title={feedback.title}
        detail={`你的选择：${feedback.choiceText}`}
      />

      <header className="event-feedback-header event-feedback-header--compact">
        <span className="event-feedback-kicker">选择回放</span>
        <p>你已经做出决定，下面是这次选择在场内外留下的回应与影响。</p>
      </header>

      {feedback.outcome && (
        <section
          className={`event-feedback-outcome event-feedback-outcome--${feedback.outcome.outcome}`}
          aria-label="选择结果"
        >
          <div className="event-feedback-outcome-heading">
            <span className="event-feedback-kicker">结果</span>
            <strong>{feedback.outcome.label}</strong>
          </div>
          <div className="event-feedback-outcome-reason" aria-label="判定依据">
            <span className="event-feedback-kicker">判定依据</span>
            <p>{feedback.outcome.reason}</p>
          </div>
          <dl className="event-feedback-outcome-stats">
            <div>
              <dt>主能力</dt>
              <dd>
                {ATTRIBUTE_LABELS[feedback.outcome.attribute] ?? feedback.outcome.attribute}{' '}
                {feedback.outcome.attributeValue}
              </dd>
            </div>
            <div>
              <dt>综合判定</dt>
              <dd>
                综合 {feedback.outcome.score} / 难度 {feedback.outcome.target}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <article
        className={'event-feedback-result event-feedback-result--' + resultTone}
        aria-label={'事件结果：' + resultToneLabel}
      >
        <div className="event-feedback-result-meta">
          <span className="event-feedback-kicker">结果类型</span>
          <strong className="event-feedback-result-type" data-testid="event-feedback-result-type">
            {resultToneLabel}
          </strong>
        </div>
        <h2 className="event-feedback-result-title">{resultTitle}</h2>
        <p>{feedback.response}</p>
      </article>

      <section className="event-feedback-section" aria-label="人物回应">
        <div className="event-feedback-section-heading">
          <span>对话</span>
          <h3>人物回应</h3>
        </div>
        {feedback.participantResponses.length > 0 ? (
          <div className="event-feedback-dialogue">
            {feedback.participantResponses.map((participant) => (
              <article className="event-feedback-dialogue-line" key={participant.personId}>
                <div className="event-feedback-speaker">
                  <span className="event-feedback-avatar" aria-hidden="true">
                    <FootballGlyph
                      name={SPEAKER_GLYPHS[participant.role] ?? 'relationship'}
                      size={17}
                    />
                  </span>
                  <span>
                    <strong>{participant.personName}</strong>
                    <small>{ROLE_LABELS[participant.role] ?? '相关人物'}</small>
                  </span>
                </div>
                <p>{participant.text}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="event-feedback-empty">本次选择暂未收到新的场内回应。</p>
        )}
      </section>

      <section className="event-feedback-changes" aria-label="变化记录">
        <div className="event-feedback-section-heading">
          <span>影响</span>
          <h3>变化记录</h3>
        </div>
        {feedback.stateChanges.length === 0 && feedback.relationshipChanges.length === 0 ? (
          <p className="event-feedback-empty">本次选择暂未改变可量化状态，后续影响仍在观察中。</p>
        ) : (
          <>
            {feedback.stateChanges.length > 0 && (
              <div>
                <div className="event-feedback-section-heading">
                  <span>状态</span>
                  <h3>你身上的变化</h3>
                </div>
                <div className="event-feedback-change-grid">
                  {feedback.stateChanges.map((change) => (
                    <div className="event-feedback-change" key={change.key}>
                      <span>{STATE_LABELS[change.key] ?? change.key}</span>
                      <strong
                        className={change.newValue >= change.oldValue ? 'positive' : 'negative'}
                      >
                        {change.oldValue} → {change.newValue}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {feedback.relationshipChanges.length > 0 && (
              <div>
                <div className="event-feedback-section-heading">
                  <span>关系</span>
                  <h3>关系变化</h3>
                </div>
                <div className="event-feedback-change-grid">
                  {feedback.relationshipChanges.map((change, index) => (
                    <div
                      className="event-feedback-change"
                      key={`${change.personId}-${change.dimension}-${index}`}
                    >
                      <span>
                        {change.personName} ·{' '}
                        {RELATIONSHIP_LABELS[change.dimension] ?? change.dimension}
                      </span>
                      <strong className={change.delta >= 0 ? 'positive' : 'negative'}>
                        {change.delta > 0 ? '+' : ''}
                        {change.delta}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <article className="event-feedback-follow-up">
        <span className="event-feedback-kicker">后续影响</span>
        <p>{feedback.followUp}</p>
      </article>

      {nextEvents.length > 0 && (
        <section className="event-feedback-next" aria-label="下一幕线索">
          <div className="event-feedback-section-heading">
            <span>剧情推进</span>
            <h3>下一幕线索</h3>
          </div>
          <p className="event-feedback-next-intro">
            这次选择已经留下了后续问题。它不会立刻跳过当前月度流程，但会在满足条件时再次回到你的生涯里。
          </p>
          <div className="event-feedback-next-list">
            {nextEvents.map((event) => (
              <article className="event-feedback-next-card" key={event.id}>
                <span aria-hidden="true">NEXT</span>
                <strong>{event.title}</strong>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="event-feedback-actions">
        <button className="primary-action" type="button" onClick={onContinue}>
          继续推进
        </button>
      </footer>
    </section>
  );
}
