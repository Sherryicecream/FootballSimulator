import { NARRATIVE_PROMPT_VERSION } from '../prompts/narrative-polish';

export interface LocalNarrativeHealth {
  service: 'local-ai';
  status: 'ready';
  promptVersion: typeof NARRATIVE_PROMPT_VERSION;
  provider: { configured: boolean; model: string | null };
}

export interface LocalNarrativeHealthOptions {
  providerConfigured?: boolean | undefined;
  model?: string | null | undefined;
}

export const getLocalNarrativeHealth = (
  options: LocalNarrativeHealthOptions = {},
): LocalNarrativeHealth => ({
  service: 'local-ai',
  status: 'ready',
  promptVersion: NARRATIVE_PROMPT_VERSION,
  provider: {
    configured: options.providerConfigured ?? false,
    model: options.model ?? null,
  },
});
