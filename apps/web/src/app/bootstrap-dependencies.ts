import { getRegionProfile } from '@football/content';
import { getYouthEvents } from '@football/content';
import type { BootstrapContentPort } from '@football/application';
import type { EventDefinition } from '@football/contracts';

export function createBootstrapContent(): BootstrapContentPort {
  return {
    getRegionProfile: (id: string) => getRegionProfile(id),
  };
}

export function createYouthEvents(): EventDefinition[] {
  return getYouthEvents();
}
