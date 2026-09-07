import {
  migrateCareerSaveV6,
  type CareerSaveV6,
  type YouthContentBundle,
} from '@football/contracts';
import { createYouthCareerV2 } from './create-youth-career-v2';

export const loadCareer = (raw: unknown, content: YouthContentBundle): CareerSaveV6 =>
  migrateCareerSaveV6(createYouthCareerV2(raw, content));
