import { describe, expect, it } from 'vitest';
import { CareerSaveV5Schema, type ClubProfile } from '@football/contracts';
import { startProfessionalSeason } from '../../src/use-cases/pro-flow';
import { createProSave, proClubs } from '../../../simulation/tests/fixtures/pro-save';

const englandClubs: ClubProfile[] = proClubs.map((club) => ({
  ...club,
  overseas: true,
  overseasRegion: 'europe',
  country: 'england',
}));

const japanClubs: ClubProfile[] = Array.from({ length: 6 }, (_, index) => ({
  id: `japan-club-${index + 1}`,
  name: `日本俱乐部${index + 1}`,
  tier: 5,
  regionId: 'japan-kanto',
  positionalNeeds: ['FORWARD'],
  youthCycle: 'stable',
  overseas: true,
  overseasRegion: 'asia',
  country: 'japan',
  wageBudget: 60,
}));

describe('跨国转会职业赛历桥接', () => {
  it('从欧洲转入亚洲时选择下一合法亚洲赛季而不是回到已经过去的月份', () => {
    const source = createProSave();
    const save = CareerSaveV5Schema.parse({
      ...source,
      schemaVersion: 5,
      careerPhase: 'pro-offseason',
      proPhase: 'settled',
      contract: {
        ...source.contract!,
        clubId: 'japan-club-1',
        clubName: '日本俱乐部1',
        overseas: true,
      },
      proSeason: {
        ...source.proSeason!,
        startDate: '2027-09-01',
        endDate: '2028-05-31',
        currentDate: '2028-05-31',
        currentMonth: '2028-05',
        completed: true,
      },
    });

    const started = startProfessionalSeason(save, [...englandClubs, ...japanClubs]);

    expect(started.proSeason).toMatchObject({
      startDate: '2029-03-01',
      endDate: '2029-11-30',
    });
    expect(started.proSeason?.calendarBridge).toMatchObject({
      fromCountry: 'england',
      toCountry: 'japan',
      kind: 'long-break',
      bridgeYears: 0.5,
    });
    expect(started.proSeason?.calendarBridge?.gapDays).toBeGreaterThan(90);
  });
});
