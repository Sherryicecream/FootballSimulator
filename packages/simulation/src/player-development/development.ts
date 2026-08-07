import type {
  AttributeChange,
  HealthState,
  PlayerCareerV2,
  TrainingPlan,
} from '@football/contracts';

export type AttributeKey =
  | keyof PlayerCareerV2['attributes']['technical']
  | keyof PlayerCareerV2['attributes']['physical']
  | keyof PlayerCareerV2['attributes']['mental'];

export type DevelopmentAccrual = Partial<Record<AttributeKey, number>>;

const technicalKeys: AttributeKey[] = [
  'firstTouch',
  'dribbling',
  'passing',
  'shooting',
  'defending',
  'aerialAbility',
];
const physicalKeys: AttributeKey[] = ['pace', 'strength', 'stamina', 'agility'];
const mentalKeys: AttributeKey[] = [
  'offTheBall',
  'vision',
  'decision',
  'composure',
  'determination',
  'discipline',
];
const allKeys = [...technicalKeys, ...physicalKeys, ...mentalKeys];

export const accrueWeeklyDevelopment = (
  player: PlayerCareerV2,
  plan: TrainingPlan,
  health: HealthState,
  playedMinutes: number,
): DevelopmentAccrual => {
  if (health.activeInjury?.kind === 'severe') {
    return {};
  }

  const intensity = { light: 0.65, normal: 1, intense: 1.35 }[plan.intensity];
  const professionalism = 0.7 + player.development.professionalism / 170;
  const maturation = { early: 1.15, normal: 1, late: 0.88 }[player.development.maturationPace];
  const healthFactor = Math.max(0.2, (health.fitness - health.fatigue * 0.45) / 100);
  const matchFactor = 1 + Math.min(90, playedMinutes) / 600;
  const base = 0.22 * intensity * professionalism * maturation * healthFactor * matchFactor;
  const focusedKeys = keysForPlan(plan);

  return Object.fromEntries(
    allKeys.map((key) => [key, base * (focusedKeys.has(key) ? 2.2 : 0.35)]),
  );
};

export const settleMonthlyDevelopment = (
  player: PlayerCareerV2,
  accrual: DevelopmentAccrual,
): {
  player: PlayerCareerV2;
  attributeChanges: AttributeChange[];
  remainingAccrual: DevelopmentAccrual;
} => {
  let nextPlayer = player;
  const attributeChanges: AttributeChange[] = [];
  const remainingAccrual: DevelopmentAccrual = {};

  for (const [attribute, progress] of Object.entries(accrual) as [AttributeKey, number][]) {
    const oldValue = readAttribute(nextPlayer, attribute);
    const potential = readPotential(nextPlayer, attribute);
    const newValue = Math.min(potential, oldValue + Math.max(0, Math.floor(progress)));
    remainingAccrual[attribute] =
      newValue >= potential ? 0 : Math.max(0, progress - (newValue - oldValue));
    if (newValue === oldValue) {
      continue;
    }
    nextPlayer = writeAttribute(nextPlayer, attribute, newValue);
    attributeChanges.push({ attribute, oldValue, newValue });
  }

  return { player: nextPlayer, attributeChanges, remainingAccrual };
};

export const mergeDevelopmentAccrual = (
  current: DevelopmentAccrual,
  addition: DevelopmentAccrual,
): DevelopmentAccrual => {
  const merged = { ...current };
  for (const [key, value] of Object.entries(addition) as [AttributeKey, number][]) {
    merged[key] = (merged[key] ?? 0) + value;
  }
  return merged;
};

const keysForPlan = (plan: TrainingPlan): Set<AttributeKey> => {
  if (plan.focus === 'technical') return new Set(technicalKeys);
  if (plan.focus === 'physical') return new Set(physicalKeys);
  if (plan.focus === 'tactical') return new Set(mentalKeys);
  if (plan.focus === 'position') {
    return new Set(['defending', 'offTheBall', 'decision', 'composure']);
  }
  return new Set<AttributeKey>();
};

const readAttribute = (player: PlayerCareerV2, key: AttributeKey): number => {
  for (const group of Object.values(player.attributes)) {
    if (key in group) return group[key as keyof typeof group];
  }
  throw new Error(`未知球员属性：${key}`);
};

const readPotential = (player: PlayerCareerV2, key: AttributeKey): number => {
  for (const group of Object.values(player.development.attributePotential)) {
    if (key in group) return group[key as keyof typeof group];
  }
  throw new Error(`未知潜力属性：${key}`);
};

const writeAttribute = (
  player: PlayerCareerV2,
  key: AttributeKey,
  value: number,
): PlayerCareerV2 => {
  for (const groupName of ['technical', 'physical', 'mental'] as const) {
    const group = player.attributes[groupName];
    if (key in group) {
      return {
        ...player,
        attributes: {
          ...player.attributes,
          [groupName]: { ...group, [key]: value },
        },
      };
    }
  }
  return player;
};
