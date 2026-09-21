import { describe, expect, it } from 'vitest';
import { careerMoment, makeFactId, stampCareerFact } from '../../src/career/career-moment';

describe('makeFactId', () => {
  it('produces unique IDs for different ordinals in the same season and week', () => {
    const id1 = makeFactId('pro-2030', 8, 1);
    const id2 = makeFactId('pro-2030', 8, 2);
    expect(id1).not.toBe(id2);
  });

  it('produces IDs under 60 characters', () => {
    const id = makeFactId('pro-2030', 8, 1);
    expect(id.length).toBeLessThanOrEqual(60);
  });

  it('truncates very long season IDs', () => {
    const longSeasonId = 'pro-overseas-europe-tier-5-season-2030-very-long-name';
    const id = makeFactId(longSeasonId, 12, 99);
    expect(id.length).toBeLessThanOrEqual(60);
    expect(id).toContain('w12');
  });

  it('produces different IDs for different weeks', () => {
    expect(makeFactId('pro-2030', 8, 1)).not.toBe(makeFactId('pro-2030', 9, 1));
  });

  it('produces different IDs for different season IDs', () => {
    expect(makeFactId('pro-2030', 8, 1)).not.toBe(makeFactId('pro-2031', 8, 1));
  });
});

describe('careerMoment', () => {
  it('reads from proSeason when in pro phase', () => {
    const save = createProSave();
    const moment = careerMoment(save);
    expect(moment.seasonId).toBe(save.proSeason!.id);
    expect(moment.date).toBe(save.proSeason!.currentDate);
    expect(moment.weekIndex).toBeGreaterThanOrEqual(1);
  });

  it('reads from youth season when in youth phase', () => {
    const save = createYouthSave();
    const moment = careerMoment(save);
    expect(moment.seasonId).toBe(save.season.id);
    expect(moment.date).toBe(save.season.currentDate);
    expect(moment.weekIndex).toBe(save.season.currentWeek);
  });
});

describe('stampCareerFact', () => {
  it('stamps v8 facts with a stable career address', () => {
    const save = { ...createProSave(), schemaVersion: 8, ledger: [] };
    const fact = stampCareerFact(save, {
      id: 'fact-1',
      type: 'retirement',
      summary: '结束生涯',
      participantIds: [],
    });

    expect(fact).toMatchObject({
      occurredOn: '2030-08-15',
      seasonId: 'pro-2030',
      ordinal: 1,
    });
  });
});

/** Minimal pro-season save for testing careerMoment. */
function createProSave() {
  return {
    schemaVersion: 7,
    careerPhase: 'pro-season',
    proSeason: {
      id: 'pro-2030',
      startDate: '2030-08-01',
      endDate: '2031-05-31',
      currentDate: '2030-08-15',
      currentWeek: 3,
      clubId: 'test-club',
      competitionId: 'pro-tier-5',
      fixtures: [],
      standings: [],
      squad: [],
      depthChart: {},
      completed: false,
    },
    season: {
      id: 'youth-2025',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
      currentDate: '2025-09-01',
      currentWeek: 1,
      academyId: 'test-academy',
      fixtures: [],
      completed: false,
    },
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Minimal youth-season save for testing careerMoment. */
function createYouthSave() {
  return {
    schemaVersion: 7,
    careerPhase: 'youth-season',
    season: {
      id: 'youth-2025',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
      currentDate: '2025-10-15',
      currentWeek: 7,
      academyId: 'test-academy',
      fixtures: [],
      completed: false,
    },
    proSeason: null,
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
