export { getRegionProfile, getKeyRegions, getAllRegions } from './regions';
export { eventCountByCountry, getYouthEvents } from './events/youth-events';
export { youthAcademies } from './academies';
export { allClubProfiles, clubCountByCountry, youthClubs, overseasClubs } from './clubs';
export { youthAgents } from './agent-archetypes';
export { youthCompetitions } from './youth-competitions';
export { continentalCompetitions } from '../data/continental-competitions';
export { youthPersonArchetypes } from './person-archetypes';
export { professionalPlayerNamePools } from '../data/person-archetypes';
export { validateYouthContent } from './validation/validate-content';
export {
  countFamilies,
  countFamiliesByDomain,
  familiesBelowThreshold,
  storyFamilyEvents,
  storyFamilyRegistry,
} from './story-family-registry';
export type {
  StoryFamilyCoverage,
  StoryFamilyCoverageSummary,
  StoryFamilyDefinition,
  StoryFamilyDomain,
  StoryPhase,
} from './story-family-registry';
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
