import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EventFeedback } from '@football/contracts';
import { EventChoicePanel } from '../../src/event-choice/EventChoicePanel';
import { EventFeedbackPanel } from '../../src/event-choice/EventFeedbackPanel';
import {
  isMatchMomentEventId,
  matchMomentSceneKind,
} from '../../src/career-dashboard/career-presentation';

describe('match moment presentation', () => {
  it('recognizes match moment events and feedback by identifier', () => {
    expect(matchMomentSceneKind({ storyId: 'match-moment' })).toBe('match');
    expect(matchMomentSceneKind({ storyId: 'other-story' })).toBeNull();
    expect(matchMomentSceneKind(null)).toBeNull();
    expect(isMatchMomentEventId('match-moment-pro-match-2031-W40-cup-2')).toBe(true);
    expect(isMatchMomentEventId('coach-video-review')).toBe(false);
  });

  it('renders the pending moment with the match scene and intent choices', () => {
    render(
      <EventChoicePanel
        event={{
          eventId: 'match-moment-pro-match-1',
          title: '关键时刻 · 对阵强敌',
          description: '比分 0:0，双方僵持不下。选择你此刻的行动意图。',
          interaction: 'decision',
          resolvedChoiceId: null,
          participantIds: [],
          factRefs: ['pro-match-1'],
          storyId: 'match-moment',
          nextEventIds: [],
          choices: [
            {
              id: 'intent-a',
              text: '反越位前插，抢在门将之前处理球',
              riskLabel: '关键抉择',
              effects: { confidence: 1 },
            },
            {
              id: 'intent-b',
              text: '回撤做球，为队友拉出空当',
              riskLabel: '关键抉择',
              effects: {},
            },
          ],
        }}
        sceneKind="match"
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { name: '关键时刻 · 对阵强敌' })).toBeDefined();
    expect(screen.getByText('反越位前插，抢在门将之前处理球')).toBeDefined();
    expect(screen.queryByText('未知风险')).toBeNull();
  });

  it('renders moment feedback with the match scene', () => {
    const feedback: EventFeedback = {
      eventId: 'match-moment-pro-match-1',
      title: '关键时刻 · 对阵强敌',
      choiceId: 'intent-a',
      choiceText: '反越位前插，抢在门将之前处理球',
      resultTitle: '高光时刻',
      resultTone: 'success',
      response: '你的跑位撕开了防线，全场为你起立。',
      participantResponses: [],
      stateChanges: [{ key: 'confidence', oldValue: 60, newValue: 63 }],
      relationshipChanges: [],
      followUp: '教练组会在赛后复盘里提到这次跑位。',
    };
    render(<EventFeedbackPanel feedback={feedback} sceneKind="match" onContinue={() => {}} />);
    expect(screen.getByText('高光时刻')).toBeDefined();
    expect(screen.getByText('你的跑位撕开了防线，全场为你起立。')).toBeDefined();
  });
});
