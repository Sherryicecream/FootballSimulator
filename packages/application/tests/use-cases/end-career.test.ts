import { describe, expect, it } from 'vitest';
import { CareerSaveV5Schema, migrateCareerSaveV7 } from '@football/contracts';
import {
  completeYouthSeason,
  enterOffseason,
  generateContractOffers,
  loadCareer,
  requestCareerMarket,
  retire,
  signContract,
  startProfessionalSeason,
  submitAgentPreferences,
} from '../../src/index';
import {
  canEndYouthCareer,
  endProfessionalCareer,
  endYouthCareer,
} from '../../src/use-cases/end-career';
import { academies, content, createSave, finishSeason } from '../fixtures/youth-save';

const professionalAttributes = {
  technical: {
    firstTouch: 70,
    dribbling: 68,
    passing: 66,
    shooting: 72,
    defending: 50,
    aerialAbility: 60,
  },
  physical: { pace: 74, strength: 66, stamina: 70, agility: 68 },
  mental: {
    offTheBall: 72,
    vision: 64,
    decision: 66,
    composure: 68,
    determination: 74,
    discipline: 70,
  },
};

const finalYouthOffseason = ({ graduationEligible }: { graduationEligible: boolean }) => {
  let save = finishSeason(createSave(42));
  save = {
    ...save,
    player: {
      ...save.player,
      age: 20,
      identity: { ...save.player.identity, dateOfBirth: '2005-01-01' },
    },
  };
  const completed = completeYouthSeason(save);
  const offseason = enterOffseason(completed.save, academies).save;
  return migrateCareerSaveV7({
    ...offseason,
    offseason: { ...offseason.offseason!, graduationEligible },
  });
};

const professionalOffseason = ({ age }: { age: number }) => {
  let save = finishSeason(createSave(42));
  save = {
    ...save,
    clubContext: { ...save.clubContext, coachEvaluation: 75, firstTeamStage: 'watchlist' },
    player: { ...save.player, age: 18, attributes: professionalAttributes },
    seasonStats: { appearances: 20, goals: 6, assists: 3, ratingSum: 145, ratingCount: 20 },
  };
  const completed = completeYouthSeason(save);
  save = enterOffseason(completed.save, content.academies).save;
  save = submitAgentPreferences(save, { leagueTierBias: 'balanced', priority: 'playing-time' });
  save = generateContractOffers(save, content);
  save = signContract(save, save.pendingOffers[0]!.id);
  const started = startProfessionalSeason(migrateCareerSaveV7(save), content.clubs);
  return migrateCareerSaveV7({
    ...started,
    careerPhase: 'pro-offseason',
    proPhase: 'settled',
    player: { ...started.player, age },
    proSeason: {
      ...started.proSeason!,
      currentDate: started.proSeason!.endDate,
      currentMonth: started.proSeason!.endDate.slice(0, 7),
      currentWeek: 52,
      completed: true,
    },
    proSeasonStats: {
      ...started.proSeasonStats,
      leagueAppearances: 20,
      goals: 6,
      assists: 3,
      minutes: 1400,
      ratingSum: 145,
      ratingCount: 20,
    },
  });
};

