import type { FootballGlyphName } from './FootballGlyph';
import { FootballGlyph } from './FootballGlyph';

export type StatusBadgeTone = 'positive' | 'neutral' | 'caution' | 'danger';

export interface StatusBadgeProps {
  glyph: FootballGlyphName;
  label: string;
  value: string | number;
  tone: StatusBadgeTone;
}

export const StatusBadge = ({ glyph, label, value, tone }: StatusBadgeProps) => (
  <span className={'status-badge status-badge--' + tone} role="status">
    <FootballGlyph name={glyph} size={17} />
    <span className="status-badge-label">{label}</span>
    <strong className="status-badge-value">{value}</strong>
  </span>
);
