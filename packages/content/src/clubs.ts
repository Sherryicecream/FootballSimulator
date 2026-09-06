import type { ClubProfile } from '@football/contracts';
import { domesticClubProfiles } from '../data/clubs/domestic';
import { europeClubProfiles } from '../data/clubs/overseas-europe';
import { asiaClubProfiles } from '../data/clubs/overseas-asia';

/** 国内职业俱乐部（层级 1–10，顺序影响要约池遍历，不得重排）。 */
export const youthClubs: ClubProfile[] = domesticClubProfiles;

/** 海外虚构俱乐部：欧洲在前、亚洲在后（与既有要约池顺序一致）。 */
export const overseasClubs: ClubProfile[] = [...europeClubProfiles, ...asiaClubProfiles];
