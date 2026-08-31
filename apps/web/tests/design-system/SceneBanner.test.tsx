import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MonthlyBeat, YouthEventTheme } from '@football/contracts';
import { SceneBanner } from '../../src/design-system/SceneBanner';
import {
  sceneKindForBeat,
  sceneKindForTheme,
} from '../../src/career-dashboard/career-presentation';

describe('SceneBanner', () => {
  it('maps monthly beats and event themes to stable visual scenes', () => {
    const beatScenes: Array<[MonthlyBeat['kind'], string]> = [
      ['training', 'training'],
      ['match', 'match'],
      ['health', 'recovery'],
      ['relationship', 'locker-room'],
      ['first-team', 'match'],
      ['settlement', 'neutral'],
    ];
    const themeScenes: Array<[YouthEventTheme | undefined, string]> = [
      ['match', 'match'],
      ['training', 'training'],
      ['health', 'recovery'],
      ['relationships', 'locker-room'],
      ['off-pitch', 'locker-room'],
      ['trajectory', 'match'],
      [undefined, 'neutral'],
    ];

    for (const [kind, expected] of beatScenes) {
      expect(sceneKindForBeat(kind)).toBe(expected);
    }
    for (const [theme, expected] of themeScenes) {
      expect(sceneKindForTheme(theme)).toBe(expected);
    }
  });

  it('renders a titled scene with decorative art hidden from assistive technology', () => {
    render(
      <SceneBanner
        kind="match"
        eyebrow="比赛日"
        title="下一场比赛"
        detail="球员通道的灯光已经亮起。"
      />,
    );

    expect(screen.getByRole('region', { name: '足球场景：下一场比赛' })).toBeDefined();
    expect(screen.getByText('比赛日')).toBeDefined();
    expect(screen.getByRole('heading', { name: '下一场比赛' })).toBeDefined();
    expect(screen.getByTestId('scene-art')).toHaveAttribute('aria-hidden', 'true');
  });
});
