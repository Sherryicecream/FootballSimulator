import type { Country, EventDefinition } from '@football/contracts';
import { legacyYouthEvents } from '../../data/events/legacy-youth';
import { balancedOneOffEvents } from '../../data/events/one-off';
import { shortStoryEvents } from '../../data/events/story';
import { trajectoryEvents } from '../../data/events/trajectory';
import { branchingStoryEvents } from '../../data/events/branching';
import { asiaCareerEvents } from '../../data/events/asia-career';
import { englandCareerEvents } from '../../data/events/england-career';
import { franceCareerEvents } from '../../data/events/france-career';
import { germanyCareerEvents } from '../../data/events/germany-career';
import { italyCareerEvents } from '../../data/events/italy-career';
import { nationalTeamEvents } from '../../data/events/national-team';
import { spainCareerEvents } from '../../data/events/spain-career';
import { storyFamilyEvents } from '../story-family-registry';

/**
 * 事件池：内容外置到 data/events（M11 模块 3）。
 * 池顺序与既有行为一致——顺序影响加权选择时的 rng 映射，不得重排。
 */
export const youthEvents: EventDefinition[] = [
  ...legacyYouthEvents,
  ...balancedOneOffEvents,
  ...shortStoryEvents,
  ...trajectoryEvents,
  ...branchingStoryEvents,
  ...asiaCareerEvents,
  ...englandCareerEvents,
  ...spainCareerEvents,
  ...germanyCareerEvents,
  ...italyCareerEvents,
  ...franceCareerEvents,
  ...nationalTeamEvents,
  ...storyFamilyEvents,
];

export function getYouthEvents(): EventDefinition[] {
  return youthEvents;
}

export const eventCountByCountry = (country: Country): number =>
  youthEvents.filter((event) => event.condition.requireCountry === country).length;
