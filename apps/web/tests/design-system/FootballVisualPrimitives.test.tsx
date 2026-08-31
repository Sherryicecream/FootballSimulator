import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FootballGlyph } from '../../src/design-system/FootballGlyph';
import { StatusBadge } from '../../src/design-system/StatusBadge';

describe('football visual primitives', () => {
  it('renders accessible semantic SVG glyphs', () => {
    render(
      <>
        <FootballGlyph name="match" label="比赛" size={20} />
        <FootballGlyph name="training" label="训练" size={20} />
      </>,
    );

    expect(screen.getByRole('img', { name: '比赛' })).toBeDefined();
    expect(screen.getByRole('img', { name: '训练' })).toBeDefined();
  });

  it('renders a status badge with its value and tone', () => {
    render(<StatusBadge glyph="fatigue" label="疲劳" value={62} tone="caution" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('status-badge--caution');
    expect(badge).toHaveTextContent('疲劳');
    expect(badge).toHaveTextContent('62');
  });
});
