import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EventFeedback } from '@football/contracts';
import { EventFeedbackPanel } from '../../src/event-choice/EventFeedbackPanel';

const feedback: EventFeedback = {
  eventId: 'misunderstanding-clarification',
  title: '训练场上的误会',
  choiceId: 'clarify',
  choiceText: '当面澄清误会',
  resultTitle: '沟通留下结果',
  resultTone: 'success',
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
  it('renders persisted result tones with text labels and compatibility fallbacks', () => {
    const { container, rerender } = render(
      <EventFeedbackPanel feedback={feedback} onContinue={() => {}} />,
    );
    const cases = [
      { tone: 'success' as const, label: '成功', title: '沟通留下结果' },
      { tone: 'partial' as const, label: '部分达成', title: '误会暂时缓和' },
      { tone: 'failure' as const, label: '受挫', title: '解释需要重来' },
      { tone: 'neutral' as const, label: '中性记录', title: '后续观察中' },
    ];

    for (const result of cases) {
      rerender(
        <EventFeedbackPanel
          feedback={{
            ...feedback,
            resultTitle: result.title,
            resultTone: result.tone,
            outcome: result.tone === 'neutral' ? undefined : feedback.outcome,
          }}
          onContinue={() => {}}
        />,
      );

      expect(screen.getByRole('article', { name: '事件结果：' + result.label })).toBeVisible();
      expect(screen.getByText(result.title)).toBeVisible();
      expect(screen.getByText(result.label)).toBeVisible();
      expect(container.querySelector('.event-feedback-result--' + result.tone)).not.toBeNull();
    }

    rerender(
      <EventFeedbackPanel
        feedback={{
          ...feedback,
          resultTitle: undefined,
          resultTone: undefined,
          outcome: undefined,
        }}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByText('事件暂告一段落')).toBeVisible();
    expect(screen.getByText('中性记录')).toBeVisible();
  });

  it('keeps legacy feedback without an outcome card', () => {
    const legacy = {
      ...feedback,
      resultTitle: undefined,
      resultTone: undefined,
      outcome: undefined,
    };
    render(<EventFeedbackPanel feedback={legacy} onContinue={() => {}} />);

    expect(screen.queryByRole('region', { name: '选择结果' })).toBeNull();
    expect(screen.getByText('事件暂告一段落')).toBeVisible();
  });
});
