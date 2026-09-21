import { describe, expect, it } from 'vitest';
import { migrateCareerSaveV7, type CareerSaveV7 } from '@football/contracts';
import { buildCareerArchive } from '../../src';
import { createSave } from '../fixtures/youth-save';

const createTerminalSave = (): CareerSaveV7 => {
  const base = migrateCareerSaveV7(createSave(42));
  const honour = {
    id: 'league-2037-champion',
    kind: 'league-champion' as const,
    label: '联赛冠军',
    seasonId: 'pro-2037',
    clubId: 'club-a',
    evidenceId: 'season-2037',
  };

  return migrateCareerSaveV7({
    ...base,
    careerPhase: 'retired',
    retiredOn: '2038-06-30',
    careerEnd: {
      kind: 'voluntary-retirement',
      endedOn: '2038-06-30',
      summary: '正式宣布退役，结束球员生涯。',
      evidenceIds: ['retirement-2038'],
    },
    player: {
      ...base.player,
      age: 30,
      careerStage: 'RETIRED',
      reputation: 58,
    },
    seasonHistory: [
      {
        seasonId: 'pro-2037',
        age: 29,
        status: 'retained',
        appearances: 28,
        goals: 9,
        assists: 6,
        avgRating: 7.4,
        signals: ['稳定首发'],
        endedOn: '2038-06-15',
        honours: [honour],
      },
    ],
    clubHistory: [
      {
        clubId: 'club-a',
        clubName: '海港竞技',
        from: '2037-08-01',
        to: '2038-06-30',
        seasons: 1,
        appearances: 28,
        goals: 9,
      },
    ],
    nationalTeam: { capped: true, caps: 8, goals: 2, debutOn: '2035-09-01' },
    totals: { appearances: 28, goals: 9, assists: 6, minutes: 2200 },
    ledger: [
      {
        id: 'retirement-2038',
        weekKey: '2038-W30',
        type: 'retirement',
        summary: '正式宣布退役，结束球员生涯。',
        participantIds: [],
      },
    ],
  });
};

describe('buildCareerArchive', () => {
  it('creates a deterministic compact archive from a terminal save', () => {
    const save = createTerminalSave();
    const before = structuredClone(save);

    const first = buildCareerArchive(save);
    const second = buildCareerArchive(save);

    expect(first).toEqual(second);
    expect(first.archiveVersion).toBe(1);
    expect(first.careerId).toBe(save.careerId);
    expect(first.player).toEqual(save.player);
    expect(first.careerEnd).toEqual(save.careerEnd);
    expect(first.review.totals).toEqual(save.totals);
    expect(first.review.honours).toEqual(save.seasonHistory[0]?.honours);
    expect(first.history.seasonHistory).toEqual(save.seasonHistory);
    expect(first.history.clubHistory).toEqual(save.clubHistory);
    expect(first.history.nationalTeam).toEqual(save.nationalTeam);
    expect(first).not.toHaveProperty('randomState');
    expect(save).toEqual(before);
  });

  it('rejects an active save instead of creating a historical archive', () => {
    const save = migrateCareerSaveV7(createSave(42));

    expect(() => buildCareerArchive(save)).toThrow(/结束|终结|退役/);
  });
});
