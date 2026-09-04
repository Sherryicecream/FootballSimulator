import {
  CareerSaveV5Schema,
  YouthContentBundleSchema,
  migrateCareerSaveV5,
  type CareerSaveV5,
  type Position,
  type YouthContentBundle,
} from '@football/contracts';
import {
  createSeededRandomSource,
  createYouthFixtures,
  initializeYouthRelationships,
  isFinalYouthSeason,
} from '@football/simulation';

export const createYouthCareerV2 = (
  rawSave: unknown,
  rawContent: YouthContentBundle,
): CareerSaveV5 => {
  const migrated = normalizeYouthAgeBoundary(migrateCareerSaveV5(rawSave));
  const content = YouthContentBundleSchema.parse(rawContent);
  const academyId = resolveAcademyId(migrated, content);
  const competition = content.competitions.find(({ participatingAcademyIds }) =>
    participatingAcademyIds.includes(academyId),
  );
  if (!competition) {
    throw new Error(`青训机构 ${academyId} 没有可用赛事`);
  }

  return CareerSaveV5Schema.parse({
    ...migrated,
    relationships:
      migrated.relationships.persons.length > 0
        ? migrated.relationships
        : initializeYouthRelationships(
            migrated.player.identity.primaryPosition as Position,
            createSeededRandomSource(migrated.randomState.seed + 7001),
            Number(migrated.season.startDate.slice(0, 4)),
          ),
    season: {
      ...migrated.season,
      academyId,
      fixtures:
        migrated.season.fixtures.length > 0
          ? migrated.season.fixtures
          : createYouthFixtures(
              academyId,
              competition,
              migrated.randomState.seed,
              migrated.season.startDate.slice(0, 4),
            ),
    },
    story: {
      ...migrated.story,
      pendingEvent: hydratePendingEvent(migrated.story.pendingEvent, content),
      pendingFeedback: hydratePendingFeedback(migrated.story.pendingFeedback, content),
    },
  });
};

const normalizeYouthAgeBoundary = (save: CareerSaveV5): CareerSaveV5 => {
  if (
    !save.offseason ||
    !isFinalYouthSeason(save.player.age) ||
    save.offseason.graduationEligible
  ) {
    return save;
  }
  return {
    ...save,
    offseason: { ...save.offseason, graduationEligible: true },
  };
};

const hydratePendingEvent = (
  pendingEvent: CareerSaveV5['story']['pendingEvent'],
  content: YouthContentBundle,
): CareerSaveV5['story']['pendingEvent'] => {
  if (!pendingEvent) return null;
  const definition = content.events.find(({ id }) => id === pendingEvent.eventId);
  if (!definition) return pendingEvent;

  return {
    ...pendingEvent,
    storyId: pendingEvent.storyId ?? definition.storyId ?? null,
    nextEventIds:
      pendingEvent.nextEventIds.length > 0
        ? pendingEvent.nextEventIds
        : (definition.nextEvents ?? []),
    choices: pendingEvent.choices.map((choice) => {
      const authored = definition.choices.find(({ id }) => id === choice.id);
      if (!authored) return choice;
      return {
        ...choice,
        ...(authored.response !== undefined ? { response: authored.response } : {}),
        ...(authored.resultTitle !== undefined ? { resultTitle: authored.resultTitle } : {}),
        ...(authored.responses !== undefined ? { responses: authored.responses } : {}),
        ...(authored.followUp !== undefined ? { followUp: authored.followUp } : {}),
        ...(authored.narrativeVariants !== undefined
          ? { narrativeVariants: authored.narrativeVariants }
          : {}),
        ...(authored.nextEventIds !== undefined ? { nextEventIds: authored.nextEventIds } : {}),
      };
    }),
  };
};

const hydratePendingFeedback = (
  pendingFeedback: CareerSaveV5['story']['pendingFeedback'],
  content: YouthContentBundle,
): CareerSaveV5['story']['pendingFeedback'] => {
  if (!pendingFeedback) return pendingFeedback;
  const definition = content.events.find(({ id }) => id === pendingFeedback.eventId);
  const authored = definition?.choices.find(({ id }) => id === pendingFeedback.choiceId);
  if (!authored) return pendingFeedback;
  const hasPersistedNarrative = pendingFeedback.narrativeVariantIndex !== undefined;

  return {
    ...pendingFeedback,
    choiceText: authored.text,
    ...(!hasPersistedNarrative && authored.response !== undefined
      ? { response: authored.response }
      : {}),
    ...(!hasPersistedNarrative && authored.followUp !== undefined
      ? { followUp: authored.followUp }
      : {}),
    nextEventIds:
      pendingFeedback.nextEventIds && pendingFeedback.nextEventIds.length > 0
        ? pendingFeedback.nextEventIds
        : (authored.nextEventIds ?? definition?.nextEvents ?? []),
  };
};

const resolveAcademyId = (save: CareerSaveV5, content: YouthContentBundle): string => {
  if (content.academies.some(({ id }) => id === save.season.academyId)) {
    return save.season.academyId;
  }

  const localAcademies = content.academies.filter(
    ({ regionId }) => regionId === save.player.identity.homelandId,
  );
  const candidates = localAcademies.length > 0 ? localAcademies : content.academies;
  if (candidates.length === 0) {
    throw new Error('没有可用的青训机构内容');
  }
  return candidates[save.randomState.seed % candidates.length]!.id;
};
