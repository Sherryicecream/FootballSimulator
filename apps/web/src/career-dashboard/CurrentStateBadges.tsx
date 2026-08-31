import type { StatusBadgeTone } from '../design-system/StatusBadge';
import { StatusBadge } from '../design-system/StatusBadge';
import { statusToneForScore } from './career-presentation';

export interface CurrentStateSnapshot {
  fitness: number;
  fatigue: number;
  morale: number;
  form: number;
  coachEvaluation: number;
}

interface CurrentStateBadgesProps extends CurrentStateSnapshot {
  injuryWeeks?: number | undefined;
}

const stateBadge = (
  glyph: 'fitness' | 'fatigue' | 'morale' | 'form' | 'coach-trust',
  label: string,
  value: number,
  tone: StatusBadgeTone,
) => <StatusBadge glyph={glyph} label={label} value={value} tone={tone} />;

export const CurrentStateBadges = ({
  fitness,
  fatigue,
  morale,
  form,
  coachEvaluation,
  injuryWeeks,
}: CurrentStateBadgesProps) => (
  <div className="state-badges" aria-label="当前状态指标">
    {stateBadge('fitness', '体能', fitness, statusToneForScore(fitness))}
    {stateBadge('fatigue', '疲劳', fatigue, statusToneForScore(fatigue, true))}
    {stateBadge('morale', '士气', morale, statusToneForScore(morale))}
    {stateBadge('form', '状态', form, statusToneForScore(form))}
    {stateBadge('coach-trust', '教练评价', coachEvaluation, statusToneForScore(coachEvaluation))}
    {injuryWeeks !== undefined && (
      <StatusBadge glyph="warning" label="伤病" value={`${injuryWeeks}周`} tone="danger" />
    )}
  </div>
);
