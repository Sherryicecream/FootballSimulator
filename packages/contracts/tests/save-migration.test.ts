import { describe, expect, it } from 'vitest';
import { CareerSaveSchema, CareerSaveV2Schema, migrateCareerSave } from '../src';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

describe('migrateCareerSave', () => {
  it('deterministically preserves v1 identity, academy, random state and ledger', () => {
    const v1 = CareerSaveSchema.parse(createV1Save());

    const first = migrateCareerSave(v1);
    const second = migrateCareerSave(v1);

    expect(first).toEqual(second);
    expect(first.player.identity).toEqual(v1.player.identity);
    expect(first.season.academyId).toBe('shanghai-pujiang');
    expect(first.randomState).toEqual(v1.randomState);
    expect(first.ledger).toHaveLength(v1.ledger.length);
    expect(first.story.themeCooldownsByTheme).toEqual({});
    expect(first.monthlyAdvance.interactiveEventCount).toBe(0);
    expect(CareerSaveV2Schema.safeParse(first).success).toBe(true);
  });

  it('rejects data that is neither a v1 nor v2 save', () => {
    expect(() => migrateCareerSave({ schemaVersion: 99 })).toThrow('无法迁移存档');
  });

  it('preserves a legacy pending feedback without inventing authored result fields', () => {
    const base = buildYouthSaveV2Fixture();
    const migrated = migrateCareerSave({
      ...base,
      story: {
        ...base.story,
        pendingFeedback: {
          eventId: 'misunderstanding-clarification',
          title: '训练场上的误会',
          choiceId: 'clarify',
          choiceText: '当面澄清误会',
          response: '旧版本的通用结果',
          participantResponses: [],
          stateChanges: [],
          relationshipChanges: [],
          followUp: '旧版本的通用后续',
        },
      },
    });

    expect(migrated.story.pendingFeedback?.response).toBe('旧版本的通用结果');
    expect(migrated.story.pendingFeedback?.resultTitle).toBeUndefined();
    expect(migrated.story.pendingFeedback?.resultTone).toBeUndefined();
    expect(migrated.story.pendingFeedback?.outcome).toBeUndefined();
  });
});

const createV1Save = () => ({
  schemaVersion: 1,
  contentVersion: 'bootstrap-1',
  careerId: 'career-42',
  player: {
    identity: {
      name: '林岳',
      hometown: '上海',
      homelandId: 'shanghai',
      dateOfBirth: '2008-01-01',
      primaryPosition: 'CENTER_BACK',
      preferredFoot: 'RIGHT',
      weakFootLevel: 30,
      growthBackground: 'academy',
      personalityTendency: 'composed',
    },
    attributes: {
      technical: {
        firstTouch: 50,
        dribbling: 50,
        passing: 52,
        shooting: 40,
        defending: 55,
        aerialAbility: 54,
      },
      physical: { pace: 52, strength: 55, stamina: 53, agility: 50 },
      mental: {
        offTheBall: 48,
        vision: 50,
        decision: 51,
        composure: 50,
        determination: 60,
        discipline: 58,
      },
    },
    hiddenTraits: {
      potential: 80,
      stability: 60,
      professionalism: 70,
      pressureResistance: 62,
      adaptability: 55,
      injuryProneness: 25,
    },
    age: 16,
    careerStage: 'YOUTH',
    reputation: 10,
  },
  world: { currentDate: '2024-09-08', season: 2024, weekNumber: 2 },
  context: {
    academyId: 'shanghai-pujiang',
    pendingOpportunity: null,
    playerState: {
      fitness: 70,
      morale: 60,
      coachTrust: 35,
      fatigue: 5,
      teamStatus: 'fringe',
    },
    pendingEvent: null,
    trainingFocus: null,
    trainingIntensity: 'normal',
  },
  relationships: { persons: [], activeRelations: [] },
  story: {
    bootstrapOpportunityWeek: 3,
    resolvedOpportunityIds: [],
    completedStoryIds: [],
    activeStorylines: [],
    cooldowns: {},
  },
  ledger: [
    {
      type: 'career-started',
      date: '2024-09-01',
      playerName: '林岳',
      age: 16,
      position: 'CENTER_BACK',
    },
  ],
  randomState: { seed: 42, sequencePosition: 7 },
});
