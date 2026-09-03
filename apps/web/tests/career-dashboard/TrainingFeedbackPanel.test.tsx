import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { TrainingFeedback } from '@football/contracts';
import { TrainingFeedbackPanel } from '../../src/career-dashboard/TrainingFeedbackPanel';

const feedback: TrainingFeedback = {
  plan: { focus: 'technical', intensity: 'intense', positionFocus: 'CENTER_BACK' },
  trainingWeeks: 4,
  totalTrainingLoad: 144,
  averageTrainingLoad: 36,
  totalLoad: 204,
  fitness: { before: 76, after: 73, delta: -3 },
  fatigue: { before: 12, after: 25, delta: 13 },
  attributeChanges: [{ attribute: 'firstTouch', oldValue: 40, newValue: 41 }],
  health: { status: 'none', bodyArea: null, expectedRecoveryWeeks: null },
  matches: {
    appearances: 2,
    minutes: 95,
    averageRating: 7.1,
    status: 'positive',
  },
  conclusion: '高强度技术训练带来了明显的触球进步，但恢复压力正在累积。',
  nextStep: '下个月保留技术重点，并安排更多恢复窗口。',
};

describe('TrainingFeedbackPanel', () => {
  it('turns the simulation feedback into a readable training receipt', () => {
    const { container } = render(<TrainingFeedbackPanel feedback={feedback} />);

    expect(screen.getByRole('region', { name: '训练回执' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '训练回执' })).toBeVisible();
    expect(screen.getByText('技术 · 高强度')).toBeVisible();
    expect(screen.getByText(/4 周训练/)).toBeVisible();
    expect(screen.getByText('训练负荷总计')).toBeVisible();
    expect(screen.getByText('总负荷')).toBeVisible();
    expect(screen.getByText('体能')).toBeVisible();
    expect(screen.getByText('疲劳')).toBeVisible();
    expect(screen.getByText('停球')).toBeVisible();
    expect(screen.getByText('+1')).toBeVisible();
    expect(screen.getByText(feedback.conclusion)).toBeVisible();
    expect(screen.getByText(feedback.nextStep)).toBeVisible();
    expect(container.querySelector('[data-glyph="training"]')).not.toBeNull();
    expect(container.querySelector('[data-glyph="fitness"]')).not.toBeNull();
    expect(container.querySelector('[data-glyph="fatigue"]')).not.toBeNull();
  });

  it('explains no appearance and active injury without inventing extra simulation data', () => {
    const limited: TrainingFeedback = {
      ...feedback,
      matches: { appearances: 0, minutes: 0, averageRating: null, status: 'no-appearance' },
      health: { status: 'active', bodyArea: '左脚踝', expectedRecoveryWeeks: 2 },
      attributeChanges: [],
    };

    render(<TrainingFeedbackPanel feedback={limited} />);

    expect(screen.getAllByText('本月没有出场')).toHaveLength(2);
    expect(screen.getByText('左脚踝 · 预计恢复 2 周')).toBeVisible();
    expect(screen.getByText('本月没有记录到属性变化')).toBeVisible();
  });
});
