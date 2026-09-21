import type { ClubProfile, Position, ProSquadMember } from '@football/contracts';
import type { SeededRandomSource } from '../randomness';
import {
  carryOverRoster,
  inheritRelationship,
  pickLocalizedName,
  toPersonMemory,
  type PersonMemory,
} from '../people/person-memory';

const POSITION_TEMPLATE: Position[] = [
  'CENTER_BACK',
  'CENTER_BACK',
  'CENTER_BACK',
  'FULL_BACK',
  'FULL_BACK',
  'FULL_BACK',
  'DEFENSIVE_MIDFIELDER',
  'DEFENSIVE_MIDFIELDER',
  'MIDFIELDER',
  'MIDFIELDER',
  'MIDFIELDER',
  'WINGER',
  'WINGER',
  'WINGER',
  'FORWARD',
  'FORWARD',
  'FORWARD',
];

const clampScore = (value: number): number => Math.min(100, Math.max(20, Math.round(value)));

const nextPersonId = (clubId: string, usedPersonIds: ReadonlySet<string>): string => {
  let serial = 1;
  let personId = `${clubId}-p${serial}`;
  while (usedPersonIds.has(personId)) {
    serial += 1;
    personId = `${clubId}-p${serial}`;
  }
  return personId;
};

const buildPositionTemplate = (playerPosition: Position, rng: SeededRandomSource): Position[] => {
  const template = [...POSITION_TEMPLATE];
  const rivalCount = 2 + (rng.next() < 0.5 ? 1 : 0);
  for (let index = 0; index < rivalCount; index += 1) {
    template[(index * 5 + 2) % template.length] = playerPosition;
  }
  return template;
};

const createNewMember = (
  club: ClubProfile,
  playerPosition: Position,
  position: Position,
  playerAbility: number,
  rng: SeededRandomSource,
  previous: readonly PersonMemory[],
  usedPersonIds: ReadonlySet<string>,
  usedNames: ReadonlySet<string>,
): PersonMemory => {
  const baseAbility = club.tier * 8 + 20;
  const isRival = position === playerPosition;
  const delta = isRival
    ? Math.round((rng.next() - 0.35) * 14)
    : Math.round((rng.next() - 0.5) * 16);
  const ability = clampScore(baseAbility + delta);
  const relationshipToPlayer = inheritRelationship(previous, rng, isRival);
  return {
    personId: nextPersonId(club.id, usedPersonIds),
    name: pickLocalizedName(rng, club.personNamePool, usedNames),
    primaryPosition: position,
    currentAbility: isRival ? clampScore(Math.max(playerAbility - 6, ability)) : ability,
    age: rng.nextInt(18, 34),
    form: rng.nextInt(45, 64),
    fitness: rng.nextInt(80, 94),
    minutesPlayed: 0,
    traits: {
      ambition: rng.nextInt(isRival ? 65 : 40, isRival ? 95 : 80),
      workRate: rng.nextInt(45, 90),
    },
    relationshipToPlayer,
  };
};

const asProSquadMember = (person: PersonMemory, retained: boolean): ProSquadMember => ({
  personId: person.personId,
  name: person.name,
  primaryPosition: person.primaryPosition ?? 'MIDFIELDER',
  currentAbility: person.currentAbility ?? 50,
  age: Math.min(45, retained ? person.age + 1 : person.age),
  form: retained ? 50 : (person.form ?? 50),
  fitness: retained ? 85 : (person.fitness ?? 85),
  minutesPlayed: 0,
  ...(person.traits ? { traits: { ...person.traits } } : {}),
  ...(person.relationshipToPlayer ? { relationshipToPlayer: person.relationshipToPlayer } : {}),
});

/**
 * 生成职业俱乐部阵容：17–21 人覆盖全部位置，
 * 能力围绕俱乐部层级（tier×8+20）波动；同位置包含 2–3 名竞争者。
 *
 * 有同俱乐部上一季阵容时，先保留 50–70% 的合资格人物，再补入新球员。
 * 不同俱乐部的阵容不会互相继承，避免转会时把原队球员错误带入目标队。
 */
export const generateProSquad = (
  club: ClubProfile,
  playerPosition: Position,
  playerAbility: number,
  rng: SeededRandomSource,
  previousSquad: readonly ProSquadMember[] = [],
): ProSquadMember[] => {
  const template = buildPositionTemplate(playerPosition, rng);
  const sameClubPrevious = previousSquad.filter(({ personId }) =>
    personId.startsWith(`${club.id}-`),
  );
  const previousMemory = sameClubPrevious.map(toPersonMemory);
  const desiredPositionCounts = new Map<Position, number>();
  for (const position of template) {
    desiredPositionCounts.set(position, (desiredPositionCounts.get(position) ?? 0) + 1);
  }
  const generatedPositions = new Map<string, Position>();
  const carried = carryOverRoster(sameClubPrevious.map(toPersonMemory), {
    limit: template.length,
    rng,
    generateNew: (index, usedPersonIds, usedNames) => {
      const positionCounts = new Map<Position, number>();
      for (const person of previousMemory) {
        if (usedPersonIds.has(person.personId) && person.primaryPosition) {
          positionCounts.set(
            person.primaryPosition,
            (positionCounts.get(person.primaryPosition) ?? 0) + 1,
          );
        }
      }
      for (const [personId, position] of generatedPositions) {
        if (usedPersonIds.has(personId)) {
          positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
        }
      }
      const position =
        template.find((candidate) => (positionCounts.get(candidate) ?? 0) === 0) ??
        template.find(
          (candidate) =>
            (positionCounts.get(candidate) ?? 0) < (desiredPositionCounts.get(candidate) ?? 0),
        ) ??
        template[index % template.length]!;
      const person = createNewMember(
        club,
        playerPosition,
        position,
        playerAbility,
        rng,
        previousMemory,
        new Set([...previousMemory.map(({ personId }) => personId), ...usedPersonIds]),
        usedNames,
      );
      generatedPositions.set(person.personId, position);
      return person;
    },
  });
  const previousIds = new Set(previousMemory.map(({ personId }) => personId));
  return carried.map((person) => asProSquadMember(person, previousIds.has(person.personId)));
};

/** 深度图：每个位置按能力降序排列成员 ID。 */
export const buildDepthChart = (squad: readonly ProSquadMember[]): Record<string, string[]> => {
  const chart: Record<string, string[]> = {};
  for (const member of squad) {
    const list = chart[member.primaryPosition] ?? [];
    list.push(member.personId);
    chart[member.primaryPosition] = list;
  }
  for (const key of Object.keys(chart)) {
    chart[key] = [...chart[key]!].sort((left, right) => {
      const l = squad.find(({ personId }) => personId === left)!;
      const r = squad.find(({ personId }) => personId === right)!;
      return r.currentAbility - l.currentAbility;
    });
  }
  return chart;
};

/** 球员在同一位置深度图中的排位（1 = 队内最强；竞争者与球员共同参与排序）。 */
export const depthRank = (
  depthChart: Record<string, string[]>,
  position: Position,
  playerPersonId: string,
): number => {
  const list = depthChart[position] ?? [];
  const index = list.indexOf(playerPersonId);
  return index < 0 ? list.length + 1 : index + 1;
};
