import type { Position, ProSquadMember } from '@football/contracts';
import type { SeededRandomSource } from '../randomness';

export type RosterRelationship = 'teammate' | 'friendship' | 'rivalry';

/**
 * A compact memory of a professional squad person. Optional fields keep the
 * carry-over helper usable with older saves and small deterministic fixtures.
 */
export type PersonMemory = {
  personId: string;
  name: string;
  age: number;
  primaryPosition?: Position;
  currentAbility?: number;
  form?: number;
  fitness?: number;
  minutesPlayed?: number;
  traits?: Record<string, number>;
  relationshipToPlayer?: RosterRelationship;
};

export type ProfessionalNamePool = readonly string[];

export interface CarryOverRosterOptions {
  limit: number;
  rng: SeededRandomSource;
  generateNew?: (
    index: number,
    usedPersonIds: ReadonlySet<string>,
    usedNames: ReadonlySet<string>,
  ) => PersonMemory;
}

const FALLBACK_NAMES = [
  '张晨',
  '李昊',
  '王宁',
  '陈宇',
  '林川',
  '周恺',
  '赵安',
  '吴越',
  '徐航',
  '孙哲',
  '马骁',
  '朱辰',
  '胡扬',
  '郭远',
  '何骏',
  '高朗',
  '罗澄',
  '郑屹',
  '梁恺',
  '谢言',
  '宋洋',
  '唐逸',
  '许诺',
  '韩卓',
] as const;

const sanitizeName = (name: string): string => name.trim().replace(/\d+$/, '').trim() || '新援';

const nextAvailableName = (
  namePool: ProfessionalNamePool,
  usedNames: ReadonlySet<string>,
  index: number,
): string => {
  const candidates = [...namePool, ...FALLBACK_NAMES].map(sanitizeName);
  const available = candidates.find((candidate) => !usedNames.has(candidate));
  if (available) return available;
  const base = candidates[index % Math.max(1, candidates.length)] ?? '新援';
  const disambiguators = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  return `${base}·${disambiguators[index % disambiguators.length]}`;
};

export const pickLocalizedName = (
  rng: SeededRandomSource,
  namePool: ProfessionalNamePool = FALLBACK_NAMES,
  usedNames: ReadonlySet<string> = new Set(),
): string => {
  const normalized = [...namePool].map(sanitizeName).filter(Boolean);
  const available = normalized.filter((name) => !usedNames.has(name));
  if (available.length > 0) return rng.pick(available);
  return nextAvailableName(namePool, usedNames, rng.nextInt(0, 999));
};

const isEligibleForCarryOver = (person: PersonMemory): boolean =>
  person.age >= 17 &&
  person.age <= 34 &&
  (person.currentAbility === undefined ||
    (Number.isFinite(person.currentAbility) &&
      person.currentAbility >= 20 &&
      person.currentAbility <= 100));

const fallbackPerson = (
  index: number,
  rng: SeededRandomSource,
  usedPersonIds: ReadonlySet<string>,
  usedNames: ReadonlySet<string>,
): PersonMemory => {
  let serial = index + 1;
  let personId = `new-person-${serial}`;
  while (usedPersonIds.has(personId)) {
    serial += 1;
    personId = `new-person-${serial}`;
  }
  return {
    personId,
    name: pickLocalizedName(rng, FALLBACK_NAMES, usedNames),
    age: rng.nextInt(18, 28),
    currentAbility: rng.nextInt(35, 70),
    form: rng.nextInt(45, 65),
    fitness: rng.nextInt(80, 94),
    minutesPlayed: 0,
    relationshipToPlayer: 'teammate',
  };
};

/**
 * Keep a deterministic 50–70% core of an eligible same-club squad and fill
 * the remaining slots with genuinely new people.
 */
export const carryOverRoster = (
  previous: readonly PersonMemory[],
  options: CarryOverRosterOptions,
): PersonMemory[] => {
  const limit = Math.max(0, Math.floor(options.limit));
  if (limit === 0) return [];

  const uniqueEligible = options.rng
    .shuffle(previous.filter(isEligibleForCarryOver))
    .filter(
      (person, index, all) =>
        all.findIndex(({ personId }) => personId === person.personId) === index,
    );
  const lowerBound = Math.ceil(limit * 0.5);
  const upperBound = Math.max(lowerBound, Math.floor(limit * 0.7));
  const preferredTarget = Math.ceil(limit * 0.6);
  const retentionTarget = Math.min(
    uniqueEligible.length,
    Math.max(lowerBound, Math.min(preferredTarget, upperBound)),
  );
  const result: PersonMemory[] = [];
  const retainedNames = new Set<string>();
  for (const [index, person] of uniqueEligible.slice(0, retentionTarget).entries()) {
    const naturalName = sanitizeName(person.name);
    const name = retainedNames.has(naturalName)
      ? nextAvailableName(FALLBACK_NAMES, retainedNames, index)
      : naturalName;
    result.push({ ...person, name });
    retainedNames.add(name);
  }
  const usedPersonIds = new Set(result.map(({ personId }) => personId));
  const usedNames = new Set(result.map(({ name }) => sanitizeName(name)));

  let attempts = 0;
  while (result.length < limit && attempts < limit * 20) {
    const index = result.length;
    const candidate =
      options.generateNew?.(index, usedPersonIds, usedNames) ??
      fallbackPerson(index, options.rng, usedPersonIds, usedNames);
    const normalizedCandidate = {
      ...candidate,
      name: sanitizeName(candidate.name),
    };
    attempts += 1;
    if (usedPersonIds.has(normalizedCandidate.personId)) continue;
    if (usedNames.has(normalizedCandidate.name)) continue;
    result.push(normalizedCandidate);
    usedPersonIds.add(normalizedCandidate.personId);
    usedNames.add(normalizedCandidate.name);
  }

  if (result.length < limit) {
    throw new Error('无法生成不重复的职业阵容人物');
  }
  return result;
};

export const inheritRelationship = (
  previous: readonly PersonMemory[],
  rng: SeededRandomSource,
  samePosition: boolean,
): RosterRelationship => {
  if (previous.length === 0) return samePosition ? 'rivalry' : 'teammate';
  const friendshipRate =
    previous.filter(({ relationshipToPlayer }) => relationshipToPlayer === 'friendship').length /
    previous.length;
  const rivalryRate =
    previous.filter(({ relationshipToPlayer }) => relationshipToPlayer === 'rivalry').length /
    previous.length;
  const boostedRivalryRate = Math.min(0.7, rivalryRate + (samePosition ? 0.2 : 0));
  const roll = rng.next();
  if (roll < friendshipRate) return 'friendship';
  if (roll < friendshipRate + boostedRivalryRate) return 'rivalry';
  return 'teammate';
};

export const toPersonMemory = (member: ProSquadMember): PersonMemory => {
  const memory: PersonMemory = {
    personId: member.personId,
    name: member.name,
    age: member.age,
    primaryPosition: member.primaryPosition as Position,
    currentAbility: member.currentAbility,
    form: member.form,
    fitness: member.fitness,
    minutesPlayed: member.minutesPlayed,
  };
  if (member.traits) memory.traits = member.traits;
  if (member.relationshipToPlayer) memory.relationshipToPlayer = member.relationshipToPlayer;
  return memory;
};
