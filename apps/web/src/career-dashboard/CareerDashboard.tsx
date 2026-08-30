import type { CareerSaveV2, MonthlyReport, TrainingPlan } from '@football/contracts';
import type { YouthSeasonOutcome } from '@football/application';
import { buildPlayerProfile, buildRecentRecords, labelAttribute } from './career-presentation';

interface CareerDashboardProps {
  save: CareerSaveV2;
  academyName: string;
  report: MonthlyReport | null;
  outcome: YouthSeasonOutcome | null;
  advancing: boolean;
  onAdvance: () => void;
  onTrainingPlanChange: (plan: TrainingPlan) => void;
  onNewCareer: () => void;
}

const focusLabels: Record<TrainingPlan['focus'], string> = {
  technical: '技术',
  position: '位置专项',
  physical: '身体',
  tactical: '战术',
  recovery: '恢复',
};
const stageLabels: Record<CareerSaveV2['clubContext']['firstTeamStage'], string> = {
  none: '尚未进入视野',
  watchlist: '一线队观察名单',
  'training-invite': '一线队跟训',
  'bench-list': '比赛名单',
  'substitute-appearance': '替补出场',
  'starting-appearance': '首发出场',
};

export function CareerDashboard({
  save,
  academyName,
  report,
  outcome,
  advancing,
  onAdvance,
  onTrainingPlanChange,
  onNewCareer,
}: CareerDashboardProps) {
  const attributes = Object.entries(save.player.attributes).flatMap(([group, values]) =>
    Object.entries(values).map(([key, value]) => ({ group, key, value })),
  );
  const recentRecords = buildRecentRecords(save);
  const playerProfile = buildPlayerProfile(save.player);
  return (
    <section className="career-shell" aria-label="青训生涯仪表盘">
      <header className="career-hero">
        <div>
          <span className="eyebrow">青训生涯</span>
          <h2>{save.player.identity.name}</h2>
        </div>
        <div className="career-meta">
          <span>{academyName}</span>
          <span>{save.season.currentDate}</span>
          <span>第 {save.season.currentWeek} 周</span>
        </div>
      </header>

      {outcome && (
        <section className="report-card">
          <h3>赛季总结</h3>
          <p>{outcome.summary}</p>
          <p>后续方向：{outcome.nextPath}</p>
        </section>
      )}
      {report && !outcome && (
        <section className="report-card" aria-label="月报">
          <h3>{report.monthKey} 月报</h3>
          <p>
            {report.matchIds.length} 场比赛 · {report.attributeChanges.length} 项属性提升 ·{' '}
            {report.facts.length} 条生涯记录
          </p>
          {report.attributeChanges.length > 0 && (
            <p>
              {report.attributeChanges
                .map(
                  ({ attribute, oldValue, newValue }) =>
                    `${labelAttribute(attribute)} ${oldValue}→${newValue}`,
                )
                .join('，')}
            </p>
          )}
        </section>
      )}

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <h3>当前状态</h3>
          <State label="体能" value={save.health.fitness} />
          <State label="疲劳" value={save.health.fatigue} />
          <State label="士气" value={save.currentState.morale} />
          <State label="状态" value={save.currentState.form} />
          <State label="教练评价" value={save.clubContext.coachEvaluation} />
          <p className="muted">一线队：{stageLabels[save.clubContext.firstTeamStage]}</p>
          {save.health.activeInjury && (
            <p className="warning">
              伤情：{save.health.activeInjury.bodyArea}，预计{' '}
              {save.health.activeInjury.expectedRecoveryWeeks} 周
            </p>
          )}
        </section>

        <section className="dashboard-card player-profile">
          <h3>球员档案</h3>
          <dl className="profile-facts">
            <div>
              <dt>成长背景</dt>
              <dd>{playerProfile.background}</dd>
            </div>
            <div>
              <dt>性格倾向</dt>
              <dd>{playerProfile.personality}</dd>
            </div>
            <div>
              <dt>惯用脚</dt>
              <dd>{playerProfile.preferredFoot}</dd>
            </div>
            <div>
              <dt>逆足评价</dt>
              <dd>{playerProfile.weakFoot}</dd>
            </div>
          </dl>
          <h4>主要能力</h4>
          <div className="strength-chips">
            {playerProfile.strengths.map(({ label, value }) => (
              <span key={label}>
                {label} <strong>{value}</strong>
              </span>
            ))}
          </div>
        </section>

        <section className="dashboard-card">
          <h3>训练计划</h3>
          <label>
            重点
            <select
              aria-label="训练重点"
              value={save.trainingPlan.focus}
              onChange={(event) =>
                onTrainingPlanChange({
                  ...save.trainingPlan,
                  focus: event.target.value as TrainingPlan['focus'],
                })
              }
            >
              {Object.entries(focusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            强度
            <select
              aria-label="训练强度"
              value={save.trainingPlan.intensity}
              onChange={(event) =>
                onTrainingPlanChange({
                  ...save.trainingPlan,
                  intensity: event.target.value as TrainingPlan['intensity'],
                })
              }
            >
              <option value="light">轻量</option>
              <option value="normal">正常</option>
              <option value="intense">高强度</option>
            </select>
          </label>
          <p className="muted">设置会持续生效，直到你再次调整。</p>
        </section>

        <section className="dashboard-card attributes">
          <h3>球员属性</h3>
          <div className="attribute-grid">
            {attributes.map(({ group, key, value }) => (
              <div key={`${group}-${key}`}>
                <span>{labelAttribute(key)}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-card timeline">
          <h3>最近记录</h3>
          {recentRecords.length === 0 && <p className="muted">暂无重要生涯记录。</p>}
          {recentRecords.map((record) => (
            <article key={record.monthKey}>
              <h4>{record.monthKey}</h4>
              {record.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </article>
          ))}
        </section>
      </div>

      <footer className="career-actions">
        <button
          className="primary-action"
          onClick={onAdvance}
          disabled={advancing || save.season.completed}
        >
          {advancing ? '推进中…' : '推进到下个月'}
        </button>
        <button className="secondary-action" onClick={onNewCareer}>
          新生涯
        </button>
      </footer>
    </section>
  );
}

function State({ label, value }: { label: string; value: number }) {
  return (
    <div className="state-row">
      <span>{label}</span>
      <div>
        <i style={{ width: `${value}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}
