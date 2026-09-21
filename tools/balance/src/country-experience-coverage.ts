import { CountrySchema, type Country } from '@football/contracts';

export type CountryExperienceSample = {
  seed: number;
  experiencedCountries: readonly Country[];
};

export type CountryExperienceSegment = {
  segmentIndex: number;
  seedStart: number;
  seedEnd: number;
  sampleCount: number;
  careerCountsByCountry: Record<Country, number>;
  countriesWithExperience: Country[];
  minimumCountries: number;
  passed: boolean;
};

export type CountryExperienceCoverageReport = {
  segmentSize: number;
  minimumCountries: number;
  segments: CountryExperienceSegment[];
  allSegmentsPass: boolean;
};

const playableCountries = [...CountrySchema.options];

const assertPositiveInteger = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(label + ' 必须是正整数');
  }
};

export const summarizeCountryExperienceCoverage = (
  samples: readonly CountryExperienceSample[],
  options: { segmentSize?: number; minimumCountries?: number } = {},
): CountryExperienceCoverageReport => {
  const segmentSize = options.segmentSize ?? 1000;
  const minimumCountries = options.minimumCountries ?? 6;
  assertPositiveInteger(segmentSize, 'segmentSize');
  assertPositiveInteger(minimumCountries, 'minimumCountries');
  if (minimumCountries > playableCountries.length) {
    throw new Error('minimumCountries 不能超过可玩国家数量');
  }

  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index]!.seed !== samples[index - 1]!.seed + 1) {
      throw new Error('国家经历覆盖样本必须按连续种子顺序排列');
    }
  }

  const segments: CountryExperienceSegment[] = [];
  for (let start = 0; start < samples.length; start += segmentSize) {
    const segment = samples.slice(start, start + segmentSize);
    const careerCountsByCountry = Object.fromEntries(
      playableCountries.map((country) => [country, 0]),
    ) as Record<Country, number>;

    for (const sample of segment) {
      for (const country of new Set(sample.experiencedCountries)) {
        if (!playableCountries.includes(country)) {
          throw new Error('未知的球员经历国家: ' + country);
        }
        careerCountsByCountry[country] += 1;
      }
    }

    const countriesWithExperience = playableCountries
      .filter((country) => careerCountsByCountry[country] > 0)
      .sort();
    segments.push({
      segmentIndex: segments.length + 1,
      seedStart: segment[0]!.seed,
      seedEnd: segment.at(-1)!.seed,
      sampleCount: segment.length,
      careerCountsByCountry,
      countriesWithExperience,
      minimumCountries,
      passed: segment.length === segmentSize && countriesWithExperience.length >= minimumCountries,
    });
  }

  return {
    segmentSize,
    minimumCountries,
    segments,
    allSegmentsPass: segments.length > 0 && segments.every(({ passed }) => passed),
  };
};
