import type { TrainingPlan } from '@football/contracts';

const FOCUS_LABELS: Record<TrainingPlan['focus'], string> = {
  technical: '技术',
  position: '位置专项',
  physical: '身体',
  tactical: '战术',
  recovery: '恢复',
};

interface TrainingPlanEditorProps {
  plan: TrainingPlan;
  disabled: boolean;
  onChange: (plan: TrainingPlan) => void;
}

export function TrainingPlanEditor({ plan, disabled, onChange }: TrainingPlanEditorProps) {
  const update = (patch: Partial<TrainingPlan>) => onChange({ ...plan, ...patch });

  return (
    <section className="dashboard-card training-plan-card" aria-label="训练计划">
      <div className="card-heading">
        <span className="card-kicker">训练管理</span>
        <h3>训练计划</h3>
      </div>
      <label>
        重点
        <select
          aria-label="训练重点"
          value={plan.focus}
          disabled={disabled}
          onChange={(event) => update({ focus: event.target.value as TrainingPlan['focus'] })}
        >
          {Object.entries(FOCUS_LABELS).map(([value, label]) => (
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
          value={plan.intensity}
          disabled={disabled}
          onChange={(event) =>
            update({ intensity: event.target.value as TrainingPlan['intensity'] })
          }
        >
          <option value="light">轻量</option>
          <option value="normal">正常</option>
          <option value="intense">高强度</option>
        </select>
      </label>
      <p className="muted">
        正常负荷兼顾训练收益与比赛恢复；密集赛程可降低强度，高强度训练会增加疲劳压力。
      </p>
    </section>
  );
}
