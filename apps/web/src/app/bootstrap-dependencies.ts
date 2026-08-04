import { getRegionProfile } from '@football/content';
import type { BootstrapContentPort } from '@football/application';

export function createBootstrapContent(): BootstrapContentPort {
  return {
    getRegionProfile: (id: string) => getRegionProfile(id),
  };
}
