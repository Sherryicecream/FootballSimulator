import type { CareerSaveV4Like, YouthAcademyProfile } from '@football/contracts';
import { SceneBanner } from '../design-system/SceneBanner';
import type { YouthSeasonOutcome } from '@football/application';

interface OffseasonBriefingProps {
  save: CareerSaveV4Like;
  outcome: YouthSeasonOutcome | null;
  academies: readonly YouthAcademyProfile[];
  canContinueYouth: boolean;
  onStartNextSeason?: (academyId?: string) => void;
  onSeekOffers?: () => void;
}

/** 补救路线 → 青训机构 pathway 的映射。 */
const pathwayByNextPath: Record<string, YouthAcademyProfile['pathway']> = {
  'school-football': 'school-elite',
  'lower-tier-academy': 'local-academy',
  trial: 'relocation-academy',
};

const signalLabels: Record<string, string> = {
  'rapid-development': '快速发展',
  'first-team-radar': '一线队关注',
  'steady-progress': '稳定成长',
  'stalled-development': '发展停滞',
  'overtraining-risk': '过度训练风险',
  'injury-setback': '伤病受挫',
  'competition-pressure': '竞争压力',
  'release-risk': '被放弃风险',
};

export function OffseasonBriefing({
  save,
  outcome,
  academies,
  canContinueYouth,
  onStartNextSeason,
  onSeekOffers,
}: OffseasonBriefingProps) {
  const state = save.offseason;
  if (!state) return null;
  const { briefing, graduationEligible, eligibilityReport } = state;
  const released = outcome?.status === 'released';
  const candidates =
    released && outcome
      ? academies.filter(({ pathway }) => pathway === pathwayByNextPath[outcome.nextPath])
      : [];

  return (
    <section className="offseason" aria-label="休赛期简报">
      <SceneBanner
        kind="locker-room"
        eyebrow="青训生涯 · 赛季结算"
        title="休赛期简报"
        detail="赛季哨声已经结束，身体、声望和下一条路都在这里重新排位。"
      />
      <ul className="offseason-list">
        <li>{briefing.healthClearance}</li>
        <li>
          年龄：{briefing.ageUpdate.from} → {briefing.ageUpdate.to} 岁
        </li>
        <li>
          声望变化：
          {briefing.reputationChange >= 0 ? '+' : ''}
          {briefing.reputationChange}
        </li>
        {briefing.attributeDrift.map((change) => (
          <li key={change.attribute}>
            休赛期沉淀：{change.attribute} {change.oldValue} → {change.newValue}
          </li>
        ))}
        {outcome?.signals.map((signal) => (
          <li key={signal}>赛季信号：{signalLabels[signal] ?? signal}</li>
        ))}
      </ul>

      <h3>毕业资格评估</h3>
      <ul className="eligibility-list">
        {eligibilityReport.map(({ criterion, met }) => (
          <li key={criterion} className={met ? 'met' : 'unmet'}>
            {criterion}：{met ? '达标' : '未达标'}
          </li>
        ))}
      </ul>
      {graduationEligible && (
        <p className="graduation-hint">
          {canContinueYouth
            ? '你已获得职业合同谈判资格，可以寻找经纪人寻求签约，也可以留在青训继续磨练。'
            : '青训年龄窗口已关闭，你已获得职业合同谈判资格，下一步将进入职业市场。'}
        </p>
      )}

      {released && canContinueYouth ? (
        candidates.length > 0 && (
          <div className="offseason-actions">
            <p>俱乐部结束了本阶段培养，请选择补救路线：</p>
            {candidates.map((academy) => (
              <button
                key={academy.id}
                onClick={() => onStartNextSeason?.(academy.id)}
                disabled={!onStartNextSeason}
              >
                加入{academy.name}
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="offseason-actions">
          {graduationEligible && onSeekOffers && (
            <button onClick={onSeekOffers}>寻找经纪人报价</button>
          )}
          {canContinueYouth && onStartNextSeason && (
            <button onClick={() => onStartNextSeason()}>开始下赛季</button>
          )}
          {!canContinueYouth && (
            <p className="warning">本赛季已是青训阶段的最后窗口，请先处理职业市场机会。</p>
          )}
        </div>
      )}
    </section>
  );
}
