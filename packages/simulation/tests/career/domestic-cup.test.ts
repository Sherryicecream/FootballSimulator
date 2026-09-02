import { describe, expect, it } from 'vitest';
import { ProCupStateSchema } from '@football/contracts';
import { advanceDomesticCup, createDomesticCup } from '../../src/career/domestic-cup';

const clubs = Array.from({ length: 8 }, (_, index) => ({
  id: `club-tier-5-${index + 1}`,
  name: `五级俱乐部${index + 1}`,
  tier: 5,
  regionId: `region-${index + 1}`,
  positionalNeeds: ['FORWARD'],
  youthCycle: 'stable' as const,
  overseas: false,
  wageBudget: 50,
}));

const overseasClub = { ...clubs[0]!, id: 'overseas-club', overseas: true };

describe('国内杯赛 bracket', () => {
  it('同一输入生成相同的八队签位和七场三轮赛程', () => {
    const first = createDomesticCup(clubs, 'club-tier-5-1', 5, '2030', 99);
    const second = createDomesticCup(clubs, 'club-tier-5-1', 5, '2030', 99);

    expect(second).toEqual(first);
    expect(first.entrants).toHaveLength(8);
    expect(first.entrants).toContain('club-tier-5-1');
    expect(first.fixtures).toHaveLength(7);
    expect(first.fixtures.filter(({ weekKey }) => weekKey.endsWith('W27'))).toHaveLength(4);
    expect(first.fixtures.filter(({ weekKey }) => weekKey.endsWith('W33'))).toHaveLength(2);
    expect(first.fixtures.filter(({ weekKey }) => weekKey.endsWith('W39'))).toHaveLength(1);
    expect(() => ProCupStateSchema.parse(first)).not.toThrow();
  });

  it('只推进当前轮次赢家，并在决赛后记录杯赛冠军', () => {
    let cup = createDomesticCup(clubs, 'club-tier-5-1', 5, '2030', 99);
    const quarterfinals = cup.fixtures.filter(({ weekKey }) => weekKey.endsWith('W27'));

    for (const fixture of quarterfinals) {
      cup = advanceDomesticCup(cup, fixture.id, 2, 0, 0);
    }

    expect(cup.currentRound).toBe('semifinal');
    const semifinals = cup.fixtures.filter(({ weekKey }) => weekKey.endsWith('W33'));
    expect(
      semifinals.every(
        ({ homeClubId, awayClubId }) =>
          !homeClubId.startsWith('cup-slot-') && !awayClubId.startsWith('cup-slot-'),
      ),
    ).toBe(true);

    for (const fixture of semifinals) {
      cup = advanceDomesticCup(cup, fixture.id, 1, 0, 0);
    }

    expect(cup.currentRound).toBe('final');
    const final = cup.fixtures.find(({ weekKey }) => weekKey.endsWith('W39'))!;
    cup = advanceDomesticCup(cup, final.id, 1, 1, 0);

    expect(cup.currentRound).toBe('complete');
    expect(cup.completed).toBe(true);
    expect(cup.winnerClubId).toBe(final.homeClubId);
    expect(() => advanceDomesticCup(cup, final.id, 2, 0, 0)).toThrow();
  });

  it('把客队胜者和确定性平局胜者送入下一轮', () => {
    let cup = createDomesticCup(clubs, 'club-tier-5-1', 5, '2030', 99);
    const quarterfinals = cup.fixtures.filter(({ weekKey }) => weekKey.endsWith('W27'));
    const firstQuarterfinal = quarterfinals[0]!;

    for (const [index, fixture] of quarterfinals.entries()) {
      cup = advanceDomesticCup(
        cup,
        fixture.id,
        index === 0 ? 0 : 1,
        index === 0 ? 2 : index === 1 ? 1 : 0,
        index === 1 ? 1 : 0,
      );
    }

    const semifinals = cup.fixtures.filter(({ weekKey }) => weekKey.endsWith('W33'));
    expect(semifinals[0]?.homeClubId).toBe(firstQuarterfinal.awayClubId);
    expect(semifinals[0]?.awayClubId).not.toBe(firstQuarterfinal.homeClubId);
  });

  it('拒绝未知俱乐部、海外球队和非法的重复结算', () => {
    expect(() => createDomesticCup(clubs, 'missing-club', 5, '2030', 99)).toThrow();
    expect(() =>
      createDomesticCup([...clubs, overseasClub], 'overseas-club', 5, '2030', 99),
    ).toThrow();

    const cup = createDomesticCup(clubs, 'club-tier-5-1', 5, '2030', 99);
    const fixture = cup.fixtures[0]!;
    const settled = advanceDomesticCup(cup, fixture.id, 1, 0, 0);
    expect(() => advanceDomesticCup(settled, fixture.id, 1, 0, 0)).toThrow();
  });

  it('只接受有效层级附近的国内俱乐部，不用远层级球队补位', () => {
    const farClubs = clubs.map((club, index) => ({
      ...club,
      tier: index === 0 ? 5 : 8,
    }));

    expect(() => createDomesticCup(farClubs, farClubs[0]!.id, 5, '2030', 99)).toThrow(
      '有效层级 5 附近国内俱乐部不足',
    );
  });

  it('拒绝跨赛事或包含非参赛队的非法杯赛对阵', () => {
    const cup = createDomesticCup(clubs, 'club-tier-5-1', 5, '2030', 99);
    const fixture = cup.fixtures[0]!;

    const wrongCompetition = {
      ...cup,
      fixtures: cup.fixtures.map((item) =>
        item.id === fixture.id ? { ...item, competitionId: 'other-cup' } : item,
      ),
    };
    expect(() => advanceDomesticCup(wrongCompetition, fixture.id, 1, 0, 0)).toThrow(
      '杯赛赛事不匹配',
    );

    const outsider = {
      ...cup,
      fixtures: cup.fixtures.map((item) =>
        item.id === fixture.id ? { ...item, homeClubId: 'outsider-club' } : item,
      ),
    };
    expect(() => advanceDomesticCup(outsider, fixture.id, 1, 0, 0)).toThrow('杯赛参赛队非法');
  });
});
