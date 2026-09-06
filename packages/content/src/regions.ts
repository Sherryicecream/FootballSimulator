import type { RegionProfile } from '@football/contracts';
import { keyRegionProfiles, nonKeyRegionProfiles } from '../data/regions';

const allRegions: RegionProfile[] = [...keyRegionProfiles, ...nonKeyRegionProfiles];

const regionMap = new Map<string, RegionProfile>();
for (const region of allRegions) {
  regionMap.set(region.id, region);
}

/** 通过 ID 获取地域档案 */
export function getRegionProfile(id: string): RegionProfile | undefined {
  return regionMap.get(id);
}

/** 获取所有重点地区 */
export function getKeyRegions(): RegionProfile[] {
  return [...keyRegionProfiles];
}

/** 获取所有地区 */
export function getAllRegions(): RegionProfile[] {
  return [...allRegions];
}
