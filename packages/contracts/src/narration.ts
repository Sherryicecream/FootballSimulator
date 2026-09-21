import { z } from 'zod';
import { MilestoneNarrationRequestSchema } from './narration/milestone-narration';
const IdSchema = z.string().min(1).max(60);

const NarrativeTextSchema = z.string().min(1).max(500);

export const NarrativePolishKindSchema = z.enum(['event-feedback', 'matchday']);
export type NarrativePolishKind = z.infer<typeof NarrativePolishKindSchema>;

export const CareerSummaryModeSchema = z.enum(['short', 'long']);
export type CareerSummaryMode = z.infer<typeof CareerSummaryModeSchema>;

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

const CareerSummaryEvidenceSchema = z.string().min(1).max(60);

export const CareerSummaryFactsSchema = z
  .strictObject({
    player: z.strictObject({
      name: z.string().min(1).max(50),
      hometown: z.string().min(1).max(30),
      position: z.string().min(1).max(30),
      country: z.string().min(1).max(40).nullable(),
    }),
    tierLabel: z.string().min(1).max(80),
    ending: z
      .strictObject({
        label: z.string().min(1).max(80),
        summary: z.string().min(1).max(300),
        endedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .nullable(),
    seasons: z.number().int().min(0),
    clubs: z.number().int().min(0),
    totals: z.strictObject({
      appearances: z.number().int().min(0),
      minutes: z.number().int().min(0),
      goals: z.number().int().min(0),
      assists: z.number().int().min(0),
    }),
    nationalTeam: z.strictObject({
      capped: z.boolean(),
      caps: z.number().int().min(0),
      goals: z.number().int().min(0),
    }),
    overseasSpells: z.boolean(),
    clubHistory: z
      .array(
        z.strictObject({
          clubName: z.string().min(1).max(80),
          from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          to: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .nullable(),
          seasons: z.number().int().min(1),
          appearances: z.number().int().min(0),
          goals: z.number().int().min(0),
          evidenceIds: z.array(CareerSummaryEvidenceSchema),
        }),
      )
      .max(30)
      .default([]),
    honours: z
      .array(
        z.strictObject({
          evidenceId: CareerSummaryEvidenceSchema,
          kind: z.string().min(1).max(40),
          label: z.string().min(1).max(100),
          seasonId: CareerSummaryEvidenceSchema,
        }),
      )
      .max(50),
    seasonsTimeline: z.array(
      z.strictObject({
        seasonId: CareerSummaryEvidenceSchema,
        status: z.string().min(1).max(40),
        appearances: z.number().int().min(0),
        goals: z.number().int().min(0),
        assists: z.number().int().min(0),
        avgRating: z.number().min(0).max(10).nullable(),
        evidenceIds: z.array(CareerSummaryEvidenceSchema),
      }),
    ),
    keyMoments: z.array(
      z.strictObject({
        evidenceId: CareerSummaryEvidenceSchema,
        kind: z.string().min(1).max(40),
        title: z.string().min(1).max(100),
        summary: z.string().min(1).max(500),
      }),
    ),
    dimensions: z.array(
      z.strictObject({
        key: z.string().min(1).max(40),
        label: z.string().min(1).max(80),
        score: z.number().int().min(0).max(100),
        ratingLabel: z.string().min(1).max(40),
        evidenceIds: z.array(CareerSummaryEvidenceSchema),
      }),
    ),
    behindTheScenes: z.strictObject({
      potentials: z.array(
        z.strictObject({
          label: z.string().min(1).max(80),
          fulfillment: z.number().int().min(0).max(100),
        }),
      ),
      traits: z.array(
        z.strictObject({
          label: z.string().min(1).max(80),
          value: z.string().min(1).max(80),
        }),
      ),
      missedOpportunities: z.array(
        z.strictObject({
          id: CareerSummaryEvidenceSchema,
          label: z.string().min(1).max(120),
          detail: z.string().min(1).max(300),
          evidenceIds: z.array(CareerSummaryEvidenceSchema),
        }),
      ),
    }),
    evidenceIds: z.array(CareerSummaryEvidenceSchema).max(500),
  })
  .superRefine((facts, ctx) => {
    if (
      !facts.nationalTeam.capped &&
      (facts.nationalTeam.caps !== 0 || facts.nationalTeam.goals !== 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nationalTeam'],
        message: '未入选国家队时出场和进球必须为 0',
      });
    }
    const evidence = new Set(facts.evidenceIds);
    const checkEvidence = (id: string, path: (string | number)[]) => {
      if (!evidence.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: '事实引用了不在事实包中的证据',
        });
      }
    };
    facts.honours.forEach((item, index) =>
      checkEvidence(item.evidenceId, ['honours', index, 'evidenceId']),
    );
    facts.keyMoments.forEach((item, index) =>
      checkEvidence(item.evidenceId, ['keyMoments', index, 'evidenceId']),
    );
    facts.seasonsTimeline.forEach((season, index) => {
      season.evidenceIds.forEach((id) =>
        checkEvidence(id, ['seasonsTimeline', index, 'evidenceIds']),
      );
    });
    facts.clubHistory.forEach((club, index) => {
      club.evidenceIds.forEach((id) => checkEvidence(id, ['clubHistory', index, 'evidenceIds']));
    });
    facts.behindTheScenes.missedOpportunities.forEach((item, index) => {
      item.evidenceIds.forEach((id) =>
        checkEvidence(id, ['behindTheScenes', 'missedOpportunities', index, 'evidenceIds']),
      );
    });
  });
export type CareerSummaryFacts = z.infer<typeof CareerSummaryFactsSchema>;

export const CareerSummaryRequestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  promptVersion: z.literal('career-summary-v1'),
  kind: z.literal('career-summary'),
  mode: CareerSummaryModeSchema,
  canonicalFactsHash: z.string().regex(/^[a-f0-9]{64}$/),
  facts: CareerSummaryFactsSchema,
});
export type CareerSummaryRequest = z.infer<typeof CareerSummaryRequestSchema>;

export const CareerSummaryOutputSchema = z.strictObject({
  summary: z.string().min(150).max(800),
});
export type CareerSummaryOutput = z.infer<typeof CareerSummaryOutputSchema>;

export const NarrativeRequestSchema = z.union([
  NarrativePolishRequestSchema,
  CareerSummaryRequestSchema,
  MilestoneNarrationRequestSchema,
]);
export type NarrativeRequest = z.infer<typeof NarrativeRequestSchema>;

export const NARRATIVE_PROMPT_VERSION = 'narrative-polish-v1';
export type NarrativePromptVersion = typeof NARRATIVE_PROMPT_VERSION;
export const CAREER_SUMMARY_PROMPT_VERSION = 'career-summary-v1';

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

export interface BuildCareerSummaryRequestInput {
  facts: CareerSummaryFacts;
  mode: CareerSummaryMode;
  canonicalFactsHash: string;
}

export const buildCareerSummaryRequest = (
  input: BuildCareerSummaryRequestInput,
): CareerSummaryRequest =>
  CareerSummaryRequestSchema.parse({
    schemaVersion: 1,
    promptVersion: CAREER_SUMMARY_PROMPT_VERSION,
    kind: 'career-summary',
    mode: input.mode,
    canonicalFactsHash: input.canonicalFactsHash,
    facts: input.facts,
  });
