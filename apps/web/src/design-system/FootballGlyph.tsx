import type { ReactNode } from 'react';

export type FootballGlyphName =
  | 'training'
  | 'match'
  | 'locker-room'
  | 'recovery'
  | 'fitness'
  | 'fatigue'
  | 'morale'
  | 'form'
  | 'coach-trust'
  | 'relationship'
  | 'warning';

export interface FootballGlyphProps {
  name: FootballGlyphName;
  label?: string;
  size?: number;
}

const glyphPaths: Record<FootballGlyphName, ReactNode> = {
  training: (
    <>
      <path d="M4 18h16" />
      <path d="M7 18l1.5-8h7L17 18" />
      <path d="M8.5 10l1.5-3h4l1.5 3" />
      <path d="M10 13h4" />
    </>
  ),
  match: (
    <>
      <path d="M12 3.5l3 2 1.1 3.4-2.1 2.8h-4L7.9 8.9 9 5.5z" />
      <path d="M9 5.5L6 5.2 3.8 8l1.1 3.4 3 1.1M15 5.5l3-.3L20.2 8l-1.1 3.4-3 1.1M10 11.7l-1.5 3.1L10 18h4l1.5-3.2-1.5-3.1M5 11.4l-1.7 2.8L5 17.5l3.3.1M19 11.4l1.7 2.8-1.7 3.3-3.3.1" />
    </>
  ),
  'locker-room': (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9.3 4v16M14.7 4v16M6.5 8h1M11 8h1M16.5 8h1M6.5 16h1M11 16h1M16.5 16h1" />
    </>
  ),
  recovery: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 5v5h-5" />
      <path d="M12 8v4l2.5 1.5" />
    </>
  ),
  fitness: (
    <>
      <path d="M6 9v6M3.8 10.5v3M18 9v6M20.2 10.5v3M6 12h12" />
    </>
  ),
  fatigue: (
    <>
      <rect x="4" y="6" width="15" height="12" rx="2" />
      <path d="M19 10h2v4h-2M8 10v4M11 10v4M14 10v4" />
    </>
  ),
  morale: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  form: (
    <>
      <path d="M4 17l5-5 3 2 7-7" />
      <path d="M15 7h4v4" />
    </>
  ),
  'coach-trust': (
    <>
      <path d="M6 4h12v4H6zM8 8v8M16 8v8M5 20h14M10 12h4M10 16h4" />
    </>
  ),
  relationship: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 19c.5-3 2.3-4.5 5.5-4.5s5 1.5 5.5 4.5M14 15c3.2-.8 5.2.6 6 3" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3l9 17H3z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
};

export const FootballGlyph = ({ name, label, size = 20 }: FootballGlyphProps) => (
  <svg
    className="football-glyph"
    data-glyph={name}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    focusable="false"
  >
    {glyphPaths[name]}
  </svg>
);
