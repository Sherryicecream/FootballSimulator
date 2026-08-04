# Bootstrap Web UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the responsive single-page wizard UI for the career bootstrap flow: create player → choose youth opportunity → view career summary.

**Architecture:** Vite 8 + React 19 SPA inside `apps/web`. Uses `@football/application` use cases for all simulation logic and `@football/content` for region data. UI state is managed by React `useState` with three visible steps. No routing library needed.

**Tech Stack:** React 19, Vite 8, TypeScript, Vitest, @testing-library/react, jsdom, Playwright

**Visual Style:** Sports-magazine editorial: off-white canvas (#f8f6f2), dark ink (#1a1a1a), red accent (#c0392b), Georgia serif font.

---

### Task 1: Install Frontend Dependencies

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/tsconfig.json` (update to include DOM libs)
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Modify: `package.json` (root scripts)
- Modify: `pnpm-lock.yaml` (generated)

- [ ] **Step 1: Add React and Vite dependencies**

Run:
```powershell
cd d:/CodexProgram/FootballSimulator
pnpm --filter @football/web add react@19.2.8 react-dom@19.2.8 @football/application@workspace:* @football/content@workspace:* @football/contracts@workspace:*
pnpm --filter @football/web add -D vite@8.2.0 @vitejs/plugin-react@6.0.5 @testing-library/react@16.3.2 @testing-library/user-event@14.6.3 jsdom@30.0.1 @types/react@19.2.18 @types/react-dom@19.2.4
```

- [ ] **Step 2: Update web tsconfig for DOM**

Update `apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "vite.config.ts"]
}
```

- [ ] **Step 3: Create Vite config**

Create `apps/web/vite.config.ts`:
```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
  },
});
```

- [ ] **Step 4: Create HTML entry**

Create `apps/web/index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>足球生涯模拟器</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: Add root scripts**

Add to root `package.json` scripts:
```json
"dev": "pnpm --filter @football/web exec vite",
"build": "pnpm --filter @football/web exec vite build",
```

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter @football/web typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```powershell
git add apps/web/package.json apps/web/tsconfig.json apps/web/vite.config.ts apps/web/index.html package.json pnpm-lock.yaml
git commit -m "chore: install frontend dependencies and configure Vite"
```

---

### Task 2: Create Design System Tokens and Global Styles

**Files:**
- Create: `apps/web/src/design-system/tokens.css`
- Create: `apps/web/src/app/app.css`

- [ ] **Step 1: Create CSS design tokens**

Create `apps/web/src/design-system/tokens.css`:
```css
:root {
  /* Colors */
  --color-canvas: #f8f6f2;
  --color-ink: #1a1a1a;
  --color-accent: #c0392b;
  --color-accent-hover: #a93226;
  --color-card: #ffffff;
  --color-border: #dddddd;
  --color-border-light: #eeeeee;
  --color-text-secondary: #666666;
  --color-text-muted: #999999;
  --color-risk-low: #27ae60;
  --color-risk-medium: #f39c12;
  --color-risk-high: #e74c3c;
  --color-bg-muted: #f0f0f0;

  /* Typography */
  --font-serif: Georgia, 'Times New Roman', serif;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* Font sizes */
  --text-xs: 12px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-lg: 15px;
  --text-xl: 17px;
  --text-2xl: 20px;
  --text-3xl: 24px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 4px rgba(0,0,0,0.1);
}
```

- [ ] **Step 2: Create global app styles**

Create `apps/web/src/app/app.css`:
```css
@import '../design-system/tokens.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-serif);
  background: var(--color-canvas);
  color: var(--color-ink);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

input, select, button, textarea {
  font-family: var(--font-sans);
}

.app {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-2xl) var(--space-lg);
  min-height: 100vh;
}

@media (max-width: 720px) {
  .app {
    padding: var(--space-lg) var(--space-md);
  }
}
```

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/design-system/tokens.css apps/web/src/app/app.css
git commit -m "feat(web): add design system tokens and global styles"
```

---

### Task 3: Create Bootstrap Dependencies

**Files:**
- Create: `apps/web/src/app/bootstrap-dependencies.ts`

- [ ] **Step 1: Write the test**

Create `apps/web/tests/bootstrap-dependencies.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createBootstrapContent } from '../src/app/bootstrap-dependencies';

