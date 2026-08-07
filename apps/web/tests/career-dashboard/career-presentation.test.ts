import { describe, expect, it } from 'vitest';
import type { CareerLedgerEntryV2, CareerSaveV2 } from '@football/contracts';
import {
  buildRecentRecords,
  labelAttribute,
} from '../../src/career-dashboard/career-presentation';

describe('career presentation', () => {
  it('maps every player-facing attribute to Chinese', () => {
    expect(labelAttribute('firstTouch')).toBe('停球');
    expect(labelAttribute('aerialAbility')).toBe('头球');
    expect(labelAttribute('offTheBall')).toBe('无球跑动');
    expect(labelAttribute('discipline')).toBe('自律');
    expect(labelAttribute('unrecognized')).toBe('其他能力');
  });

  it('consolidates ledger facts into the latest three months', () => {
    const projection = {
      season: { startDate: '2024-09-01' },
      ledger: [
        fact('sep-training', '2024-W01', 'training'),
        fact('oct-training', '2024-W06', 'training'),
        fact('oct-match', '2024-W06', 'match'),
        fact('oct-health', '2024-W07', 'health'),
        fact('oct-event', '2024-W07', 'event'),
        fact('oct-decision', '2024-W07', 'decision'),
        fact('nov-relationship', '2024-W10', 'relationship'),
        fact('nov-first-team', '2024-W10', 'first-team'),
        fact('dec-settlement', '2024-W14', 'monthly-settlement'),
      ],
    } as Pick<CareerSaveV2, 'season' | 'ledger'>;

    const records = buildRecentRecords(projection, 3);

    expect(records).toHaveLength(3);
    expect(records.map(({ monthKey }) => monthKey)).toEqual(['2024-12', '2024-11', '2024-10']);
    const copy = records.flatMap(({ lines }) => lines).join(' ');
    expect(copy).not.toMatch(
      /training|match|health|event|decision|relationship|first-team|monthly-settlement/i,
    );
    expect(copy).toContain('比赛');
    expect(copy).toContain('关键选择');
    expect(copy).toContain('一线队');
  });

  it('returns no summaries for an empty ledger', () => {
    const projection = {
      season: { startDate: '2024-09-01' },
      ledger: [],
    } as unknown as Pick<CareerSaveV2, 'season' | 'ledger'>;

    expect(buildRecentRecords(projection)).toEqual([]);
  });
});

const fact = (
  id: string,
  weekKey: string,
  type: CareerLedgerEntryV2['type'],
): CareerLedgerEntryV2 => ({
  id,
  weekKey,
  type,
  summary: `internal ${type} detail`,
  participantIds: [],
});
