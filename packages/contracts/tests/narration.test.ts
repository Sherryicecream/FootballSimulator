import { describe, expect, it } from 'vitest';
import { NarrativePolishOutputSchema, NarrativePolishRequestSchema } from '../src/narration';

const request = {
  schemaVersion: 1,
  promptVersion: 'narrative-polish-v1',
  kind: 'event-feedback',
  context: {
    eventTitle: '训练场上的误会',
    choiceText: '澄清误会',
    playerName: '林河',
    participantNames: ['周教练', '陈默'],
  },
  draft: {
    response: '周教练听完解释后，暂时放下了疑虑。',
    participantResponses: [
      { personId: 'coach-1', personName: '周教练', role: 'youth-coach', text: '先把训练做好。' },
      { personId: 'mate-1', personName: '陈默', role: 'teammate', text: '下次我会先问清楚。' },
    ],
    followUp: '下一场训练中，你们的配合会受到观察。',
  },
} as const;

describe('narration contracts', () => {
  it('accepts a minimal polish request and text-only output', () => {
    expect(NarrativePolishRequestSchema.parse(request)).toEqual(request);
    expect(
      NarrativePolishOutputSchema.parse({
        response: '周教练听完解释后，语气缓和了一些。',
        participantResponses: [
          { personId: 'coach-1', text: '先把训练做好。' },
          { personId: 'mate-1', text: '下次我会先问清楚。' },
        ],
        followUp: '下一场训练中，配合会受到更多观察。',
      }),
    ).toBeTruthy();
  });

  it('rejects mechanical fields from an AI response', () => {
    expect(() =>
      NarrativePolishOutputSchema.parse({
        response: '周教练听完解释后，语气缓和了一些。',
        participantResponses: [
          { personId: 'coach-1', text: '先把训练做好。' },
          { personId: 'mate-1', text: '下次我会先问清楚。' },
        ],
        followUp: '下一场训练中，配合会受到更多观察。',
        effects: { coachTrust: 99 },
      }),
    ).toThrow();
  });
});
