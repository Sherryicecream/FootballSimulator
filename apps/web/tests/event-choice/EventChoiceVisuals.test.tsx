import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { YouthEventInstance } from '@football/contracts';
import { EventChoicePanel } from '../../src/event-choice/EventChoicePanel';

const event: YouthEventInstance = {
  eventId: 'misunderstanding-clarification',
  title: '训练场上的误会',
  description: '一次配合中的误会让你和队友在训练里出现了几句争执。',
  choices: [
    { id: 'clarify', text: '当面澄清误会', riskLabel: 'low', effects: {} },
    { id: 'avoid', text: '先把注意力放回训练', riskLabel: 'high', effects: {} },
  ],
  resolvedChoiceId: null,
  participantIds: ['coach-main', 'teammate-1'],
  factRefs: [],
  storyId: null,
  nextEventIds: [],
  interaction: 'decision',
};

describe('EventChoicePanel football visuals', () => {
  it('shows a semantic event scene and readable risk badges', () => {
    render(<EventChoicePanel event={event} sceneKind="locker-room" onSubmit={() => {}} />);

    expect(screen.getByRole('region', { name: '足球场景：训练场上的误会' })).toBeVisible();
    expect(screen.getByText('低风险')).toBeVisible();
    expect(screen.getByText('高风险')).toBeVisible();
  });

  it('keeps choice buttons keyboard-operable and commits once', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EventChoicePanel event={event} sceneKind="locker-room" onSubmit={onSubmit} />);

    const choice = screen.getByRole('button', { name: /当面澄清误会.*低风险/ });
    choice.focus();
    await user.keyboard('{Enter}');

    expect(choice).toHaveFocus();
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith('clarify');
  });
});
