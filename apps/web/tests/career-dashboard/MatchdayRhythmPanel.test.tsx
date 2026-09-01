import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MatchdayMoment } from '@football/contracts';
import { MatchdayRhythmPanel } from '../../src/career-dashboard/MatchdayRhythmPanel';

const moment: MatchdayMoment = {
  weekKey: '2024-W03',
  opponentName: '海港青年队',
  opponentStrength: 74,
  difficulty: 'difficult',
  scoreline: '2:1',
  result: 'win',
  playerStatus: 'played',
  preMatch: '对手强度 74，这是一场高强度检验。',
  postMatch: '球队拿下比赛；你出场 70 分钟，评分 7.8。',
};

describe('MatchdayRhythmPanel', () => {
  it('shows the football match replay as a before-and-after scene', () => {
    render(<MatchdayRhythmPanel moments={[moment]} />);

    expect(screen.getByRole('region', { name: '比赛日节奏' })).toBeDefined();
    expect(screen.getByRole('heading', { name: '比赛日回放' })).toBeDefined();
    expect(screen.getByText('海港青年队')).toBeDefined();
    expect(screen.getByText('赛前判断')).toBeDefined();
    expect(screen.getByText('赛后反馈')).toBeDefined();
    expect(screen.getByText('对手强度 74，这是一场高强度检验。')).toBeDefined();
    expect(screen.getByText('球队拿下比赛；你出场 70 分钟，评分 7.8。')).toBeDefined();
  });

  it('does not render a placeholder when the month has no matches', () => {
    const { container } = render(<MatchdayRhythmPanel moments={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
