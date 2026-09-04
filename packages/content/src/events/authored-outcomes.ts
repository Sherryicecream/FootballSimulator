import type {
  ChoiceResolution,
  ChoiceResolutionAttribute,
  EventChoiceResponse,
} from '@football/contracts';

export interface AuthoredResultBranch {
  label: string;
  effects: Record<string, number>;
  response: string;
  followUp: string;
  responses?: EventChoiceResponse[];
}

export const createAuthoredResolution = (
  attribute: ChoiceResolutionAttribute,
  difficulty: number,
  outcomes: {
    success: AuthoredResultBranch;
    partial: AuthoredResultBranch;
    failure: AuthoredResultBranch;
  },
  volatility = 5,
): ChoiceResolution => ({
  attribute,
  difficulty,
  volatility,
  stateModifiers: {
    morale: 0,
    form: 0,
    confidence: 0,
    fitness: 0,
    fatigue: 0,
    coachTrust: 0,
  },
  outcomes,
});
