import type {
  CareerSummaryOutput,
  MilestoneNarrationOutput,
  NarrativePolishOutput,
  NarrativeRequest,
} from '@football/contracts';

export interface NarrativeProvider {
  generate(request: NarrativeRequest): Promise<unknown>;
}

export type NarrativeFallbackReason =
  'disabled' | 'timeout' | 'provider-error' | 'invalid-output' | 'unsafe-output';

export type NarrativeAdapterResult =
  | {
      source: 'provider';
      reason: 'provider';
      draft: NarrativePolishOutput;
    }
  | {
      source: 'provider';
      reason: 'provider';
      draft: CareerSummaryOutput;
    }
  | {
      source: 'provider';
      reason: 'provider';
      draft: MilestoneNarrationOutput;
    }
  | {
      source: 'fallback';
      reason: NarrativeFallbackReason;
      draft: NarrativePolishOutput;
    }
  | {
      source: 'fallback';
      reason: NarrativeFallbackReason;
      draft: CareerSummaryOutput;
    }
  | {
      source: 'fallback';
      reason: NarrativeFallbackReason;
      draft: MilestoneNarrationOutput;
    };

export type NarrativeSummaryAdapterResult = Extract<
  NarrativeAdapterResult,
  { draft: CareerSummaryOutput }
>;

export type NarrativeMilestoneAdapterResult = Extract<
  NarrativeAdapterResult,
  { draft: MilestoneNarrationOutput }
>;
