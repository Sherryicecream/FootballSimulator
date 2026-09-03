import type { TrainingFeedback } from '@football/contracts';
import { FootballGlyph } from '../design-system/FootballGlyph';
import { labelAttribute } from './career-presentation';

interface TrainingFeedbackPanelProps {
  feedback: TrainingFeedback;
}

const FOCUS_LABELS: Record<TrainingFeedback['plan']['focus'], string> = {
  technical: '技术',
  position: '位置专项',
  physical: '身体',
  tactical: '战术',
  recovery: '恢复',
};

const INTENSITY_LABELS: Record<TrainingFeedback['plan']['intensity'], string> = {
  light: '轻量',
  normal: '正常',
  intense: '高强度',
};

const MATCH_STATUS_LABELS: Record<TrainingFeedback['matches']['status'], string> = {
  positive: '比赛表现积极',
  steady: '比赛表现稳定',
  'fatigue-limited': '受疲劳限制',
  'injury-limited': '受伤病限制',
  'no-appearance': '本月没有出场',
};

const HEALTH_STATUS_LABELS: Record<TrainingFeedback['health']['status'], string> = {
  none: '本月没有伤病记录',
  active: '伤病仍在恢复',
  recovered: '本月已从伤病中恢复',
};

const signedDelta = (delta: number): string => (delta > 0 ? `+${delta}` : `${delta}`);

const stateDeltaClass = (delta: number, inverted = false): string => {
  if (delta === 0) return 'training-feedback-delta training-feedback-delta--steady';
  const positive = inverted ? delta < 0 : delta > 0;
  return `training-feedback-delta training-feedback-delta--${positive ? 'positive' : 'negative'}`;
};

export function TrainingFeedbackPanel({ feedback }: TrainingFeedbackPanelProps) {
  const matchSummary =
    feedback.matches.averageRating === null
      ? MATCH_STATUS_LABELS[feedback.matches.status]
      : `${feedback.matches.appearances} 次出场 · ${feedback.matches.minutes} 分钟 · 场均 ${feedback.matches.averageRating.toFixed(1)}`;
  const healthSummary =
    feedback.health.status === 'none'
      ? HEALTH_STATUS_LABELS.none
      : feedback.health.bodyArea && feedback.health.expectedRecoveryWeeks !== null
        ? `${feedback.health.bodyArea} · 预计恢复 ${feedback.health.expectedRecoveryWeeks} 周`
        : HEALTH_STATUS_LABELS[feedback.health.status];

  return (
    <section className="training-feedback-panel" aria-label="训练回执">
      <header className="training-feedback-header">
        <div className="training-feedback-title">
          <span className="training-feedback-icon" aria-hidden="true">
            <FootballGlyph name="training" size={21} />
          </span>
          <div>
            <span className="card-kicker">训练与状态</span>
            <h3>训练回执</h3>
          </div>
        </div>
        <span className="training-feedback-plan">
          {FOCUS_LABELS[feedback.plan.focus]} · {INTENSITY_LABELS[feedback.plan.intensity]}
        </span>
      </header>

      <div className="training-feedback-load" aria-label="训练负荷">
        <div className="training-feedback-load-main">
          <div className="training-feedback-load-label">
            <span>训练负荷</span>
            <strong>{Math.round(feedback.averageTrainingLoad)}</strong>
          </div>
          <div
            className="training-feedback-load-bar"
            role="progressbar"
            aria-label="平均训练负荷"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(feedback.averageTrainingLoad)}
          >
            <span style={{ width: `${Math.min(100, feedback.averageTrainingLoad)}%` }} />
          </div>
          <span className="training-feedback-load-caption">
            {feedback.trainingWeeks} 周训练 · 计划完成度
          </span>
        </div>
        <div className="training-feedback-load-stats">
          <div>
            <strong>{Math.round(feedback.totalTrainingLoad)}</strong>
            <span>训练负荷总计</span>
          </div>
          <div>
            <strong>{Math.round(feedback.totalLoad)}</strong>
            <span>总负荷</span>
          </div>
        </div>
      </div>

      <div className="training-feedback-grid">
        <div className="training-feedback-section training-feedback-state">
          <div className="training-feedback-section-heading">
            <FootballGlyph name="fitness" size={18} />
            <h4>身体反馈</h4>
          </div>
          <div className="training-feedback-state-row">
            <span>体能</span>
            <strong>
              {feedback.fitness.before} → {feedback.fitness.after}
            </strong>
            <span className={stateDeltaClass(feedback.fitness.delta)}>
              {signedDelta(feedback.fitness.delta)}
            </span>
          </div>
          <div className="training-feedback-state-row">
            <span>
              <FootballGlyph name="fatigue" size={15} />
              疲劳
            </span>
            <strong>
              {feedback.fatigue.before} → {feedback.fatigue.after}
            </strong>
            <span className={stateDeltaClass(feedback.fatigue.delta, true)}>
              {signedDelta(feedback.fatigue.delta)}
            </span>
          </div>
          <p className="training-feedback-health">
            <span>{healthSummary}</span>
            {feedback.health.status !== 'none' && (
              <small>{HEALTH_STATUS_LABELS[feedback.health.status]}</small>
            )}
          </p>
        </div>

        <div className="training-feedback-section">
          <div className="training-feedback-section-heading">
            <FootballGlyph name="match" size={18} />
            <h4>比赛反馈</h4>
          </div>
          <strong className="training-feedback-match-summary">{matchSummary}</strong>
          <p
            className={`training-feedback-status training-feedback-status--${feedback.matches.status}`}
          >
            {MATCH_STATUS_LABELS[feedback.matches.status]}
          </p>
        </div>
      </div>

      <div className="training-feedback-section training-feedback-attributes">
        <div className="training-feedback-section-heading">
          <FootballGlyph name="form" size={18} />
          <h4>能力变化</h4>
        </div>
        {feedback.attributeChanges.length > 0 ? (
          <ul className="training-feedback-change-list">
            {feedback.attributeChanges.map(({ attribute, oldValue, newValue }) => (
              <li key={`${attribute}-${oldValue}-${newValue}`}>
                <span>{labelAttribute(attribute)}</span>
                <strong>
                  {oldValue} → {newValue}
                </strong>
                <em className={stateDeltaClass(newValue - oldValue)}>
                  {signedDelta(newValue - oldValue)}
                </em>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">本月没有记录到属性变化</p>
        )}
      </div>

      <footer className="training-feedback-conclusion">
        <p>
          <strong>本月判断</strong>
          {feedback.conclusion}
        </p>
        <p>
          <strong>下一步</strong>
          {feedback.nextStep}
        </p>
      </footer>
    </section>
  );
}
