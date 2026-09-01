import type { NarrativePolishOutput, NarrativePolishRequest } from '@football/contracts';

export interface NarrativeProvider {
  generate(request: NarrativePolishRequest): Promise<unknown>;
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
      source: 'fallback';
      reason: NarrativeFallbackReason;
      draft: NarrativePolishOutput;
    };
