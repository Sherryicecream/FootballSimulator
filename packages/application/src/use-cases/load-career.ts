import type { CareerSaveV5, YouthContentBundle } from '@football/contracts';
import { createYouthCareerV2 } from './create-youth-career-v2';

export const loadCareer = (raw: unknown, content: YouthContentBundle): CareerSaveV5 =>
  createYouthCareerV2(raw, content);
