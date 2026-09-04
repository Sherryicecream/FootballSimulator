import { describe, expect, it } from 'vitest';
import { EventChoiceSchema } from '../src/event';

describe('EventChoice narrative variants', () => {
  it('validates and preserves a bounded set of authored dialogue groups', () => {
    const parsed = EventChoiceSchema.parse({
      id: 'clarify',
      text: '当面澄清误会',
      riskLabel: 'medium',
      effects: {},
      narrativeVariants: [
        { response: '先把事实说清楚。', followUp: '教练会继续观察。', resultTitle: '误会已澄清' },
        { response: '你承认表达不够清楚。', followUp: '下一次训练会重新检验默契。' },
      ],
    });

    expect(parsed.narrativeVariants).toHaveLength(2);
    expect(parsed.narrativeVariants?.[0]?.resultTitle).toBe('误会已澄清');
    expect(parsed.narrativeVariants?.[1]?.response).toContain('表达');
  });
});