describe('生涯终局用例', () => {
  describe.each([
    { phase: 'pro-offseason', kind: 'voluntary-retirement' },
    { phase: 'free-agent', kind: 'voluntary-retirement' },
    { phase: 'free-agent', kind: 'market-exit' },
  ] as const)('$phase / $kind', ({ phase, kind }) => {
    it.each(['pendingEvent', 'pendingFeedback'] as const)(
      'rejects ending with %s without changing the save',
      (pendingNode) => {
        const base = professionalOffseason({ age: 22 });
        const save = migrateCareerSaveV7({
          ...base,
          careerPhase: phase,
          story: {
            ...base.story,
            [pendingNode]:
              pendingNode === 'pendingEvent'
                ? {
                    eventId: 'pending-retirement-event',
                    title: '尚未处理的事件',
                    description: '需要先作出决定。',
                    choices: [{ id: 'continue', text: '继续', riskLabel: 'low', effects: {} }],
                    resolvedChoiceId: null,
                    participantIds: [],
                    factRefs: [],
                  }
                : {
                    eventId: 'pending-retirement-event',
                    title: '尚未确认的反馈',
                    choiceId: 'continue',
                    choiceText: '继续',
                    response: '已作出决定。',
                    participantResponses: [],
                    stateChanges: [],
                    relationshipChanges: [],
                    followUp: '需要确认后继续。',
                  },
          },
        });
        const before = structuredClone(save);

        expect(() => endProfessionalCareer(save, '2030-06-30', kind)).toThrow(/事件|反馈/);
        expect(save).toEqual(before);
        const cleared = { ...save, story: { ...save.story, [pendingNode]: null } };
        const ended = endProfessionalCareer(cleared, '2030-06-30', kind);
        expect(ended.careerEnd?.kind).toBe(kind);
        expect(ended.randomState).toEqual(save.randomState);
        expect(endProfessionalCareer(ended, '2030-06-30', kind)).toEqual(ended);
      },
    );
  });

  it('ends a final youth window without a professional contract', () => {
    const save = finalYouthOffseason({ graduationEligible: false });
    const ended = endYouthCareer(save);

    expect(ended).toMatchObject({
      careerPhase: 'retired',
      retiredOn: save.season.endDate,
      careerEnd: { kind: 'youth-no-contract', endedOn: save.season.endDate },
    });
    expect(ended.randomState).toEqual(save.randomState);
    expect(ended.ledger.at(-1)).toMatchObject({
      type: 'retirement',
      occurredOn: save.season.endDate,
      seasonId: save.season.id,
      ordinal: expect.any(Number),
    });
  });

  it('ends an age-exhausted youth career despite final-offseason graduation eligibility', () => {
    const save = finalYouthOffseason({ graduationEligible: true });

    expect(canEndYouthCareer(save)).toBe(true);
    expect(endYouthCareer(save).careerEnd?.kind).toBe('youth-no-contract');
  });

  it('rejects youth-no-contract ending for a schema-valid final offseason with a contract', () => {
    const signedProfessional = professionalOffseason({ age: 22 });
    const save = migrateCareerSaveV7({
      ...finalYouthOffseason({ graduationEligible: true }),
      contract: signedProfessional.contract,
    });

    expect(canEndYouthCareer(save)).toBe(false);
    expect(() => endYouthCareer(save)).toThrow('青训生涯尚未达到结束条件');
  });

  it('rejects ending a youth career while another youth season remains available', () => {
    const save = migrateCareerSaveV7({
      ...finalYouthOffseason({ graduationEligible: false }),
      careerPhase: 'offseason',
      careerEnd: null,
      retiredOn: null,
      player: {
        ...finalYouthOffseason({ graduationEligible: false }).player,
        age: 18,
        identity: {
          ...finalYouthOffseason({ graduationEligible: false }).player.identity,
          dateOfBirth: '2008-01-01',
        },
      },
    });

    expect(canEndYouthCareer(save)).toBe(false);
    expect(() => endYouthCareer(save)).toThrow('青训生涯尚未达到结束条件');
  });

  it('allows a 22-year-old professional to retire only in the offseason', () => {
    const save = professionalOffseason({ age: 22 });

    expect(endProfessionalCareer(save, '2030-06-30').careerEnd?.kind).toBe('voluntary-retirement');
    expect(() =>
      endProfessionalCareer({ ...save, careerPhase: 'pro-season' }, '2030-06-30'),
    ).toThrow('职业赛季进行中不能结束生涯');
  });

  it('allows market exit only for free agents', () => {
    const save = professionalOffseason({ age: 22 });

    expect(() => endProfessionalCareer(save, '2030-06-30', 'market-exit')).toThrow(
      '只有自由球员可以离开职业足坛',
    );
    expect(
      endProfessionalCareer({ ...save, careerPhase: 'free-agent' }, '2030-06-30', 'market-exit')
        .careerEnd?.kind,
    ).toBe('market-exit');
  });

  it('closes active club history and clears offers without advancing randomness', () => {
    const save = requestCareerMarket(professionalOffseason({ age: 22 }), content, 'permanent');
    const withClub = {
      ...save,
      clubHistory: [
        {
          clubId: save.contract!.clubId,
          clubName: save.contract!.clubName,
          from: save.contract!.signedOn,
          to: null,
          seasons: 1,
          appearances: 20,
          goals: 6,
        },
      ],
    };

    const ended = endProfessionalCareer(withClub, '2030-06-30');
    expect(ended.pendingOffers).toEqual([]);
    expect(ended.clubHistory[0]?.to).toBe('2030-06-30');
    expect(ended.randomState).toEqual(withClub.randomState);
  });

  it('keeps public retirement compatible with a v5 caller while returning v6', () => {
    const v5Source = Object.fromEntries(
      Object.entries(professionalOffseason({ age: 22 })).filter(
        ([key]) => !['careerEnd', 'mechanicsVersion', 'moments', 'worldRegistry'].includes(key),
      ),
    );
    const legacy = CareerSaveV5Schema.parse({ ...v5Source, schemaVersion: 5 });
    const retired = retire(legacy, '2030-06-30');

    expect(retired.schemaVersion).toBe(6);
    expect(retired).toMatchObject({
      schemaVersion: 6,
      careerPhase: 'retired',
      careerEnd: { kind: 'voluntary-retirement', endedOn: '2030-06-30' },
    });
  });

  it('keeps ordinary loaded careers on v7 after migration', () => {
    const loaded = loadCareer(createSave(99), content);

    expect(loaded.schemaVersion).toBe(8);
  });

  it('keeps duplicate terminal submission idempotent', () => {
    const first = endYouthCareer(finalYouthOffseason({ graduationEligible: false }));

    expect(endYouthCareer(first)).toEqual(first);
  });
});