describe('bootstrapDependencies', () => {
  it('creates content port with region lookup', () => {
    const content = createBootstrapContent();
    const shanghai = content.getRegionProfile('shanghai');
    expect(shanghai).toBeDefined();
    expect(shanghai!.name).toBe('上海');
  });

  it('returns undefined for unknown region', () => {
    const content = createBootstrapContent();
    expect(content.getRegionProfile('nonexistent')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/tests/bootstrap-dependencies.test.ts --config=vitest.workspace.ts 2>&1 || echo "expected fail"`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement content adapter**

Create `apps/web/src/app/bootstrap-dependencies.ts`:
```ts
import { getRegionProfile } from '@football/content';
import type { BootstrapContentPort } from '@football/application';

export function createBootstrapContent(): BootstrapContentPort {
  return {
    getRegionProfile: (id: string) => getRegionProfile(id),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/tests/bootstrap-dependencies.test.ts --config=vitest.workspace.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/app/bootstrap-dependencies.ts apps/web/tests/bootstrap-dependencies.test.ts
git commit -m "feat(web): add bootstrap content dependencies"
```

---

### Task 4: Create CareerCreationForm Component

**Files:**
- Create: `apps/web/src/career-creation/creation-options.ts`
- Create: `apps/web/src/career-creation/CareerCreationForm.tsx`
- Create: `apps/web/tests/career-creation/CareerCreationForm.test.tsx`

- [ ] **Step 1: Write the component test**

Create `apps/web/tests/career-creation/CareerCreationForm.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CareerCreationForm } from '../../src/career-creation/CareerCreationForm';
import { createBootstrapContent } from '../../src/app/bootstrap-dependencies';

describe('CareerCreationForm', () => {
  it('renders all form fields', () => {
    render(<CareerCreationForm onComplete={() => {}} content={createBootstrapContent()} />);
    expect(screen.getByLabelText('球员姓名')).toBeDefined();
    expect(screen.getByLabelText('家乡')).toBeDefined();
    expect(screen.getByLabelText('主位置')).toBeDefined();
    expect(screen.getByLabelText('惯用脚')).toBeDefined();
  });

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup();
    render(<CareerCreationForm onComplete={() => {}} content={createBootstrapContent()} />);
    await user.click(screen.getByText('开始生涯'));
    expect(screen.getByText('请输入球员姓名')).toBeDefined();
  });

  it('calls onComplete with valid form data', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<CareerCreationForm onComplete={onComplete} content={createBootstrapContent()} />);

    await user.type(screen.getByLabelText('球员姓名'), '张伟');
    await user.selectOptions(screen.getByLabelText('家乡'), 'shanghai');
    await user.selectOptions(screen.getByLabelText('主位置'), 'CENTER_BACK');
    await user.click(screen.getByLabelText('右脚'));
    await user.selectOptions(screen.getByLabelText('逆足'), '3');
    await user.selectOptions(screen.getByLabelText('成长背景'), 'academy');
    await user.selectOptions(screen.getByLabelText('性格倾向'), 'composed');
    await user.click(screen.getByText('开始生涯'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const save = onComplete.mock.calls[0][0];
    expect(save.player.identity.name).toBe('张伟');
    expect(save.player.identity.primaryPosition).toBe('CENTER_BACK');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/tests/career-creation/CareerCreationForm.test.tsx --config=vitest.workspace.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Create options constants**

Create `apps/web/src/career-creation/creation-options.ts`:
```ts
export const POSITION_OPTIONS = [
  { value: 'CENTER_BACK', label: '中后卫' },
  { value: 'FULL_BACK', label: '边后卫' },
  { value: 'DEFENSIVE_MIDFIELDER', label: '后腰' },
  { value: 'MIDFIELDER', label: '中场' },
  { value: 'WINGER', label: '边锋' },
  { value: 'FORWARD', label: '前锋' },
] as const;

export const FOOT_OPTIONS = [
  { value: 'LEFT', label: '左脚' },
  { value: 'RIGHT', label: '右脚' },
  { value: 'BOTH', label: '双脚' },
] as const;

export const WEAK_FOOT_OPTIONS = [
  { value: '1', label: '1 · 极弱' },
  { value: '2', label: '2 · 较弱' },
  { value: '3', label: '3 · 中等' },
  { value: '4', label: '4 · 较好' },
  { value: '5', label: '5 · 出色' },
] as const;

export const BACKGROUND_OPTIONS = [
  { value: 'academy', label: '青训营' },
  { value: 'school', label: '校园足球' },
  { value: 'community', label: '社区足球' },
  { value: 'late-bloomer', label: '大器晚成' },
] as const;

export const PERSONALITY_OPTIONS = [
  { value: 'ambitious', label: '雄心勃勃' },
  { value: 'composed', label: '沉稳' },
  { value: 'disciplined', label: '自律' },
  { value: 'expressive', label: '张扬' },
] as const;
```

- [ ] **Step 4: Implement CareerCreationForm**

Create `apps/web/src/career-creation/CareerCreationForm.tsx`:
```tsx
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
        <label style={labelStyle}>惯用脚</label>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run apps/web/tests/career-creation/CareerCreationForm.test.tsx --config=vitest.workspace.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/career-creation/ apps/web/tests/career-creation/
git commit -m "feat(web): add career creation form with validation"
```

---

### Task 5: Create YouthOpportunityPanel Component

**Files:**
- Create: `apps/web/src/event-choice/YouthOpportunityPanel.tsx`
- Create: `apps/web/tests/event-choice/YouthOpportunityPanel.test.tsx`

- [ ] **Step 1: Write the component test**

Create `apps/web/tests/event-choice/YouthOpportunityPanel.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YouthOpportunityPanel } from '../../src/event-choice/YouthOpportunityPanel';
import type { YouthOpportunity } from '@football/contracts';

const mockOpportunity: YouthOpportunity = {
  week: 3,
  offers: [
    { id: 'offer-1', academyId: 'academy-a', academyName: '根宝青训基地', pathway: 'local-academy', riskLabel: 'low', description: '本地青训' },
    { id: 'offer-2', academyId: 'academy-b', academyName: '校园精英计划', pathway: 'school-elite', riskLabel: 'medium', description: '校园足球' },
    { id: 'offer-3', academyId: 'academy-c', academyName: '鲁能足校（外地）', pathway: 'relocation-academy', riskLabel: 'high', description: '外地青训' },
  ],
};

describe('YouthOpportunityPanel', () => {
  it('renders all offers', () => {
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={() => {}} />);
    expect(screen.getByText('根宝青训基地')).toBeDefined();
    expect(screen.getByText('校园精英计划')).toBeDefined();
    expect(screen.getByText('鲁能足校（外地）')).toBeDefined();
  });

  it('shows risk labels', () => {
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={() => {}} />);
    expect(screen.getByText('风险：低')).toBeDefined();
    expect(screen.getByText('风险：中')).toBeDefined();
    expect(screen.getByText('风险：高')).toBeDefined();
  });

  it('calls onChoose with selected offer id', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={onChoose} />);

    await user.click(screen.getByText('根宝青训基地'));
    await user.click(screen.getByText('确认选择'));
    expect(onChoose).toHaveBeenCalledWith('offer-1');
  });

  it('disables button when no offer selected', () => {
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={() => {}} />);
    expect(screen.getByText('确认选择')).toBeDisabled();
  });

  it('disables all interactions after choice', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    const { rerender } = render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={onChoose} />);

    await user.click(screen.getByText('根宝青训基地'));
    await user.click(screen.getByText('确认选择'));
    expect(onChoose).toHaveBeenCalled();

    // 模拟父组件 disabled 状态
    render(<YouthOpportunityPanel opportunity={mockOpportunity} onChoose={() => {}} disabled={true} />);
    expect(screen.getByText('确认选择')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/tests/event-choice/YouthOpportunityPanel.test.tsx --config=vitest.workspace.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement YouthOpportunityPanel**

Create `apps/web/src/event-choice/YouthOpportunityPanel.tsx`:
```tsx
import { useState } from 'react';
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

export function YouthOpportunityPanel({ opportunity, onChoose, disabled = false }: YouthOpportunityPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedId) {
      onChoose(selectedId);
    }
  };

  return (
    <div style={{ fontFamily: 'var(--font-serif)' }}>
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
          STEP 2 OF 3
        </div>
        <div style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'bold',
          color: 'var(--color-ink)',
          marginTop: 'var(--space-xs)',
        }}>
          你的青训机会
        </div>
        <div style={{
          fontSize: 'var(--text-lg)',
          color: 'var(--color-text-secondary)',
          marginTop: 'var(--space-xs)',
        }}>
          第 {opportunity.week} 周 · 基于你的家乡和青训设施，有以下路径可选：
        </div>
      </div>

      {opportunity.offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          selected={selectedId === offer.id}
          disabled={disabled}
          onSelect={() => !disabled && setSelectedId(offer.id)}
        />
      ))}

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)', textAlign: 'center' }}>
        <button
          onClick={handleConfirm}
          disabled={!selectedId || disabled}
          style={{
            background: selectedId ? 'var(--color-accent)' : '#ccc',
            color: '#fff',
            border: 'none',
            padding: 'var(--space-md) 40px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-lg)',
            fontWeight: 'bold',
            letterSpacing: '1px',
            cursor: selectedId && !disabled ? 'pointer' : 'not-allowed',
            boxShadow: selectedId ? 'var(--shadow-md)' : 'none',
          }}
        >
          确认选择
        </button>
      </div>
    </div>
  );
}

function OfferCard({ offer, selected, disabled, onSelect }: {
  offer: YouthOffer;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const risk = RISK_COLORS[offer.riskLabel];
  const icon = PATHWAY_ICONS[offer.pathway];

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      style={{
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
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--color-ink)' }}>
            {icon} {offer.academyName}
          </div>
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
            {offer.description}
          </div>
        </div>
        <div style={{
          background: risk.bg,
          color: '#fff',
          padding: 'var(--space-xs) var(--space-md)',
          borderRadius: '14px',
          fontSize: 'var(--text-sm)',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}>
          风险：{risk.label}
        </div>
      </div>
      {selected && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)', marginTop: 'var(--space-sm)', fontStyle: 'italic' }}>
          ← 已选中
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run apps/web/tests/event-choice/YouthOpportunityPanel.test.tsx --config=vitest.workspace.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/event-choice/ apps/web/tests/event-choice/
git commit -m "feat(web): add youth opportunity panel with offer selection"
```

---

### Task 6: Create BootstrapCareerSummary Component

**Files:**
- Create: `apps/web/src/career-dashboard/BootstrapCareerSummary.tsx`
- Create: `apps/web/tests/career-dashboard/BootstrapCareerSummary.test.tsx`

- [ ] **Step 1: Write the component test**

Create `apps/web/tests/career-dashboard/BootstrapCareerSummary.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BootstrapCareerSummary } from '../../src/career-dashboard/BootstrapCareerSummary';
import type { CareerSave } from '@football/contracts';

const mockSave: CareerSave = {
  schemaVersion: 1,
  contentVersion: 'bootstrap-1',
  careerId: 'career-test',
  player: {
    identity: {
      name: '张伟', hometown: '上海', dateOfBirth: '2008-06-15',
      primaryPosition: 'CENTER_BACK', secondaryPosition: 'FULL_BACK',
      preferredFoot: 'RIGHT', weakFootLevel: 30,
      growthBackground: '城市青训', personalityTendency: 'balanced',
    },
    attributes: {
      technical: { firstTouch: 60, dribbling: 65, passing: 70, shooting: 55, defending: 50, aerialAbility: 62 },
      physical: { pace: 78, strength: 68, stamina: 72, agility: 74 },
      mental: { offTheBall: 60, vision: 65, decision: 63, composure: 67, determination: 75, discipline: 70 },
    },
    hiddenTraits: {
      potential: 85, stability: 70, professionalism: 75,
      pressureResistance: 65, adaptability: 60, injuryProneness: 40,
    },
    age: 16, careerStage: 'YOUTH', reputation: 20,
  },
  world: { currentDate: '2024-09-15', season: 2024 },
  context: { academyId: 'academy-b', pendingOpportunity: null },
  relationships: { people: [], edges: [] },
  story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: ['offer-2'] },
  ledger: [
    { type: 'career-started', date: '2024-09-01', playerName: '张伟', age: 16, position: 'CENTER_BACK' },
    { type: 'week-advanced', date: '2024-09-08', week: 2 },
    { type: 'week-advanced', date: '2024-09-15', week: 3 },
    { type: 'youth-opportunity-chosen', date: '2024-09-15', week: 3, offerId: 'offer-2', academyId: 'academy-b', academyName: '校园精英计划' },
  ],
};

describe('BootstrapCareerSummary', () => {
  it('renders player name and age', () => {
    render(<BootstrapCareerSummary save={mockSave} />);
    expect(screen.getByText('张伟')).toBeDefined();
    expect(screen.getByText(/16岁/)).toBeDefined();
  });

  it('shows academy placement', () => {
    render(<BootstrapCareerSummary save={mockSave} />);
    expect(screen.getByText('校园精英计划')).toBeDefined();
  });

  it('shows attribute summary', () => {
    render(<BootstrapCareerSummary save={mockSave} />);
    expect(screen.getByText('60')).toBeDefined(); // firstTouch
    expect(screen.getByText('78')).toBeDefined(); // pace
  });

  it('shows seed fingerprint', () => {
    render(<BootstrapCareerSummary save={mockSave} />);
    expect(screen.getByText(/career-test/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/tests/career-dashboard/BootstrapCareerSummary.test.tsx --config=vitest.workspace.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement BootstrapCareerSummary**

Create `apps/web/src/career-dashboard/BootstrapCareerSummary.tsx`:
```tsx
import type { CareerSave } from '@football/contracts';

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
  { key: 'firstTouch', label: '停球' },
  { key: 'dribbling', label: '盘带' },
  { key: 'passing', label: '传球' },
  { key: 'shooting', label: '射门' },
  { key: 'defending', label: '防守' },
  { key: 'aerialAbility', label: '空中' },
  { key: 'pace', label: '速度' },
  { key: 'strength', label: '力量' },
  { key: 'stamina', label: '耐力' },
  { key: 'agility', label: '灵活' },
  { key: 'movement', label: '跑位' },
  { key: 'vision', label: '视野' },
  { key: 'decisions', label: '决策' },
  { key: 'composure', label: '镇定' },
  { key: 'determination', label: '意志' },
  { key: 'discipline', label: '纪律' },
] as const;

export function BootstrapCareerSummary({ save }: BootstrapCareerSummaryProps) {
  const { player, context, world, careerId } = save;
  const { identity, attributes } = player;
  const positionLabel = POSITION_LABELS[identity.primaryPosition] ?? identity.primaryPosition;

  // 获取最后选择的青训学院名称
  const lastChosen = [...save.ledger].reverse().find(e => e.type === 'youth-opportunity-chosen');

  // 提取所有属性到扁平对象
  const allAttrs: Record<string, number> = {
    ...attributes.technical,
    ...attributes.physical,
    ...attributes.mental,
  };

  return (
    <div style={{ fontFamily: 'var(--font-serif)' }}>
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
          STEP 3 OF 3 · 已完成
        </div>
        <div style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'bold',
          color: 'var(--color-ink)',
          marginTop: 'var(--space-xs)',
        }}>
          生涯已启动
        </div>
      </div>

      {/* 球员身份卡 */}
      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        marginBottom: 'var(--space-lg)',
      }}>
        <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--color-ink)' }}>
          {identity.name}
        </div>
        <div style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
          {player.age}岁 · {positionLabel} · {identity.hometown}
        </div>
        <div style={{
          borderTop: '1px solid var(--color-border-light)',
          marginTop: 'var(--space-md)',
          paddingTop: 'var(--space-md)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)',
        }}>
          <span>📅 {world.currentDate}</span>
          <span>🏟️ {lastChosen?.type === 'youth-opportunity-chosen' ? lastChosen.academyName : '待定'}</span>
        </div>
      </div>

      {/* 属性摘要 */}
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-ink)', marginBottom: 'var(--space-sm)' }}>
        初始属性
      </div>
      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-lg)',
        marginBottom: 'var(--space-lg)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-sm)',
        }}>
          {KEY_ATTRIBUTES.map(({ key, label }) => (
            <div
              key={key}
              style={{
                fontSize: 'var(--text-base)',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '2px 0',
              }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
              <span style={{ fontWeight: 'bold' }}>{allAttrs[key] ?? '-'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 种子指纹 */}
      <div style={{
        background: 'var(--color-bg-muted)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-sm) var(--space-md)',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-mono)',
        textAlign: 'center',
      }}>
        种子指纹：{careerId} · 第 1 周
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run apps/web/tests/career-dashboard/BootstrapCareerSummary.test.tsx --config=vitest.workspace.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/career-dashboard/ apps/web/tests/career-dashboard/
git commit -m "feat(web): add bootstrap career summary with attributes"
```

---

### Task 7: Create App Root Component and Entry Point

**Files:**
- Create: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/index.tsx` (replace index.ts)

- [ ] **Step 1: Write the integration test**

Create `apps/web/tests/app/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../../src/app/App';

describe('App', () => {
  it('renders creation form as first step', () => {
    render(<App />);
    expect(screen.getByText('STEP 1 OF 3')).toBeDefined();
    expect(screen.getByText('基本信息')).toBeDefined();
  });

  it('has a single level-one heading', () => {
    render(<App />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Implement App component**

Create `apps/web/src/app/App.tsx`:
```tsx
import { useState } from 'react';
import type { CareerSave } from '@football/contracts';
import { createBootstrapContent } from './bootstrap-dependencies';
import { CareerCreationForm } from '../career-creation/CareerCreationForm';
import { YouthOpportunityPanel } from '../event-choice/YouthOpportunityPanel';
import { BootstrapCareerSummary } from '../career-dashboard/BootstrapCareerSummary';
import { createAdvanceToDecision, createSubmitYouthChoice } from '@football/application';
import './app.css';

type FlowStep = 'creation' | 'opportunity' | 'summary';

const content = createBootstrapContent();
const advanceToDecision = createAdvanceToDecision(content);
const submitYouthChoice = createSubmitYouthChoice(content);

export function App() {
  const [step, setStep] = useState<FlowStep>('creation');
  const [save, setSave] = useState<CareerSave | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreationComplete = (careerSave: CareerSave) => {
    setSave(careerSave);
    setLoading(true);
    // 推进到决策
    try {
      const pending = advanceToDecision({
        playerName: careerSave.player.identity.name,
        hometown: careerSave.player.identity.hometown,
        primaryPosition: careerSave.player.identity.primaryPosition,
        preferredFoot: careerSave.player.identity.preferredFoot,
        weakFootLevel: careerSave.player.identity.weakFootLevel,
        growthBackground: careerSave.player.identity.growthBackground,
        personalityTendency: careerSave.player.identity.personalityTendency,
        regionId: careerSave.player.identity.hometown, // simplified
        seed: careerSave.randomState.seed,
      });
      setSave(pending);
      setStep('opportunity');
    } catch (err) {
      console.error('Failed to advance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = (offerId: string) => {
    if (!save) return;
    const updated = submitYouthChoice(save, offerId);
    setSave(updated);
    setStep('summary');
  };

  return (
    <div className="app" role="main">
      <h1 style={{
        fontSize: 'var(--text-2xl)',
        color: 'var(--color-ink)',
        marginBottom: 'var(--space-2xl)',
        letterSpacing: '1px',
      }}>
        足球生涯模拟器
      </h1>

      {step === 'creation' && (
        <CareerCreationForm onComplete={handleCreationComplete} content={content} />
      )}

      {step === 'opportunity' && save?.context.pendingOpportunity && (
        <YouthOpportunityPanel
          opportunity={save.context.pendingOpportunity}
          onChoose={handleChoice}
          disabled={loading}
        />
      )}

      {step === 'summary' && save && (
        <BootstrapCareerSummary save={save} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create entry point**

Replace `apps/web/src/index.ts` with `apps/web/src/index.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run apps/web/tests/app/App.test.tsx --config=vitest.workspace.ts`
Expected: PASS

- [ ] **Step 5: Run full typecheck**

Run: `pnpm -r typecheck`
Expected: All packages pass

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/index.tsx apps/web/src/index.ts apps/web/src/app/App.tsx apps/web/tests/app/
git commit -m "feat(web): add app root component and entry point"
```

---

### Task 8: Configure Vitest Workspace for Web Tests

**Files:**
- Create: `vitest.workspace.ts`

- [ ] **Step 1: Create Vitest workspace config**

Create `vitest.workspace.ts` at root:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['apps/web/tests/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 2: Verify all tests pass**

Run: `npx vitest run --config=vitest.workspace.ts`
Expected: All web tests PASS

- [ ] **Step 3: Add web test script to package.json**

Add to `apps/web/package.json`:
```json
"scripts": {
  "typecheck": "tsc -p tsconfig.json",
  "test": "vitest run --config=../../vitest.workspace.ts"
}
```

- [ ] **Step 4: Commit**

```powershell
git add vitest.workspace.ts apps/web/package.json
git commit -m "chore: configure vitest workspace for web tests"
```

---

### Task 9: Configure Playwright and E2E Tests

**Files:**
- Create: `playwright.config.ts`
- Create: `apps/web/tests/e2e/bootstrap-career.spec.ts`

- [ ] **Step 1: Install Playwright**

Run:
```powershell
cd d:/CodexProgram/FootballSimulator
pnpm add -Dw @playwright/test@1.62.1
pnpm exec playwright install chromium
```

- [ ] **Step 2: Create Playwright config**

Create `playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/tests/e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { viewport: { width: 412, height: 915 } },
    },
  ],
  webServer: {
    command: 'pnpm --filter @football/web exec vite --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 3: Write E2E test**

Create `apps/web/tests/e2e/bootstrap-career.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test.describe('Bootstrap Career Flow', () => {
  test('complete flow on desktop', async ({ page }) => {
    await page.goto('/');

    // Step 1: Create player
    await expect(page.getByText('STEP 1 OF 3')).toBeVisible();
    await page.fill('input[aria-label="球员姓名"]', '林岳');
    await page.selectOption('select[aria-label="家乡"]', 'shanghai');
    await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
    await page.click('label:has-text("右脚")');
    await page.click('text=开始生涯');

    // Step 2: Youth opportunity
    await expect(page.getByText('STEP 2 OF 3')).toBeVisible();
    await expect(page.getByText('你的青训机会')).toBeVisible();
    // Select first offer
    const offers = page.locator('[role="button"][aria-pressed]');
    await offers.first().click();
    await page.click('text=确认选择');

    // Step 3: Career summary
    await expect(page.getByText('STEP 3 OF 3')).toBeVisible();
    await expect(page.getByText('林岳')).toBeVisible();
    await expect(page.getByText('生涯已启动')).toBeVisible();
  });

  test('same seed produces same result', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[aria-label="球员姓名"]', '测试球员');
    await page.selectOption('select[aria-label="家乡"]', 'shanghai');
    await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
    await page.click('label:has-text("右脚")');
    await page.fill('input[aria-label="随机种子"]', '42');
    await page.click('text=开始生涯');

    // Get first offer name
    const firstOffer = await page.locator('[role="button"][aria-pressed]').first().textContent();

    await page.goto('/');
    await page.fill('input[aria-label="球员姓名"]', '测试球员');
    await page.selectOption('select[aria-label="家乡"]', 'shanghai');
    await page.selectOption('select[aria-label="主位置"]', 'CENTER_BACK');
    await page.click('label:has-text("右脚")');
    await page.fill('input[aria-label="随机种子"]', '42');
    await page.click('text=开始生涯');

    const secondOffer = await page.locator('[role="button"][aria-pressed]').first().textContent();
    expect(firstOffer).toBe(secondOffer);
  });

  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(412);
  });
});
```

- [ ] **Step 4: Verify E2E test runs**

Run: `pnpm test:e2e`
Expected: PASS (may take a moment to start Vite server)

- [ ] **Step 5: Commit**

```powershell
git add playwright.config.ts apps/web/tests/e2e/ package.json pnpm-lock.yaml
git commit -m "test: add Playwright config and E2E tests"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run all tests**

Run:
```powershell
pnpm --filter @football/contracts test
pnpm --filter @football/simulation test
pnpm --filter @football/content test
pnpm --filter @football/application test
pnpm test:architecture
npx vitest run --config=vitest.workspace.ts
```

Expected: All tests PASS

- [ ] **Step 2: Run typecheck**

Run: `pnpm -r typecheck`
Expected: All packages pass

- [ ] **Step 3: Verify Vite build**

Run: `pnpm --filter @football/web exec vite build`
Expected: Build succeeds, output in `apps/web/dist/`

- [ ] **Step 4: Final commit if needed**

```powershell
git add -A
git commit -m "chore: final verification passing"
```