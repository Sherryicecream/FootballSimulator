export { getRegionProfile, getKeyRegions, getAllRegions } from './regions';
export { getYouthEvents } from './events/youth-events';
export { youthAcademies } from './academies';
export { youthCompetitions } from './youth-competitions';
export { youthPersonArchetypes } from './person-archetypes';
export { validateYouthContent } from './validation/validate-content';
export type { YouthContentBundle } from '@football/contracts';

import type { YouthContentBundle } from '@football/contracts';
import { youthAcademies } from './academies';
import { youthCompetitions } from './youth-competitions';
import { youthPersonArchetypes } from './person-archetypes';
import { youthEvents } from './events/youth-events';

export const getYouthContent = (): YouthContentBundle => ({
  academies: [...youthAcademies],
  competitions: [...youthCompetitions],
  people: [...youthPersonArchetypes],
  events: [...youthEvents],
});
