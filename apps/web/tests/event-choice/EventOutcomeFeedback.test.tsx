import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EventFeedback } from '@football/contracts';
import { EventFeedbackPanel } from '../../src/event-choice/EventFeedbackPanel';

const feedback: EventFeedback = {
  eventId: 'misunderstanding-clarification',
  title: '训练场上的误会',
  choiceId: 'clarify',
  choiceText: '当面澄清误会',
  response: '你把事实说清楚，教练看见了你的成熟。',
  participantResponses: [],
  stateChanges: [],
  relationshipChanges: [],
  followUp: '下一场比赛会检验这次沟通。',
  outcome: {
    outcome: 'success',
    label: '沟通奏效',
    attribute: 'decision',
    attributeValue: 80,
    score: 86,
    target: 58,
    stateModifier: 4,
    variance: 2,
    reason: '决策 80，状态修正 +4，临场波动 +2；综合 86，判定难度 58。',
  },
};

describe('EventFeedbackPanel outcome presentation', () => {
  it('shows the outcome, reason and calculation summary', () => {
    const { container } = render(<EventFeedbackPanel feedback={feedback} onContinue={() => {}} />);

    expect(screen.getByRole('region', { name: '选择结果' })).toBeVisible();
    expect(screen.getByText('沟通奏效')).toBeVisible();
    expect(screen.getByText('判定依据')).toBeVisible();
    expect(screen.getByText(feedback.outcome!.reason)).toBeVisible();
    expect(screen.getByText('决策 80')).toBeVisible();
    expect(screen.getByText('综合 86 / 难度 58')).toBeVisible();
    expect(container.querySelector('.event-feedback-outcome--success')).not.toBeNull();
  });

  it('keeps legacy feedback without an outcome card', () => {
    const legacy = { ...feedback, outcome: undefined };
    render(<EventFeedbackPanel feedback={legacy} onContinue={() => {}} />);

    expect(screen.queryByRole('region', { name: '选择结果' })).toBeNull();
    expect(screen.getByText('现场结果')).toBeVisible();
  });
});
