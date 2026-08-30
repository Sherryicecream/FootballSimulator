export { getRegionProfile, getKeyRegions, getAllRegions } from './regions';
export { getYouthEvents } from './events/youth-events';
export { balancedOneOffEvents } from './events/one-off-events';
export { shortStoryEvents } from './events/story-events';
export { trajectoryEvents } from './events/trajectory-events';
export { youthAcademies } from './academies';
export { youthClubs, overseasClubs } from './clubs';
export { youthAgents } from './agent-archetypes';
export { youthCompetitions } from './youth-competitions';
export { youthPersonArchetypes } from './person-archetypes';
export { validateYouthContent } from './validation/validate-content';
export type { YouthContentBundle } from '@football/contracts';

import { YouthContentBundleSchema, type YouthContentBundle } from '@football/contracts';
import { youthAcademies } from './academies';
import { youthCompetitions } from './youth-competitions';
import { youthPersonArchetypes } from './person-archetypes';
import { youthClubs, overseasClubs } from './clubs';
import { youthAgents } from './agent-archetypes';
import { youthEvents } from './events/youth-events';

export const getYouthContent = (): YouthContentBundle =>
  YouthContentBundleSchema.parse({
    academies: [...youthAcademies],
    competitions: [...youthCompetitions],
    people: [...youthPersonArchetypes],
    events: [...youthEvents],
    clubs: [...youthClubs],
    overseasClubs: [...overseasClubs],
    agents: [...youthAgents],
  });
