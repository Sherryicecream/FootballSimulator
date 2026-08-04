import { useState, type FormEvent } from 'react';
import { createCareerSave, type StartCareerParams } from '@football/application';
import { getAllRegions } from '@football/content';
import type { BootstrapContentPort } from '@football/application';
import type { CareerSave } from '@football/contracts';
import {
  POSITION_OPTIONS, FOOT_OPTIONS, WEAK_FOOT_OPTIONS,
  BACKGROUND_OPTIONS, PERSONALITY_OPTIONS,
} from './creation-options';

interface CareerCreationFormProps {
  onComplete: (save: CareerSave) => void;
  content: BootstrapContentPort;
}

export function CareerCreationForm({ onComplete, content }: CareerCreationFormProps) {
  const [name, setName] = useState('');
  const [homelandId, setHomelandId] = useState('');
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [preferredFoot, setPreferredFoot] = useState('RIGHT');
  const [weakFoot, setWeakFoot] = useState('3');
  const [background, setBackground] = useState('academy');
  const [personality, setPersonality] = useState('composed');
  const [seed, setSeed] = useState('');
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

    const params: StartCareerParams = {
      playerName: trimmedName,
      hometown: regions.find(r => r.id === homelandId)?.name ?? homelandId,
      primaryPosition: primaryPosition as StartCareerParams['primaryPosition'],
      preferredFoot: preferredFoot as StartCareerParams['preferredFoot'],
      weakFootLevel: parseInt(weakFoot, 10),
      growthBackground: background,
      personalityTendency: personality,
      regionId: homelandId,
      seed: seed ? parseInt(seed, 10) : Math.floor(Math.random() * 2147483647),
    };

    const save = createCareerSave(params);
    onComplete(save);
  };

  return (
    <form onSubmit={handleSubmit} style={{ fontFamily: 'var(--font-serif)' }}>
      <div style={{
        borderBottom: '2px solid var(--color-accent)',
        paddingBottom: 'var(--space-sm)',
        marginBottom: 'var(--space-xl)',
      }}>
        <div style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-accent)',
          textTransform: 'uppercase',
          letterSpacing: '2px',
        }}>
          STEP 1 OF 3
        </div>
        <div style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'bold',
          color: 'var(--color-ink)',
          marginTop: 'var(--space-xs)',
        }}>
          基本信息
        </div>
      </div>

      {error && (
        <div role="alert" style={{
          background: '#fef2f2',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
          fontSize: 'var(--text-base)',
          color: 'var(--color-accent)',
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <label style={labelStyle}>
          球员姓名
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
            aria-label="球员姓名"
            placeholder="输入姓名..."
            maxLength={40}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>
            家乡
            <select
              value={homelandId}
              onChange={e => setHomelandId(e.target.value)}
              style={selectStyle}
              aria-label="家乡"
            >
              <option value="">请选择...</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>
            主位置
            <select
              value={primaryPosition}
              onChange={e => setPrimaryPosition(e.target.value)}
              style={selectStyle}
              aria-label="主位置"
            >
              <option value="">请选择...</option>
              {POSITION_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <label style={labelStyle}>
          惯用脚
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            {FOOT_OPTIONS.map(f => (
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
                  onChange={e => setPreferredFoot(e.target.value)}
                  style={{ display: 'none' }}
                  aria-label={f.label}
                />
                {f.label}
              </label>
            ))}
          </div>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={labelStyle}>
            逆足
            <select value={weakFoot} onChange={e => setWeakFoot(e.target.value)} style={selectStyle} aria-label="逆足">
              {WEAK_FOOT_OPTIONS.map(w => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={labelStyle}>
            成长背景
            <select value={background} onChange={e => setBackground(e.target.value)} style={selectStyle} aria-label="成长背景">
              {BACKGROUND_OPTIONS.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={labelStyle}>
            性格倾向
            <select value={personality} onChange={e => setPersonality(e.target.value)} style={selectStyle} aria-label="性格倾向">
              {PERSONALITY_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <label style={labelStyle}>
          随机种子
          <input
            type="text"
            value={seed}
            onChange={e => setSeed(e.target.value)}
            style={inputStyle}
            placeholder="留空自动生成..."
            aria-label="随机种子"
          />
        </label>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>
          相同种子 + 相同选择 = 完全相同的结果
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)', textAlign: 'center' }}>
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