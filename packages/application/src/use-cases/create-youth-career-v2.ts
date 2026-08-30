import {
  CareerSaveV3Schema,
  YouthContentBundleSchema,
  migrateCareerSaveV3,
  type CareerSaveV3,
  type Position,
  type YouthContentBundle,
} from '@football/contracts';
import {
  createSeededRandomSource,
  createYouthFixtures,
  initializeYouthRelationships,
} from '@football/simulation';

export const createYouthCareerV2 = (
  rawSave: unknown,
  rawContent: YouthContentBundle,
): CareerSaveV3 => {
  const migrated = migrateCareerSaveV3(rawSave);
  const content = YouthContentBundleSchema.parse(rawContent);
  const academyId = resolveAcademyId(migrated, content);
  const competition = content.competitions.find(({ participatingAcademyIds }) =>
    participatingAcademyIds.includes(academyId),
  );
  if (!competition) {
    throw new Error(`青训机构 ${academyId} 没有可用赛事`);
  }

  return CareerSaveV3Schema.parse({
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
  });
};

const resolveAcademyId = (save: CareerSaveV3, content: YouthContentBundle): string => {
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
