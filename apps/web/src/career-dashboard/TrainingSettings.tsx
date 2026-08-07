import type { TrainingIntensity } from '@football/contracts';

interface TrainingSettingsProps {
  trainingFocus: string | null;
  trainingIntensity: TrainingIntensity;
  onFocusChange: (focus: string | null) => void;
  onIntensityChange: (intensity: TrainingIntensity) => void;
  position: string;
}

const POSITION_FOCUS_OPTIONS: Record<string, string[]> = {
  CENTER_BACK: ['防守', '空中', '力量'],
  FULL_BACK: ['速度', '耐力', '防守'],
  DEFENSIVE_MIDFIELDER: ['防守', '传球', '耐力'],
  MIDFIELDER: ['传球', '视野', '技术'],
  WINGER: ['盘带', '速度', '射门'],
  FORWARD: ['射门', '跑位', '盘带'],
};

const INTENSITY_LABELS: Record<TrainingIntensity, string> = {
  light: '轻量',
  normal: '普通',
  intense: '加练',
};

const INTENSITY_DESCRIPTIONS: Record<TrainingIntensity, string> = {
  light: '↓ 成长慢 · 恢复快 · 低疲劳',
  normal: '适中成长 · 适中消耗',
  intense: '↑ 成长快 · 疲劳高 · ⚠️ 受伤风险',
};

const FOCUS_LABELS: Record<string, string> = {
  防守: '防守',
  空中: '空中能力',
  力量: '力量',
  速度: '速度',
  耐力: '耐力',
  传球: '传球',
  视野: '视野',
  技术: '技术',
  盘带: '盘带',
  射门: '射门',
  跑位: '跑位',
};

export function TrainingSettings({
  trainingFocus,
  trainingIntensity,
  onFocusChange,
  onIntensityChange,
  position,
}: TrainingSettingsProps) {
  const focusOptions = POSITION_FOCUS_OPTIONS[position] ?? ['技术', '体能', '战术'];
  const intensityOptions: TrainingIntensity[] = ['light', 'normal', 'intense'];

  const focusLabel = trainingFocus ? (FOCUS_LABELS[trainingFocus] ?? trainingFocus) : '自动';

  return (
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
        ⚙️ 训练设置
      </div>

      {/* Training Focus */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          训练重点
        </div>
        <select
          value={trainingFocus ?? ''}
          onChange={(e) => onFocusChange(e.target.value || null)}
          style={{
            width: '100%',
            padding: 'var(--space-sm) var(--space-md)',
            fontSize: 'var(--text-base)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-card)',
            color: 'var(--color-ink)',
            cursor: 'pointer',
          }}
        >
          <option value="">自动</option>
          {focusOptions.map((f) => (
            <option key={f} value={f}>
              {FOCUS_LABELS[f] ?? f}
            </option>
          ))}
        </select>
      </div>

      {/* Training Intensity */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          训练强度
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {intensityOptions.map((intensity) => (
            <button
              key={intensity}
              onClick={() => onIntensityChange(intensity)}
              style={{
                flex: 1,
                padding: 'var(--space-sm) var(--space-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: trainingIntensity === intensity ? 'bold' : 'normal',
                border: `2px solid ${
                  trainingIntensity === intensity ? 'var(--color-accent)' : 'var(--color-border)'
                }`,
                borderRadius: 'var(--radius-sm)',
                background:
                  trainingIntensity === intensity ? 'var(--color-accent)' : 'var(--color-card)',
                color: trainingIntensity === intensity ? '#fff' : 'var(--color-ink)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {INTENSITY_LABELS[intensity]}
            </button>
          ))}
        </div>
      </div>

      {/* Current Settings Preview */}
      <div
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
          padding: 'var(--space-sm)',
          background: 'var(--color-bg-muted)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div>
          💡 当前设置：{focusLabel}训练 · {INTENSITY_LABELS[trainingIntensity]}强度
        </div>
        <div>📊 {INTENSITY_DESCRIPTIONS[trainingIntensity]}</div>
      </div>
    </div>
  );
}
