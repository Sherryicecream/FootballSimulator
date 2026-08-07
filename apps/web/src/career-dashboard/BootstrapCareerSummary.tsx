import type { CareerSave } from '@football/contracts';
import { labelAttribute } from './career-presentation';

interface BootstrapCareerSummaryProps {
  save: CareerSave;
}

const POSITION_LABELS: Record<string, string> = {
  CENTER_BACK: '中后卫',
  FULL_BACK: '边后卫',
  DEFENSIVE_MIDFIELDER: '后腰',
  MIDFIELDER: '中场',
  WINGER: '边锋',
  FORWARD: '前锋',
};

const KEY_ATTRIBUTES = [
  'firstTouch',
  'dribbling',
  'passing',
  'shooting',
  'defending',
  'aerialAbility',
  'pace',
  'strength',
  'stamina',
  'agility',
  'offTheBall',
  'vision',
  'decision',
  'composure',
  'determination',
  'discipline',
] as const;

export function BootstrapCareerSummary({ save }: BootstrapCareerSummaryProps) {
  const { player, world, careerId } = save;
  const { identity, attributes } = player;
  const positionLabel = POSITION_LABELS[identity.primaryPosition] ?? identity.primaryPosition;

  const lastChosen = [...save.ledger].reverse().find((e) => e.type === 'youth-opportunity-chosen');

  const allAttrs: Record<string, number> = {
    ...attributes.technical,
    ...attributes.physical,
    ...attributes.mental,
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
          STEP 3 OF 3 · 已完成
        </div>
        <div
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'bold',
            color: 'var(--color-ink)',
            marginTop: 'var(--space-xs)',
          }}
        >
          生涯已启动
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
        <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--color-ink)' }}>
          {identity.name}
        </div>
        <div
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--space-xs)',
          }}
        >
          {player.age}岁 · {positionLabel} · {identity.hometown}
        </div>
        <div
          style={{
            borderTop: '1px solid var(--color-border-light)',
            marginTop: 'var(--space-md)',
            paddingTop: 'var(--space-md)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span>📅 {world.currentDate}</span>
          <span>
            🏟️ {lastChosen?.type === 'youth-opportunity-chosen' ? lastChosen.academyName : '待定'}
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 'bold',
          color: 'var(--color-ink)',
          marginBottom: 'var(--space-sm)',
        }}
      >
        初始属性
      </div>
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
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-sm)',
          }}
        >
          {KEY_ATTRIBUTES.map((key) => (
            <div
              key={key}
              style={{
                fontSize: 'var(--text-base)',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '2px 0',
              }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>{labelAttribute(key)}</span>
              <span style={{ fontWeight: 'bold' }}>{allAttrs[key] ?? '-'}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'var(--color-bg-muted)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-sm) var(--space-md)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
          textAlign: 'center',
        }}
      >
        种子指纹：{careerId} · 第{' '}
        {lastChosen?.type === 'youth-opportunity-chosen'
          ? lastChosen.week
          : save.story.bootstrapOpportunityWeek}{' '}
        周
      </div>
    </div>
  );
}
