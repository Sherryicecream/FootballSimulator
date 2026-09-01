import { NARRATIVE_PROMPT_VERSION } from '../prompts/narrative-polish';

export interface LocalNarrativeHealth {
  service: 'local-ai';
  status: 'ready';
  promptVersion: typeof NARRATIVE_PROMPT_VERSION;
}

export const getLocalNarrativeHealth = (): LocalNarrativeHealth => ({
  service: 'local-ai',
  status: 'ready',
  promptVersion: NARRATIVE_PROMPT_VERSION,
});
