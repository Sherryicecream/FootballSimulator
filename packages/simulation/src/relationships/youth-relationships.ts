import type { Person, Position, RelationshipGraph } from '@football/contracts';
import type { SeededRandomSource } from '../randomness';
import { createPerson } from './relationship-manager';

const coachNames = ['周岚', '高峥', '梁岳', '沈卓'];
const playerNames = ['陈放', '许骁', '林越', '韩川', '顾扬', '赵临'];

export const initializeYouthRelationships = (
  primaryPosition: Position,
  rng: SeededRandomSource,
  season = 2024,
): RelationshipGraph => {
  const coach = withRole(
    createPerson(
      'coach-main',
      `${rng.pick(coachNames)}教练`,
      'youth-coach',
      rng.nextInt(38, 55),
      '严谨',
    ),
    'youth-coach',
  );
  const assistant = withRole(
    createPerson(
      'coach-assistant',
      `${rng.pick(coachNames)}助教`,
      'assistant-coach',
      rng.nextInt(30, 45),
      '耐心',
    ),
    'assistant-coach',
  );
  const teammates = Array.from({ length: 3 }, (_, index) => {
    const person = withRole(
      createPerson(
        `teammate-${index + 1}`,
        rng.pick(playerNames),
        'teammate',
        rng.nextInt(16, 18),
        '积极',
      ),
      'teammate',
    );
    return {
      ...person,
      primaryPosition: index === 0 ? primaryPosition : rng.pick(otherPositions(primaryPosition)),
    };
  });
  const rival: Person = {
    ...withRole(
      createPerson('rival-position', rng.pick(playerNames), 'rival', rng.nextInt(16, 18), '好胜'),
      'rival',
    ),
    primaryPosition,
  };
  const family = withRole(createPerson('family-home', '家人', 'family', 45, '支持'), 'family');
  const persons = [coach, assistant, ...teammates, rival, family];
  return {
    persons,
    activeRelations: persons.map(({ id, role }) => ({
      personId: id,
      relationType:
        role === 'youth-coach' || role === 'assistant-coach'
          ? 'coach'
          : role === 'rival'
            ? 'rival'
            : role === 'family'
              ? 'family'
              : 'teammate',
      sinceSeason: season,
    })),
  };
};

const withRole = (person: Person, role: Person['role']): Person => ({ ...person, role });
const otherPositions = (position: Position): Position[] =>
  (
    [
      'CENTER_BACK',
      'FULL_BACK',
      'DEFENSIVE_MIDFIELDER',
      'MIDFIELDER',
      'WINGER',
      'FORWARD',
    ] as Position[]
  ).filter((candidate) => candidate !== position);
