import type { NarrativeProvider } from './types';

export const createDeterministicMockProvider = (): NarrativeProvider => ({
  generate: async ({ draft }) => ({
    response:
      draft.response.length <= 460 ? draft.response + ' 场边的空气慢慢安静下来。' : draft.response,
    participantResponses: draft.participantResponses.map(({ personId, text }) => ({
      personId,
      text,
    })),
    followUp: draft.followUp,
  }),
});
