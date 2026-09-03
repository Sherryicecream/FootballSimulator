import type {
  AttributeChange,
  CareerLedgerEntryV2,
  HealthState,
  TrainingFeedback,
  TrainingPlan,
} from '@football/contracts';

export interface TrainingFeedbackInput {
  plan: TrainingPlan;
  facts: readonly CareerLedgerEntryV2[];
  startHealth: HealthState;
  endHealth: HealthState;
  attributeChanges: readonly AttributeChange[];
}

/**
 * 将已经发生的周事实汇总为月度训练反馈。
 * 该函数只读取输入，不推进随机源，也不修改比赛、成长或健康结果。
 */
export const buildTrainingFeedback = ({
  plan,
  facts,
  startHealth,
  endHealth,
  attributeChanges,
}: TrainingFeedbackInput): TrainingFeedback | null => {
  const trainingFacts = facts.filter(
    (fact) => fact.type === 'training' && fact.trainingContext !== undefined,
  );
  const allTrainingFacts = facts.filter(({ type }) => type === 'training');
  if (trainingFacts.length === 0 || trainingFacts.length !== allTrainingFacts.length) return null;

  const contexts = trainingFacts.map(({ trainingContext }) => trainingContext!);
  const totalTrainingLoad = roundOneDecimal(
    contexts.reduce((sum, { trainingLoad }) => sum + trainingLoad, 0),
  );
  const averageTrainingLoad = roundOneDecimal(totalTrainingLoad / contexts.length);
  const totalLoad = roundOneDecimal(
    contexts.reduce((sum, { totalLoad: load }) => sum + load, 0),
  );
  const matchContexts = facts
    .filter(({ type }) => type === 'match' || type === 'pro-match')
    .map(({ matchContext }) => matchContext)
    .filter((context): context is NonNullable<typeof context> => context !== undefined);
  const playedMatches = matchContexts.filter(({ played }) => played);
  const ratedMatches = playedMatches.filter(({ rating }) => rating !== null);
  const averageRating = ratedMatches.length
    ? roundOneDecimal(
        ratedMatches.reduce((sum, { rating }) => sum + (rating ?? 0), 0) / ratedMatches.length,
      )
    : null;
  const healthResult = buildHealthResult(startHealth, endHealth);
  const matchStatus = matchStatusFor(
    playedMatches.length,
    averageRating,
    endHealth,
    healthResult.status,
  );

  return {
    plan,
    trainingWeeks: trainingFacts.length,
    totalTrainingLoad,
    averageTrainingLoad,
    totalLoad,
    fitness: stateDelta(startHealth.fitness, endHealth.fitness),
    fatigue: stateDelta(startHealth.fatigue, endHealth.fatigue),
    attributeChanges: [...attributeChanges],
    health: healthResult,
    matches: {
      appearances: playedMatches.length,
      minutes: matchContexts.reduce((sum, { minutesPlayed }) => sum + minutesPlayed, 0),
      averageRating,
      status: matchStatus,
    },
    conclusion: conclusionFor(plan, matchStatus, healthResult.status, attributeChanges.length),
    nextStep: nextStepFor(plan, matchStatus, healthResult.status),
  };
};

const roundOneDecimal = (value: number): number => Math.round(value * 10) / 10;

const stateDelta = (before: number, after: number) => ({
  before,
  after,
  delta: after - before,
});

const buildHealthResult = (start: HealthState, end: HealthState) => {
  const injury = end.activeInjury ?? start.activeInjury;
  const status = end.activeInjury ? 'active' : start.activeInjury ? 'recovered' : 'none';
  return {
    status: status as 'none' | 'active' | 'recovered',
    bodyArea: injury?.bodyArea ?? null,
    expectedRecoveryWeeks: injury?.expectedRecoveryWeeks ?? null,
  };
};

const matchStatusFor = (
  appearances: number,
  averageRating: number | null,
  health: HealthState,
  healthStatus: 'none' | 'active' | 'recovered',
): TrainingFeedback['matches']['status'] => {
  if (healthStatus === 'active' && appearances === 0) return 'injury-limited';
  if (appearances === 0) return 'no-appearance';
  if (healthStatus === 'active') return 'injury-limited';
  if (health.fatigue >= 60) return 'fatigue-limited';
  if (averageRating !== null && averageRating >= 7) return 'positive';
  return 'steady';
};

const focusLabel = (focus: TrainingPlan['focus']): string =>
  ({
    technical: '技术',
    position: '位置专项',
    physical: '身体',
    tactical: '战术',
    recovery: '恢复',
  })[focus];

const conclusionFor = (
  plan: TrainingPlan,
  matchStatus: TrainingFeedback['matches']['status'],
  healthStatus: 'none' | 'active' | 'recovered',
  attributeChangeCount: number,
): string => {
  const focus = focusLabel(plan.focus);
  if (healthStatus === 'active') return `本月${focus}训练期间伤病限制了比赛参与。`;
  if (matchStatus === 'fatigue-limited') return `本月${focus}训练负荷较高，疲劳已经影响比赛表现。`;
  if (matchStatus === 'positive') return `本月${focus}训练按计划执行，比赛表现出现积极信号。`;
  if (matchStatus === 'no-appearance') return `本月${focus}训练完成，但暂时没有足够的出场样本。`;
  if (healthStatus === 'recovered') return `本月${focus}训练伴随伤病恢复，成长结算包含 ${attributeChangeCount} 项变化。`;
  return `本月${focus}训练按计划完成，比赛与成长结果保持稳定。`;
};

const nextStepFor = (
  plan: TrainingPlan,
  matchStatus: TrainingFeedback['matches']['status'],
  healthStatus: 'none' | 'active' | 'recovered',
): string => {
  if (healthStatus === 'active' || matchStatus === 'injury-limited') return '优先完成恢复，再逐步恢复训练和比赛负荷。';
  if (matchStatus === 'fatigue-limited') return '下月先降低负荷，等疲劳回落后再追求更高训练量。';
  if (matchStatus === 'no-appearance') return `保持${focusLabel(plan.focus)}重点，等待更多比赛样本验证效果。`;
  if (matchStatus === 'positive') return `继续${focusLabel(plan.focus)}重点，同时安排常规恢复。`;
  return `继续${focusLabel(plan.focus)}重点，关注下一月的身体状态与出场机会。`;
};
