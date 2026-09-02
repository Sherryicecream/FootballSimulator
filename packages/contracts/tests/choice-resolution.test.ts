import { describe, expect, it } from 'vitest';
import { EventChoiceSchema } from '../src/event';

describe('choice resolution contract', () => {
  it('accepts an authored three-branch choice resolution', () => {
    const choice = EventChoiceSchema.parse({
      id: 'clarify',
      text: '当面澄清误会',
      riskLabel: 'medium',
      effects: {},
      resolution: {
        attribute: 'decision',
        difficulty: 60,
        volatility: 8,
        outcomes: {
          success: { label: '沟通奏效', effects: { coachTrust: 3 } },
          partial: { label: '误会缓和', effects: { coachTrust: 1 } },
          failure: { label: '解释被误解', effects: { coachTrust: -3 } },
        },
      },
    });

    expect(choice.resolution?.outcomes.failure.label).toBe('解释被误解');
  });

  it('rejects an unknown ability key and incomplete outcome branches', () => {
    expect(() =>
      EventChoiceSchema.parse({
        id: 'invalid-resolution',
        text: '做出选择',
        riskLabel: 'high',
        resolution: {
          attribute: 'luck',
          difficulty: 60,
          outcomes: {
            success: { label: '成功' },
            failure: { label: '失败' },
          },
        },
      }),
    ).toThrow();
  });
});
