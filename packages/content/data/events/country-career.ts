import type { ChoiceResolution, Country, EventChoice, EventDefinition } from '@football/contracts';

const EUROPEAN_COUNTRIES = new Set<Country>(['england', 'spain', 'germany', 'italy', 'france']);

type CountryCareerEventSpec = {
  id: string;
  country: Country;
  title: string;
  description: string;
  theme: NonNullable<EventDefinition['theme']>;
  rarity: NonNullable<EventDefinition['rarity']>;
  baseWeight: number;
  cooldownWeeks: number;
  choices: EventChoice[];
  participantRoles: NonNullable<EventDefinition['participantRoles']>;
  requireFactType?: EventDefinition['condition']['requireFactType'];
};

export const buildCountryCareerEvent = ({
  id,
  country,
  title,
  description,
  theme,
  rarity,
  baseWeight,
  cooldownWeeks,
  choices,
  participantRoles,
  requireFactType,
}: CountryCareerEventSpec): EventDefinition => ({
  id,
  version: 1,
  category: EUROPEAN_COUNTRIES.has(country) ? 'europe-career' : 'asia-career',
  rarity,
  theme,
  interaction: 'decision',
  baseWeight,
  title,
  description,
  condition: {
    requireOverseas: true,
    overseasRegions: [EUROPEAN_COUNTRIES.has(country) ? 'europe' : 'asia'],
    requireCountry: country,
    ...(requireFactType ? { requireFactType } : {}),
  },
  participantRoles,
  cooldownWeeks,
  choices,
});

type ResolutionOutcome = ChoiceResolution['outcomes']['success'];

type ThreeTierResolutionSpec = {
  attribute: ChoiceResolution['attribute'];
  difficulty: number;
  success: ResolutionOutcome;
  partial: ResolutionOutcome;
  failure: ResolutionOutcome;
};

export const threeTierResolution = ({
  attribute,
  difficulty,
  success,
  partial,
  failure,
}: ThreeTierResolutionSpec): ChoiceResolution => ({
  attribute,
  difficulty,
  volatility: 5,
  stateModifiers: {
    morale: 0,
    form: 0,
    confidence: 0,
    fitness: 0,
    fatigue: 0,
    coachTrust: 0,
  },
  outcomes: { success, partial, failure },
});
