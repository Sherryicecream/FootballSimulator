import type { ClubProfile, Country } from '@football/contracts';
import { domesticClubProfiles } from '../data/clubs/domestic';
import { englandClubProfiles } from '../data/clubs/england';
import { franceClubProfiles } from '../data/clubs/france';
import { germanyClubProfiles } from '../data/clubs/germany';
import { italyClubProfiles } from '../data/clubs/italy';
import { japanClubProfiles } from '../data/clubs/japan';
import { koreaClubProfiles } from '../data/clubs/korea';
import { spainClubProfiles } from '../data/clubs/spain';
import { professionalPlayerNamePools } from '../data/person-archetypes';

const attachProfessionalNamePool = (clubs: readonly ClubProfile[]): ClubProfile[] =>
  clubs.map((club) => ({
    ...club,
    personNamePool: [
      ...(professionalPlayerNamePools[club.country ?? 'china'] ??
        professionalPlayerNamePools.china),
    ],
  }));

/** 国内职业俱乐部（层级 1–10，顺序影响要约池遍历，不得重排）。 */
export const youthClubs: ClubProfile[] = attachProfessionalNamePool(domesticClubProfiles);

/** 海外虚构俱乐部，按国家分组，供独立联赛与要约池共同使用。 */
export const overseasClubs: ClubProfile[] = [
  ...englandClubProfiles,
  ...spainClubProfiles,
  ...germanyClubProfiles,
  ...italyClubProfiles,
  ...franceClubProfiles,
  ...japanClubProfiles,
  ...koreaClubProfiles,
].map((club) => ({
  ...club,
  personNamePool: [
    ...(professionalPlayerNamePools[club.country ?? 'china'] ?? professionalPlayerNamePools.china),
  ],
}));

const playableCountries = [
  'china',
  'england',
  'spain',
  'germany',
  'italy',
  'france',
  'japan',
  'korea',
] as const satisfies readonly Country[];

export const allClubProfiles = (): ClubProfile[] => [...youthClubs, ...overseasClubs];

export const clubCountByCountry = (): Record<Country, number> => {
  const counts = Object.fromEntries(playableCountries.map((country) => [country, 0])) as Record<
    Country,
    number
  >;

  for (const club of allClubProfiles()) {
    if (club.country) counts[club.country] += 1;
  }
  return counts;
};
