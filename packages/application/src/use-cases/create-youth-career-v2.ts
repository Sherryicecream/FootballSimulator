import {
  CareerSaveV2Schema,
  YouthContentBundleSchema,
  migrateCareerSave,
  type CareerSaveV2,
  type ScheduledYouthFixture,
  type YouthCompetitionDefinition,
  type YouthContentBundle,
} from '@football/contracts';

export const createYouthCareerV2 = (
  rawSave: unknown,
  rawContent: YouthContentBundle,
): CareerSaveV2 => {
  const migrated = migrateCareerSave(rawSave);
  const content = YouthContentBundleSchema.parse(rawContent);
  const academyId = resolveAcademyId(migrated, content);
  const competition = content.competitions.find(({ participatingAcademyIds }) =>
    participatingAcademyIds.includes(academyId),
  );
  if (!competition) {
    throw new Error(`青训机构 ${academyId} 没有可用赛事`);
  }

  return CareerSaveV2Schema.parse({
    ...migrated,
    season: {
      ...migrated.season,
      academyId,
      fixtures: createFixtures(
        academyId,
        competition,
        migrated.randomState.seed,
        migrated.season.startDate.slice(0, 4),
      ),
    },
  });
};

const resolveAcademyId = (save: CareerSaveV2, content: YouthContentBundle): string => {
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

const createFixtures = (
  academyId: string,
  competition: YouthCompetitionDefinition,
  seed: number,
  seasonYear: string,
): ScheduledYouthFixture[] => {
  const opponents = competition.participatingAcademyIds.filter((id) => id !== academyId);
  if (opponents.length === 0) {
    throw new Error(`赛事 ${competition.id} 没有有效对手`);
  }

  const range = competition.targetFixtureCount.max - competition.targetFixtureCount.min + 1;
  const fixtureCount = competition.targetFixtureCount.min + (seed % range);
  return Array.from({ length: fixtureCount }, (_, index) => {
    const opponentId = opponents[(index + seed) % opponents.length]!;
    const isHome = (index + seed) % 2 === 0;
    const week = Math.floor((index * 40) / fixtureCount) + 2;
    return {
      id: `${competition.id}-${index + 1}`,
      weekKey: `${seasonYear}-W${String(week).padStart(2, '0')}`,
      competitionId: competition.id,
      homeClubId: isHome ? academyId : opponentId,
      awayClubId: isHome ? opponentId : academyId,
      status: 'scheduled' as const,
      resultId: null,
    };
  });
};
