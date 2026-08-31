import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventFeedback } from '@football/contracts';
import { EventFeedbackPanel } from '../../src/event-choice/EventFeedbackPanel';

const feedback: EventFeedback = {
  eventId: 'misunderstanding-clarification',
  title: '训练场上的误会',
  choiceId: 'clarify',
  choiceText: '当面澄清误会，把训练中的情况说清楚',
  response: '你把事情说清楚了，训练场的空气终于松动下来。',
  participantResponses: [
    {
      personId: 'coach-main',
      personName: '周岚教练',
      role: 'youth-coach',
      text: '周岚教练：“愿意把问题说开，这是成熟的表现。”',
    },
    {
      personId: 'teammate-1',
      personName: '陈放',
      role: 'teammate',
      text: '陈放：“那我们别把误会带进下一场比赛。”',
    },
  ],
  stateChanges: [{ key: 'confidence', oldValue: 60, newValue: 62 }],
  relationshipChanges: [
    {
      personId: 'coach-main',
      personName: '周岚教练',
      dimension: 'trust',
      oldValue: 50,
      newValue: 52,
      delta: 2,
    },
  ],
  followUp: '教练会在接下来两周观察你们的沟通。',
};

describe('EventFeedbackPanel', () => {
  it('shows the selected choice, participant dialogue, and explainable changes', () => {
    render(<EventFeedbackPanel feedback={feedback} onContinue={() => {}} />);

    expect(screen.getByRole('heading', { name: '训练场上的误会' })).toBeDefined();
    expect(screen.getByText(feedback.response)).toBeDefined();
    expect(screen.getByText(feedback.participantResponses[0]!.text)).toBeDefined();
    expect(screen.getByText(feedback.participantResponses[1]!.text)).toBeDefined();
    expect(screen.getByText('信心')).toBeDefined();
    expect(screen.getByText((content) => content.includes('教练信任'))).toBeDefined();
    expect(screen.getByText('后续影响')).toBeDefined();
    expect(screen.getByText(feedback.followUp)).toBeDefined();
  });

  it('shows the shared football scene when the event theme is known', () => {
    render(
      <EventFeedbackPanel feedback={feedback} sceneKind="locker-room" onContinue={() => {}} />,
    );

    expect(screen.getByRole('region', { name: '足球场景：训练场上的误会' })).toBeVisible();
    expect(screen.getByText('现场结果')).toBeVisible();
    expect(screen.getByText('人物回应')).toBeVisible();
    expect(screen.getByText('变化记录')).toBeVisible();
    expect(screen.getByText('后续影响')).toBeVisible();
  });

  it('continues only after the player acknowledges the feedback', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<EventFeedbackPanel feedback={feedback} onContinue={onContinue} />);

    await user.click(screen.getByRole('button', { name: '继续推进' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
