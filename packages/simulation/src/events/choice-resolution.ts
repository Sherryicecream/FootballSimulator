import type {
  CareerSaveV2Like,
  ChoiceOutcomeKind,
  ChoiceOutcomeSummary,
  ChoiceResolutionAttribute,
  ChoiceResolutionOutcome,
  EventChoice,
} from '@football/contracts';
import { createSeededRandomSource } from '../randomness';

export interface ResolveChoiceOutcomeInput {
  save: CareerSaveV2Like;
  choice: EventChoice;
  eventId: string;
  seed: number;
}

export interface ChoiceOutcomeResolution {
  outcome: ChoiceOutcomeKind;
  effects: Record<string, number>;
  delayEffects?: Record<string, number>;
  memoryKey?: string;
  response?: string;
  responses?: ChoiceResolutionOutcome['responses'];
  followUp?: string;
  nextEventIds?: string[];
  narrativeVariants?: ChoiceResolutionOutcome['narrativeVariants'];
  summary: ChoiceOutcomeSummary | null;
  score: number | null;
  target: number | null;
  attribute: ChoiceResolutionAttribute | null;
  attributeValue: number | null;
  stateModifier: number;
  variance: number;
  reason: string;
}

const STATE_VALUES = {
  morale: (save: CareerSaveV2Like) => save.currentState.morale,
  form: (save: CareerSaveV2Like) => save.currentState.form,
  confidence: (save: CareerSaveV2Like) => save.currentState.confidence,
  fitness: (save: CareerSaveV2Like) => save.health.fitness,
  fatigue: (save: CareerSaveV2Like) => save.health.fatigue,
  coachTrust: (save: CareerSaveV2Like) => save.clubContext.coachEvaluation,
} as const;

const ATTRIBUTE_LABELS: Record<ChoiceResolutionAttribute, string> = {
  firstTouch: '停球',
  dribbling: '盘带',
  passing: '传球',
  shooting: '射门',
  defending: '防守',
  aerialAbility: '空中能力',
  pace: '速度',
  strength: '力量',
  stamina: '耐力',
  agility: '灵活',
  offTheBall: '跑位',
  vision: '视野',
  decision: '决策',
  composure: '镇定',
  determination: '意志',
  discipline: '纪律',
};

export const resolveChoiceOutcome = ({
  save,
  choice,
  eventId,
  seed,
}: ResolveChoiceOutcomeInput): ChoiceOutcomeResolution => {
  const resolution = choice.resolution;
  if (!resolution) return legacyResult(choice);

  const attributeValue = readAttribute(save, resolution.attribute);
  const stateModifier = calculateStateModifier(save, resolution.stateModifiers);
  const variance = createSeededRandomSource(hashSeed(seed, eventId, choice.id)).nextInt(
    -resolution.volatility,
    resolution.volatility,
  );
  const score = clamp(attributeValue + stateModifier + variance, 0, 120);
  const outcome = outcomeForScore(score, resolution.difficulty);
  const selected = resolution.outcomes[outcome];
  const summary: ChoiceOutcomeSummary = {
    outcome,
    label: selected.label,
    attribute: resolution.attribute,
    attributeValue,
    score,
    target: resolution.difficulty,
    stateModifier,
    variance,
    reason: buildReason(resolution.attribute, attributeValue, stateModifier, variance, score, resolution.difficulty),
  };

  return {
    ...selected,
    outcome,
    effects: { ...selected.effects },
    ...(selected.delayEffects ? { delayEffects: { ...selected.delayEffects } } : {}),
    summary,
    score,
    target: resolution.difficulty,
    attribute: resolution.attribute,
    attributeValue,
    stateModifier,
    variance,
    reason: summary.reason,
  };
};

const legacyResult = (choice: EventChoice): ChoiceOutcomeResolution => ({
  ...choice,
  outcome: 'legacy',
  effects: { ...choice.effects },
  ...(choice.delayEffects ? { delayEffects: { ...choice.delayEffects } } : {}),
  summary: null,
  score: null,
  target: null,
  attribute: null,
  attributeValue: null,
  stateModifier: 0,
  variance: 0,
  reason: '该事件沿用原有结算方式。',
});

const readAttribute = (save: CareerSaveV2Like, attribute: ChoiceResolutionAttribute): number => {
  const groups = Object.values(save.player.attributes) as Array<Record<string, number>>;
  const value = groups.find((group) => attribute in group)?.[attribute];
  if (value === undefined) throw new Error(`无法读取选择判定能力：${attribute}`);
  return value;
};

const calculateStateModifier = (
  save: CareerSaveV2Like,
  modifiers: Partial<Record<keyof typeof STATE_VALUES, number>> | undefined,
): number => {
  const total = Object.entries(modifiers ?? {}).reduce((sum, [key, weight]) => {
    const read = STATE_VALUES[key as keyof typeof STATE_VALUES];
    return read ? sum + (read(save) - 50) * weight! : sum;
  }, 0);
  return clamp(Math.round(total), -20, 20);
};

const outcomeForScore = (score: number, difficulty: number): Exclude<ChoiceOutcomeKind, 'legacy'> => {
  if (score >= difficulty + 8) return 'success';
  if (score >= difficulty - 8) return 'partial';
  return 'failure';
};

const buildReason = (
  attribute: ChoiceResolutionAttribute,
  attributeValue: number,
  stateModifier: number,
  variance: number,
  score: number,
  target: number,
): string =>
  `${ATTRIBUTE_LABELS[attribute]} ${attributeValue}，状态修正 ${signed(stateModifier)}，临场波动 ${signed(variance)}；综合 ${score}，判定难度 ${target}。`;

const signed = (value: number): string => (value > 0 ? `+${value}` : String(value));

const hashSeed = (seed: number, eventId: string, choiceId: string): number => {
  let hash = (2166136261 ^ seed) >>> 0;
  for (const character of `${eventId}:${choiceId}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash | 0;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
