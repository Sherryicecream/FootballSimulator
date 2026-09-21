import { describe, expect, it } from 'vitest';
import {
  CareerSaveV8Schema,
  migrateCareerSaveV8,
  type CareerSaveV5Like,
  type ClubProfile,
  type Country,
  type LeagueStanding,
  type WorldClubSeasonResult,
  type WorldRegistry,
} from '@football/contracts';
import { allClubProfiles, getYouthContent } from '../../../content/src';
import {
  advanceProMonth,
  clearEventFeedback,
  completeProfessionalSeason,
  signMarketOffer,
  startProfessionalSeason,
  submitCareerDecision,
} from '../../src';
import { buildWorldClubPulses } from '@football/simulation';
import {
  createWorldRegistry,
  mergeWorldClubPulses,
  writeWorldLeagueSummary,
} from '../../src/world/world-registry';
import { createYouthSave } from '../../../simulation/tests/fixtures/youth-save';

const clubs = allClubProfiles();
const content = getYouthContent();
const playableCountries: readonly Country[] = [
  'china',
  'england',
  'spain',
  'germany',
  'italy',
  'france',
  'japan',
  'korea',
];

type SaveWithWorld = CareerSaveV5Like & { worldRegistry?: WorldRegistry };

const clubFor = (country: Country, index = 0): ClubProfile => {
  const candidates = clubs.filter(({ country: clubCountry }) => clubCountry === country);
  const club = candidates[index];
  if (!club) throw new Error(`缺少 ${country} 测试俱乐部`);
  return club;
};

const clubForTier = (country: Country, tier: number): ClubProfile => {
  const club = clubs.find(({ country: clubCountry, tier: clubTier }) => {
    return clubCountry === country && clubTier === tier;
  });
  if (!club) throw new Error(`缺少 ${country} 层级 ${tier} 测试俱乐部`);
  return club;
};

const makeSignedSave = (
  country: Country,
  seed: number,
  targetClub = clubFor(country),
): CareerSaveV5Like => {
  const base = migrateCareerSaveV8(createYouthSave({ careerId: `career-${seed}` }));
  const club = targetClub;
  return CareerSaveV8Schema.parse({
    ...base,
    schemaVersion: 8,
    careerPhase: 'professional-contract',
    player: {
      ...base.player,
      age: 18,
      careerStage: 'PROFESSIONAL',
      development: {
        ...base.player.development,
        adaptability: 80,
      },
    },
    contract: {
      id: `contract-${country}-${seed}`,
      clubId: club.id,
      clubName: club.name,
      clubTier: club.tier,
      salaryPerYear: 60_000,
      contractYears: 3,
      squadRole: 'first-team-rotation',
      offerKind: 'permanent',
      overseas: Boolean(club.overseas),
      country,
      promise: { kind: 'none' },
      releaseClauseNote: '',
      signedOn: '2025-07-01',
      seasonsCompleted: 0,
      promiseStatus: 'pending',
    },
    overseasSince: club.overseas ? '2025-07-01' : null,
    proSeason: null,
    clubHistory: [],
  });
};

const worldRegistryOf = (save: CareerSaveV5Like): WorldRegistry | undefined =>
  (save as SaveWithWorld).worldRegistry;

const finishProfessionalSeason = (
  initial: CareerSaveV5Like,
  seasonClubs: readonly ClubProfile[],
  events: typeof content.events = [],
): { save: CareerSaveV5Like; eventIds: string[] } => {
  let save = initial;
  const eventIds: string[] = [];
  for (let guard = 0; guard < 30 && !save.proSeason?.completed; guard += 1) {
    const outcome = advanceProMonth(save, seasonClubs, events);
    if (outcome.status === 'awaiting-decision') {
      eventIds.push(outcome.event.eventId);
      save = submitCareerDecision(
        outcome.save,
        outcome.event.eventId,
        outcome.event.choices[0]!.id,
      );
      if (save.story.pendingFeedback) save = clearEventFeedback(save);
    } else {
      save = outcome.save;
    }
  }
  if (!save.proSeason?.completed) throw new Error('职业赛季未在应用层月度推进中完成');
  return { save, eventIds };
};

const standingsWithPlayerRank = (
  standings: readonly LeagueStanding[],
  playerClubId: string,
  playerRank: number,
): LeagueStanding[] => {
  const otherIds = standings
    .map(({ clubId }) => clubId)
    .filter((clubId) => clubId !== playerClubId);
  otherIds.splice(Math.max(0, Math.min(playerRank - 1, otherIds.length)), 0, playerClubId);
  return otherIds.map((clubId, index) => {
    const points = Math.max(0, 66 - index * 6);
    const won = Math.floor(points / 3);
    const drawn = points % 3;
    return {
      clubId,
      played: 22,
      won,
      drawn,
      lost: Math.max(0, 22 - won - drawn),
      goalsFor: 50 - index,
      goalsAgainst: index,
      points,
    };
  });
};

const withPlayerRank = (save: CareerSaveV5Like, playerRank: number): CareerSaveV5Like => ({
  ...save,
  proSeason: {
    ...save.proSeason!,
    standings: standingsWithPlayerRank(
      save.proSeason!.standings,
      save.proSeason!.clubId,
      playerRank,
    ),
  },
});

