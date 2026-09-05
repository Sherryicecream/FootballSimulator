import { z } from 'zod';
const IdSchema = z.string().min(1).max(60);

const NarrativeTextSchema = z.string().min(1).max(500);

export const NarrativePolishKindSchema = z.enum(['event-feedback', 'matchday']);
export type NarrativePolishKind = z.infer<typeof NarrativePolishKindSchema>;

export const NarrativePolishParticipantSchema = z.strictObject({
  personId: IdSchema,
  personName: z.string().min(1).max(50),
  role: z.string().min(1).max(30),
  text: NarrativeTextSchema,
});
export type NarrativePolishParticipant = z.infer<typeof NarrativePolishParticipantSchema>;

export const NarrativePolishDraftSchema = z.strictObject({
  response: NarrativeTextSchema,
  participantResponses: z.array(NarrativePolishParticipantSchema).max(12),
  followUp: z.string().min(1).max(300),
});
export type NarrativePolishDraft = z.infer<typeof NarrativePolishDraftSchema>;

export const NarrativePolishContextSchema = z.strictObject({
  eventTitle: z.string().min(1).max(100),
  choiceText: z.string().min(1).max(200),
  playerName: z.string().min(1).max(50),
  participantNames: z.array(z.string().min(1).max(50)).max(12),
});
export type NarrativePolishContext = z.infer<typeof NarrativePolishContextSchema>;

export const NarrativePolishRequestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  promptVersion: z.literal('narrative-polish-v1'),
  kind: NarrativePolishKindSchema,
  context: NarrativePolishContextSchema,
  draft: NarrativePolishDraftSchema,
});
export type NarrativePolishRequest = z.infer<typeof NarrativePolishRequestSchema>;

export const NarrativePolishOutputParticipantSchema = z.strictObject({
  personId: IdSchema,
  text: NarrativeTextSchema,
});
export type NarrativePolishOutputParticipant = z.infer<
  typeof NarrativePolishOutputParticipantSchema
>;

export const NarrativePolishOutputSchema = z.strictObject({
  response: NarrativeTextSchema,
  participantResponses: z.array(NarrativePolishOutputParticipantSchema).max(12),
  followUp: z.string().min(1).max(300),
});
export type NarrativePolishOutput = z.infer<typeof NarrativePolishOutputSchema>;

export const NARRATIVE_PROMPT_VERSION = 'narrative-polish-v1';
export type NarrativePromptVersion = typeof NARRATIVE_PROMPT_VERSION;

type NarrativeParticipantInput = Omit<NarrativePolishParticipant, 'text'>;

export interface BuildNarrativePolishRequestInput {
  kind: NarrativePolishKind;
  eventTitle: string;
  choiceText: string;
  playerName: string;
  participants: readonly NarrativeParticipantInput[];
  draft: NarrativePolishDraft;
}

/** 从事件上下文与作者草稿构造润色请求；参与人物与草稿顺序必须一致。 */
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
