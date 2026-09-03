import { describe, expect, it } from 'vitest';
import type { CareerLedgerEntryV2 } from '@football/contracts';
import { buildMonthlyMomentum } from '../../src/career/monthly-momentum';

describe('monthly momentum', () => {
  it('turns a month of ledger facts into four visible beats and a turning point', () => {
    const facts: CareerLedgerEntryV2[] = [
      fact('training-2024-W02', '2024-W02', 'training', 'technical/normal，周负荷 36'),
      fact('match-2024-W03', '2024-W03', 'match', '浦江青年队 1:0；出场 30 分钟，评分 7.2'),
      fact(
        'decision-confidence-slump-talk-4',
        '2024-W04',
        'decision',
        '[低谷期的谈话] 坦白说出自己的压力',
      ),
      fact('settlement-2024-09', '2024-W05', 'monthly-settlement', '月末成长结算：传球 50→51'),
    ];

    const momentum = buildMonthlyMomentum(facts, []);

    expect(momentum.beats).toHaveLength(4);
    expect(momentum.beats.map(({ kind }) => kind)).toEqual([
      'training',
      'match',
      'decision',
      'settlement',
    ]);
    expect(momentum.tone).toBe('turning-point');
    expect(momentum.title).toContain('低谷期的谈话');
    expect(momentum.nextFocus).toContain('后续');
  });
  it('keeps the persisted beat timeline within the monthly report contract', () => {
    const facts: CareerLedgerEntryV2[] = Array.from({ length: 6 }, (_, index) =>
      fact(
        `training-2024-W0${index + 1}`,
        `2024-W0${index + 1}`,
        'training',
        'technical/normal，周负荷 36',
      ),
    );

    const momentum = buildMonthlyMomentum(facts, []);

    expect(momentum.beats).toHaveLength(5);
    expect(momentum.beats[0]?.weekKey).toBe('2024-W01');
    expect(momentum.beats.at(-1)?.weekKey).toBe('2024-W06');
  });
});

const fact = (
  id: string,
  weekKey: string,
  type: CareerLedgerEntryV2['type'],
  summary: string,
): CareerLedgerEntryV2 => ({
  id,
  weekKey,
  type,
  summary,
  participantIds: [],
});
