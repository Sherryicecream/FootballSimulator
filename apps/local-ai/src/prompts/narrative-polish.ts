import {
  NarrativePolishRequestSchema,
  type NarrativePolishDraft,
  type NarrativePolishKind,
  type NarrativePolishParticipant,
  type NarrativePolishRequest,
} from '@football/contracts';

export const NARRATIVE_PROMPT_VERSION = 'narrative-polish-v1' as const;

type NarrativeParticipantInput = Omit<NarrativePolishParticipant, 'text'>;

export interface BuildNarrativePolishRequestInput {
  kind: NarrativePolishKind;
  eventTitle: string;
  choiceText: string;
  playerName: string;
  participants: readonly NarrativeParticipantInput[];
  draft: NarrativePolishDraft;
}

export const buildNarrativePolishRequest = (
  input: BuildNarrativePolishRequestInput,
): NarrativePolishRequest => {
  const participantIds = input.participants.map(({ personId }) => personId);
  const draftIds = input.draft.participantResponses.map(({ personId }) => personId);
  if (participantIds.join('|') !== draftIds.join('|')) {
    throw new Error('叙事参与人物与原文草稿不一致');
  }

  return NarrativePolishRequestSchema.parse({
    schemaVersion: 1,
    promptVersion: NARRATIVE_PROMPT_VERSION,
    kind: input.kind,
    context: {
      eventTitle: input.eventTitle,
      choiceText: input.choiceText,
      playerName: input.playerName,
      participantNames: input.participants.map(({ personName }) => personName),
    },
    draft: input.draft,
  });
};
