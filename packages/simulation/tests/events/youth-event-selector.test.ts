import { describe, expect, it } from 'vitest';
import type { EventDefinition } from '@football/contracts';
import { filterEligibleYouthEvents } from '../../src/events/event-selector';
import { createYouthSave } from '../fixtures/youth-save';

const mediaEvent: EventDefinition = {
  id: 'media',
  version: 1,
  category: 'china-youth',
  rarity: 'rare',
  title: '媒体关注',
  description: '赛后采访',
  condition: { requireFactType: 'match' },
  choices: [{ id: 'answer', text: '接受采访', riskLabel: 'low', effects: {} }],
  cooldownWeeks: 8,
  participantRoles: [],
};
const injuryEvent: EventDefinition = {
  ...mediaEvent,
  id: 'injury-choice',
  title: '伤病选择',
  condition: { requireActiveInjury: true },
};

describe('filterEligibleYouthEvents', () => {
  it('requires a recent match fact for media and a real active injury for injury choices', () => {
    const healthy = createYouthSave();
    expect(filterEligibleYouthEvents([mediaEvent, injuryEvent], healthy)).toEqual([]);
    const afterMatch = createYouthSave({
      ledger: [
        {
          id: 'match-1',
          weekKey: '2024-W02',
          type: 'match',
          summary: '突出表现',
          participantIds: [],
        },
      ],
    });
    expect(
      filterEligibleYouthEvents([mediaEvent, injuryEvent], afterMatch).map(({ id }) => id),
    ).toEqual(['media']);
    const injured = createYouthSave({
      health: {
        ...healthy.health,
        activeInjury: {
          id: 'injury-1',
          kind: 'minor',
          bodyArea: '脚踝',
          occurredWeek: '2024-W02',
          expectedRecoveryWeeks: 2,
          recoveredWeeks: 0,
          recurrenceRisk: 0.1,
        },
      },
    });
    expect(
      filterEligibleYouthEvents([mediaEvent, injuryEvent], injured).map(({ id }) => id),
    ).toEqual(['injury-choice']);
  });
});
