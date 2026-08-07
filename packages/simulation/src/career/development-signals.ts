import type { CareerSaveV2 } from '@football/contracts';

export type DevelopmentSignal =
  | 'rapid-development'
  | 'first-team-radar'
  | 'steady-progress'
  | 'stalled-development'
  | 'overtraining-risk'
  | 'injury-setback'
  | 'competition-pressure'
  | 'release-risk';

export const deriveDevelopmentSignals = (save: CareerSaveV2): DevelopmentSignal[] => {
  const signals: DevelopmentSignal[] = [];
  const recentFacts = save.ledger.slice(-8);
  const negativeFacts = recentFacts.filter(({ summary }) =>
    /不佳|下降|缺席|受伤|停滞/.test(summary),
  ).length;
  const positiveSettlements = recentFacts.filter(
    ({ type, summary }) => type === 'monthly-settlement' && summary.includes('→'),
  ).length;

  if (positiveSettlements >= 2 && save.currentState.form >= 65) signals.push('rapid-development');
  if (save.clubContext.firstTeamStage !== 'none' || save.clubContext.coachEvaluation >= 75) {
    signals.push('first-team-radar');
  }
  if (save.health.fatigue >= 70 || save.health.recentLoad >= 80) signals.push('overtraining-risk');
  if (save.health.activeInjury && ['moderate', 'severe'].includes(save.health.activeInjury.kind)) {
    signals.push('injury-setback');
  }
  const hasRival = save.relationships.activeRelations.some(
    ({ relationType }) => relationType === 'rival',
  );
  if (hasRival && save.clubContext.coachEvaluation < 55) signals.push('competition-pressure');
  const stalled = save.currentState.form < 40 && negativeFacts >= 3;
  if (stalled) signals.push('stalled-development');
  if (
    stalled &&
    save.currentState.confidence < 35 &&
    save.clubContext.coachEvaluation < 30 &&
    negativeFacts >= 4
  ) {
    signals.push('release-risk');
  }
  if (signals.length === 0 && save.currentState.form >= 45 && save.health.fatigue < 65) {
    signals.push('steady-progress');
  }
  return signals;
};
