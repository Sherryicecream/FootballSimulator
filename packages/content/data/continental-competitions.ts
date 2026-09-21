import type { ContinentalFederation, ContinentalQuota } from '@football/contracts';

export type ContinentalCompetitionConfig = {
  id: string;
  name: string;
  federation: ContinentalFederation;
  quota: ContinentalQuota;
};

export const continentalCompetitions: readonly ContinentalCompetitionConfig[] = [
  {
    id: 'uefa-champions',
    name: '欧洲冠军赛事',
    federation: 'uefa',
    quota: { directPerCountry: 2, qualifyingPerCountry: 1 },
  },
  {
    id: 'afc-champions',
    name: '亚洲冠军赛事',
    federation: 'afc',
    quota: { directPerCountry: 2, qualifyingPerCountry: 1 },
  },
];
