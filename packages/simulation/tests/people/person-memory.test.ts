import { describe, expect, it } from 'vitest';
import type { ClubProfile, ProSquadMember } from '@football/contracts';
import { carryOverRoster, createSeededRandomSource, generateProSquad } from '../../src';

const chinaClub: ClubProfile = {
  id: 'test-china-club',
  name: '申海港联',
  tier: 6,
  regionId: 'shanghai',
  positionalNeeds: ['FORWARD', 'WINGER'],
  youthCycle: 'stable',
  overseas: false,
  country: 'china',
  wageBudget: 60,
};

const englandClub: ClubProfile = {
  ...chinaClub,
  id: 'test-england-club',
  name: '北岸联队',
  overseas: true,
  overseasRegion: 'europe',
  country: 'england',
};

const playerPosition = 'FORWARD' as const;

const generate = (club: ClubProfile, seed: number, previous?: readonly ProSquadMember[]) =>
  generateProSquad(club, playerPosition, 64, createSeededRandomSource(seed), previous);

describe('professional person memory', () => {
  it('keeps a 50–70% core when carrying over a roster', () => {
    const previous = [
      { personId: 'p1', name: '张华', age: 22 },
      { personId: 'p2', name: '李明', age: 24 },
      { personId: 'p3', name: '王强', age: 21 },
      { personId: 'p4', name: '赵安', age: 29 },
    ];
    const next = carryOverRoster(previous, {
      limit: 4,
      rng: createSeededRandomSource(42),
    });
    const overlap = next.filter((member) =>
      previous.some((person) => person.personId === member.personId),
    );

    expect(overlap.length).toBeGreaterThanOrEqual(2);
    expect(overlap.length).toBeLessThanOrEqual(3);
    expect(next.every(({ name }) => !/\d$/.test(name))).toBe(true);
  });

  it('generates natural localized names without numeric suffixes', () => {
    for (const member of [...generate(chinaClub, 11), ...generate(englandClub, 11)]) {
      expect(member.name).not.toMatch(/\d$/);
      expect(member.name).not.toContain('undefined');
    }
  });

  it('keeps same-club person identities, traits, and abilities across seasons', () => {
    const firstSeason = generate(chinaClub, 11);
    const secondSeason = generate(chinaClub, 97, firstSeason);
    const firstById = new Map(firstSeason.map((member) => [member.personId, member]));
    const retained = secondSeason.filter((member) => firstById.has(member.personId));

    expect(retained.length).toBeGreaterThanOrEqual(Math.ceil(firstSeason.length * 0.5));
    expect(retained.length).toBeLessThanOrEqual(Math.floor(firstSeason.length * 0.7));
    for (const member of retained) {
      const previous = firstById.get(member.personId)!;
      expect(member.name).toBe(previous.name);
      expect(member.currentAbility).toBe(previous.currentAbility);
      expect(member.primaryPosition).toBe(previous.primaryPosition);
      expect(member.traits).toEqual(previous.traits);
      expect(member.relationshipToPlayer).toBe(previous.relationshipToPlayer);
    }
  });

  it('does not carry a club roster into a different club transfer', () => {
    const firstSeason = generate(chinaClub, 11);
    const secondClubSeason = generate(englandClub, 97, firstSeason);

    expect(
      secondClubSeason.some(({ personId }) =>
        firstSeason.some((member) => member.personId === personId),
      ),
    ).toBe(false);
    expect(
      secondClubSeason.every(({ personId }) => personId.startsWith(`${englandClub.id}-`)),
    ).toBe(true);
  });
});
