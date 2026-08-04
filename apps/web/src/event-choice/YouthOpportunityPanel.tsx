import { useRef, useState } from 'react';
import type { YouthOpportunity, YouthOffer } from '@football/contracts';

interface YouthOpportunityPanelProps {
  opportunity: YouthOpportunity;
  onChoose: (offerId: string) => void;
  disabled?: boolean;
}

const RISK_COLORS = {
  low: { bg: '#27ae60', label: '低' },
  medium: { bg: '#f39c12', label: '中' },
  high: { bg: '#e74c3c', label: '高' },
} as const;

const PATHWAY_ICONS = {
  'local-academy': '🏠',
  'school-elite': '📚',
  'relocation-academy': '✈️',
} as const;

export function YouthOpportunityPanel({
  opportunity,
  onChoose,
  disabled = false,
}: YouthOpportunityPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const committed = useRef(false);

  const handleSelect = (offerId: string) => {
    if (disabled || committed.current) return;
    committed.current = true;
    setSelectedId(offerId);
    onChoose(offerId);
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
          STEP 2 OF 3
        </div>
        <div
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'bold',
            color: 'var(--color-ink)',
            marginTop: 'var(--space-xs)',
          }}
        >
          你的青训机会
        </div>
        <div
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--space-xs)',
          }}
        >
          第 {opportunity.week} 周 · 基于你的家乡和青训设施，有以下路径可选：
        </div>
      </div>

      {opportunity.offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          selected={selectedId === offer.id}
          disabled={disabled}
          onSelect={() => handleSelect(offer.id)}
        />
      ))}
    </div>
  );
}

function OfferCard({
  offer,
  selected,
  disabled,
  onSelect,
}: {
  offer: YouthOffer;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const risk = RISK_COLORS[offer.riskLabel];
  const icon = PATHWAY_ICONS[offer.pathway];

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      style={{
        width: '100%',
        textAlign: 'left',
        border: `${selected ? 2 : 1}px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-lg)',
        marginBottom: 'var(--space-md)',
        background: 'var(--color-card)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled && !selected ? 0.6 : 1,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div
            style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-ink)' }}
          >
            {icon} {offer.academyName}
          </div>
          <div
            style={{
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-secondary)',
              marginTop: 'var(--space-xs)',
            }}
          >
            {offer.description}
          </div>
        </div>
        <div
          style={{
            background: risk.bg,
            color: '#fff',
            padding: 'var(--space-xs) var(--space-md)',
            borderRadius: '14px',
            fontSize: 'var(--text-sm)',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          风险：{risk.label}
        </div>
      </div>
      {selected && (
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-accent)',
            marginTop: 'var(--space-sm)',
            fontStyle: 'italic',
          }}
        >
          ← 已选中
        </div>
      )}
    </button>
  );
}