const assertDomesticLeague = (save: CareerSaveV5Like, country: Country): void => {
  const pro = save.proSeason!;
  const leagueClubIds = new Set(pro.standings.map(({ clubId }) => clubId));
  expect(pro.fixtures).toHaveLength(12 * 11);
  expect(pro.standings).toHaveLength(12);
  for (const clubId of leagueClubIds) {
    const appearances = pro.fixtures.filter(
      ({ homeClubId, awayClubId }) => homeClubId === clubId || awayClubId === clubId,
    );
    expect(appearances).toHaveLength(22);
  }
  const pairCounts = new Map<string, number>();
  for (const fixture of pro.fixtures) {
    const home = clubs.find(({ id }) => id === fixture.homeClubId);
    const away = clubs.find(({ id }) => id === fixture.awayClubId);
    expect(home?.country).toBe(country);
    expect(away?.country).toBe(country);
    const key = [fixture.homeClubId, fixture.awayClubId].sort().join(':');
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  expect([...pairCounts.values()].every((count) => count === 2)).toBe(true);
};

const makeTransferOffer = (club: ClubProfile) => ({
  id: `transfer-offer-${club.id}`,
  clubId: club.id,
  clubName: club.name,
  clubTier: club.tier,
  salaryPerYear: 70_000,
  contractYears: 2,
  squadRole: 'first-team-rotation' as const,
  offerKind: 'permanent' as const,
  overseas: Boolean(club.overseas),
  country: club.country,
  promise: { kind: 'none' as const },
  releaseClauseNote: '',
});

const runWorldSeasons = (): WorldRegistry => {
  let registry = createWorldRegistry();
  let previousPulses = registry.clubPulses;
  const stableClubIds = new Set(clubs.map(({ id }) => id));

  for (let seasonIndex = 0; seasonIndex < 3; seasonIndex += 1) {
    const seasonId = `world-ecosystem-${2030 + seasonIndex}`;
    const seasonResults: WorldClubSeasonResult[] = clubs.map((club) => {
      const countryClubs = clubs.filter(({ country }) => country === club.country);
      const topTier = Math.max(...countryClubs.map(({ tier }) => tier));
      const active = countryClubs
        .filter(({ tier }) => tier === topTier)
        .sort((a, b) => a.id.localeCompare(b.id));
      const rotation = (seasonIndex * 3) % active.length;
      const rank = active.findIndex(({ id }) => id === club.id);
      const finalRank =
        club.tier === topTier ? ((rank - rotation + active.length) % active.length) + 1 : null;
      return {
        clubId: club.id,
        country: club.country ?? 'china',
        tier: club.tier,
        seasonId,
        finalRank,
        points: finalRank === null ? 0 : Math.max(0, 66 - finalRank * 4),
        domesticHonours: finalRank === 1 ? ['联赛冠军'] : [],
        continentalStatus: 'none',
      };
    });
    const pulses = buildWorldClubPulses({ clubs, seasonResults, previous: previousPulses });
    expect(new Set(pulses.map(({ clubId }) => clubId))).toEqual(stableClubIds);
    registry = mergeWorldClubPulses(registry, pulses);

    for (const country of ['germany', 'france', 'italy', 'korea'] as const) {
      const countryClubs = clubs
        .filter(({ country: clubCountry }) => clubCountry === country)
        .filter(
          ({ tier }) =>
            tier ===
            Math.max(...clubs.filter(({ country: c }) => c === country).map(({ tier: t }) => t)),
        )
        .sort((a, b) => a.id.localeCompare(b.id));
      const rotation = (seasonIndex * 3) % countryClubs.length;
      const champion = countryClubs[rotation]!;
      const relegated = countryClubs[(rotation + countryClubs.length - 1) % countryClubs.length]!;
      registry = writeWorldLeagueSummary(registry, {
        country,
        source: 'world',
        seasonId: `${seasonId}-${country}-tier-${champion.tier}`,
        completed: true,
        champion: champion.id,
        promoted: [champion.id],
        relegated: [relegated.id],
      });
    }
    previousPulses = pulses;
  }

  return registry;
};

describe('八国职业联赛 application 可运行验证', () => {
  it('中国出生球员完成国内职业赛季，并为旧存档补齐默认世界注册表', () => {
    const chinese = clubs.filter(({ country }) => country === 'china');
    expect(chinese).toHaveLength(72);
    expect(new Set(chinese.map(({ tier }) => tier))).toEqual(new Set([3, 4, 5, 6, 7, 8]));

    const current = makeSignedSave('china', 1501);
    const legacyWithoutRegistry: SaveWithWorld = { ...current };
    delete legacyWithoutRegistry.worldRegistry;
    const started = startProfessionalSeason({ ...legacyWithoutRegistry, schemaVersion: 7 }, clubs);
    assertDomesticLeague(started, 'china');
    expect(worldRegistryOf(started)).toMatchObject({
      entries: [expect.objectContaining({ country: 'china', source: 'player', completed: false })],
    });
    const completed = finishProfessionalSeason(started, clubs).save;
    const settled = completeProfessionalSeason(completed).save;
    expect(settled.careerPhase).toBe('pro-offseason');
    expect(settled.seasonHistory.at(-1)?.seasonId).toBe(started.proSeason?.id);
  });

  it('英格兰完成两个职业赛季，并记录可解释的升级与降级', () => {
    const first = startProfessionalSeason(
      makeSignedSave('england', 1502, clubForTier('england', 7)),
      clubs,
    );
    assertDomesticLeague(first, 'england');
    const firstFinished = finishProfessionalSeason(first, clubs).save;
    const firstSettled = completeProfessionalSeason(withPlayerRank(firstFinished, 1)).save;
    expect(firstSettled.seasonHistory.at(-1)?.honours).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'promotion', clubId: first.proSeason?.clubId }),
      ]),
    );

    const second = startProfessionalSeason(firstSettled, clubs);
    assertDomesticLeague(second, 'england');
    const secondFinished = finishProfessionalSeason(second, clubs).save;
    const secondSettled = completeProfessionalSeason(withPlayerRank(secondFinished, 12)).save;
    expect(secondSettled.seasonHistory.at(-1)?.honours).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'relegation', clubId: second.proSeason?.clubId }),
      ]),
    );
    expect(secondSettled.seasonHistory).toHaveLength(2);
  });

  it('从英格兰转至西班牙后切换联赛、保留跨赛季桥接并触发文化适应事件', () => {
    const england = startProfessionalSeason(makeSignedSave('england', 1503), clubs);
    const englandFinished = finishProfessionalSeason(england, clubs).save;
    const englandSettled = completeProfessionalSeason(englandFinished).save;
    const spain = clubFor('spain');
    const moved = signMarketOffer(
      {
        ...englandSettled,
        careerPhase: 'pro-offseason',
        pendingOffers: [makeTransferOffer(spain)],
      },
      `transfer-offer-${spain.id}`,
    );
    const started = startProfessionalSeason(moved, clubs);
    assertDomesticLeague(started, 'spain');
    expect(started.proSeason?.competitionId).toBe(`pro-spain-tier-${started.contract?.clubTier}`);
    expect(started.proSeason?.calendarBridge).toMatchObject({
      fromCountry: 'england',
      toCountry: 'spain',
    });

    const adaptation = content.events.find(({ id }) => id === 'europe-tactical-style');
    expect(adaptation?.condition.requireCountry).toBe('spain');
    const finished = finishProfessionalSeason(started, clubs, adaptation ? [adaptation] : []).save;
    expect(finished.ledger.some(({ eventId }) => eventId === 'europe-tactical-style')).toBe(true);
  });

  it('从中国转至日本后使用亚洲赛历并完成一个赛季', () => {
    const china = startProfessionalSeason(makeSignedSave('china', 1504), clubs);
    const chinaFinished = finishProfessionalSeason(china, clubs).save;
    const chinaSettled = completeProfessionalSeason(chinaFinished).save;
    const japan = clubFor('japan');
    const moved = signMarketOffer(
      {
        ...chinaSettled,
        careerPhase: 'pro-offseason',
        pendingOffers: [makeTransferOffer(japan)],
      },
      `transfer-offer-${japan.id}`,
    );
    const started = startProfessionalSeason(moved, clubs);
    assertDomesticLeague(started, 'japan');
    expect(started.proSeason?.startDate.endsWith('-03-01')).toBe(true);
    expect(started.proSeason?.endDate.endsWith('-11-30')).toBe(true);
    const finished = finishProfessionalSeason(started, clubs).save;
    const settled = completeProfessionalSeason(withPlayerRank(finished, 1)).save;
    const honour = settled.seasonHistory
      .at(-1)
      ?.honours.find(({ kind }) => kind === 'league-champion');
    expect(honour?.clubId).toBe(started.proSeason?.clubId);
    expect(clubs.find(({ id }) => id === honour?.clubId)?.country).toBe('japan');
  });

  it('德国、法国、意大利、韩国连续结算三季，冠军与俱乐部身份保持在对应国家', () => {
    const registry = runWorldSeasons();
    expect(registry.entries).toHaveLength(12);
    for (const country of ['germany', 'france', 'italy', 'korea'] as const) {
      const entries = registry.entries.filter(
        ({ country: entryCountry }) => entryCountry === country,
      );
      expect(entries).toHaveLength(3);
      for (const entry of entries) {
        const champion = clubs.find(({ id }) => id === entry.champion);
        expect(champion?.country).toBe(country);
        expect(entry.promoted).toHaveLength(1);
        expect(entry.relegated).toHaveLength(1);
      }
    }
    expect(
      registry.entries.every(
        ({ champion }) => clubs.find(({ id }) => id === champion)?.country !== 'china',
      ),
    ).toBe(true);
    expect(registry.clubPulses).toHaveLength(240);
    expect(new Set(registry.clubPulses.map(({ clubId }) => clubId))).toEqual(
      new Set(
        playableCountries.flatMap((country) =>
          clubs.filter(({ country: c }) => c === country).map(({ id }) => id),
        ),
      ),
    );
  });
});
