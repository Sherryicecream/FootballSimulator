import { useState, type FormEvent } from 'react';
import { createCareerSave, type StartCareerParams } from '@football/application';
import { getAllRegions } from '@football/content';
import type { BootstrapContentPort } from '@football/application';
import type { CareerSave } from '@football/contracts';
import { POSITION_OPTIONS, FOOT_OPTIONS } from './creation-options';

interface CareerCreationFormProps {
  onComplete: (save: CareerSave) => void;
  content: BootstrapContentPort;
  seedFactory?: () => number;
}

export function CareerCreationForm({
  onComplete,
  content,
  seedFactory = () => Math.floor(Math.random() * 2147483647),
}: CareerCreationFormProps) {
  const [name, setName] = useState('');
  const [homelandId, setHomelandId] = useState('');
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [preferredFoot, setPreferredFoot] = useState('RIGHT');
  const [error, setError] = useState<string | null>(null);

  const regions = getAllRegions();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('请输入球员姓名');
      return;
    }
    if (!homelandId) {
      setError('请选择家乡');
      return;
    }
    if (!primaryPosition) {
      setError('请选择主位置');
      return;
    }
    const region = content.getRegionProfile(homelandId);
    if (!region) {
      setError('所选家乡资料不可用');
      return;
    }
    const params: StartCareerParams = {
      playerName: trimmedName,
      hometown: region.name,
      primaryPosition: primaryPosition as StartCareerParams['primaryPosition'],
      preferredFoot: preferredFoot as StartCareerParams['preferredFoot'],
      regionId: homelandId,
      seed: seedFactory(),
    };

    const save = createCareerSave(params);
    onComplete(save);
  };

  return (
    <form onSubmit={handleSubmit} style={{ fontFamily: 'var(--font-serif)' }}>
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
          STEP 1 OF 3
        </div>
        <div
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'bold',
            color: 'var(--color-ink)',
            marginTop: 'var(--space-xs)',
          }}
        >
          基本信息
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-accent)',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <label style={labelStyle}>
          球员姓名
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            aria-label="球员姓名"
            placeholder="输入姓名..."
            maxLength={40}
          />
        </label>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>
            家乡
            <select
              value={homelandId}
              onChange={(e) => setHomelandId(e.target.value)}
              style={selectStyle}
              aria-label="家乡"
            >
              <option value="">请选择...</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>
            主位置
            <select
              value={primaryPosition}
              onChange={(e) => setPrimaryPosition(e.target.value)}
              style={selectStyle}
              aria-label="主位置"
            >
              <option value="">请选择...</option>
              {POSITION_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <label style={labelStyle}>
          惯用脚
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            {FOOT_OPTIONS.map((f) => (
              <label
                key={f.value}
                style={{
                  flex: 1,
                  border: `1px solid ${preferredFoot === f.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-sm) var(--space-md)',
                  textAlign: 'center',
                  background: 'var(--color-card)',
                  color: preferredFoot === f.value ? 'var(--color-accent)' : 'var(--color-ink)',
                  fontWeight: preferredFoot === f.value ? 'bold' : 'normal',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <input
                  type="radio"
                  name="preferredFoot"
                  value={f.value}
                  checked={preferredFoot === f.value}
                  onChange={(e) => setPreferredFoot(e.target.value)}
                  style={{ display: 'none' }}
                  aria-label={f.label}
                />
                {f.label}
              </label>
            ))}
          </div>
        </label>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-lg)',
          textAlign: 'center',
        }}
      >
        <button
          type="submit"
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
          开始生涯 →
        </button>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  display: 'block',
  marginBottom: 'var(--space-xs)',
};

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--space-sm) var(--space-md)',
  background: 'var(--color-card)',
  fontSize: 'var(--text-base)',
  color: 'var(--color-ink)',
  width: '100%',
  marginTop: 'var(--space-xs)',
  fontFamily: 'var(--font-sans)',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};
