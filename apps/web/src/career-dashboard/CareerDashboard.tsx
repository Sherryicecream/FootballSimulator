import type { CareerSave, EventDefinition } from '@football/contracts';
import { createAdvanceCareerWeek } from '@football/application';

interface CareerDashboardProps {
  save: CareerSave;
  onSaveUpdate: (save: CareerSave) => void;
  onNewCareer: () => void;
  events?: EventDefinition[];
}

const POSITION_LABELS: Record<string, string> = {
  CENTER_BACK: '中后卫',
  FULL_BACK: '边后卫',
  DEFENSIVE_MIDFIELDER: '后腰',
  MIDFIELDER: '中场',
  WINGER: '边锋',
  FORWARD: '前锋',
};

const ATTRIBUTE_GROUPS = [
  {
    label: '技术',
    keys: ['firstTouch', 'dribbling', 'passing', 'shooting', 'defending', 'aerialAbility'],
    labels: ['停球', '盘带', '传球', '射门', '防守', '空中'],
  },
  {
    label: '身体',
    keys: ['pace', 'strength', 'stamina', 'agility'],
    labels: ['速度', '力量', '耐力', '灵活'],
  },
  {
    label: '精神',
    keys: ['offTheBall', 'vision', 'decision', 'composure', 'determination', 'discipline'],
    labels: ['跑位', '视野', '决策', '镇定', '意志', '纪律'],
  },
];

export function CareerDashboard({ save, onSaveUpdate, onNewCareer, events }: CareerDashboardProps) {
  const advanceWeek = createAdvanceCareerWeek(events);

  const handleAdvance = () => {
    try {
      const updated = advanceWeek(save);
      onSaveUpdate(updated);
    } catch (err) {
      console.error('推进失败:', err);
    }
  };

  const { player, world, context } = save;
  const positionLabel =
    POSITION_LABELS[player.identity.primaryPosition] ?? player.identity.primaryPosition;
  const allAttrs: Record<string, number> = {
    ...player.attributes.technical,
    ...player.attributes.physical,
    ...player.attributes.mental,
  };
  const { playerState } = context;

  const academyName =
    save.ledger.find((e) => e.type === 'youth-opportunity-chosen')?.academyName ?? '待定';

  return (
    <div style={{ fontFamily: 'var(--font-serif)' }}>
      {/* Header */}
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
          生涯仪表盘
        </div>
        <div
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'bold',
            color: 'var(--color-ink)',
            marginTop: 'var(--space-xs)',
          }}
        >
          青训生涯
        </div>
      </div>

      {/* Player Identity Card */}
      <div
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--color-ink)' }}>
          {player.identity.name}
        </div>
        <div
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--space-xs)',
          }}
        >
          {player.age}岁 · {positionLabel} · {player.identity.hometown}
        </div>
        <div
          style={{
            borderTop: '1px solid var(--color-border-light)',
            marginTop: 'var(--space-md)',
            paddingTop: 'var(--space-md)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span>
            📅 {world.currentDate} · 第{world.weekNumber}周
          </span>
          <span>🏟️ {academyName}</span>
        </div>
      </div>

      {/* Player State Bars */}
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
          状态
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <StateBar label="体能" value={playerState.fitness} color="#27ae60" />
          <StateBar label="士气" value={playerState.morale} color="#2980b9" />
          <StateBar label="教练信任" value={playerState.coachTrust} color="#8e44ad" />
          <StateBar label="疲劳" value={playerState.fatigue} color="#e67e22" />
          <div
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              marginTop: 'var(--space-xs)',
            }}
          >
            队内地位：
            {playerState.teamStatus === 'fringe'
              ? '边缘'
              : playerState.teamStatus === 'rotation'
                ? '轮换'
                : playerState.teamStatus === 'regular'
                  ? '常规'
                  : '核心'}
          </div>
        </div>
      </div>

      {/* Attributes */}
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
          属性
        </div>
        {ATTRIBUTE_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 'var(--space-sm)' }}>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                marginBottom: 'var(--space-xs)',
              }}
            >
              {group.label}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2px var(--space-md)',
              }}
            >
              {group.keys.map((key, i) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--text-base)',
                    padding: '1px 0',
                  }}
                >
                  <span style={{ color: 'var(--color-text-secondary)' }}>{group.labels[i]}</span>
                  <span style={{ fontWeight: 'bold' }}>{allAttrs[key] ?? '-'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Events */}
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
          最近动态
        </div>
        {save.ledger.length <= 1 && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            暂无记录 - 开始你的第一周训练吧！
          </div>
        )}
        {save.ledger
          .slice(-5)
          .reverse()
          .map((entry, i) => (
            <div
              key={i}
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                padding: 'var(--space-xs) 0',
                borderBottom:
                  i < Math.min(save.ledger.length, 5) - 1
                    ? '1px solid var(--color-border-light)'
                    : 'none',
              }}
            >
              {entry.type === 'career-started' && `🎯 生涯开始于 ${entry.date}`}
              {entry.type === 'youth-opportunity-chosen' && `🏟️ 加入 ${entry.academyName}`}
              {entry.type === 'week-advanced' && `📅 第 ${entry.week} 周`}
              {entry.type === 'training-week' && `🏋️ 训练：${entry.focus}`}
              {entry.type === 'match-week' &&
                `⚽ 比赛：${entry.played ? `${entry.homeScore}-${entry.awayScore} (评分 ${entry.rating})` : `未出场`}`}
              {entry.type === 'event-week' && `📰 ${entry.title}`}
            </div>
          ))}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-lg)',
          display: 'flex',
          gap: 'var(--space-md)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={handleAdvance}
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
          推进一周 →
        </button>
        <button
          onClick={onNewCareer}
          style={{
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            padding: 'var(--space-md) 20px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-base)',
            cursor: 'pointer',
          }}
        >
          新生涯
        </button>
      </div>
    </div>
  );
}

function StateBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 'var(--text-sm)',
          marginBottom: '2px',
        }}
      >
        <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 'bold', color }}>{value}</span>
      </div>
      <div
        style={{
          background: 'var(--color-bg-muted)',
          borderRadius: '10px',
          height: '8px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: color,
            width: `${value}%`,
            height: '100%',
            borderRadius: '10px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
