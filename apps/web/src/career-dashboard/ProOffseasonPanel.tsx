import type { CareerSaveV4Like } from '@football/contracts';
import type { PromiseReview } from '@football/contracts';

interface ProOffseasonPanelProps {
  save: CareerSaveV4Like;
  onStartNextSeason: () => void;
  onAcceptRenewal: () => void;
  onDeclineRenewal: () => void;
}

const causeLabels: Record<PromiseReview['cause'], string> = {
  none: '',
  injury: '伤病原因',
  club: '俱乐部原因',
  player: '状态原因',
};

/** 职业休赛期：承诺对照报告 + 续约/下赛季选择。 */
export function ProOffseasonPanel({
  save,
  onStartNextSeason,
  onAcceptRenewal,
  onDeclineRenewal,
}: ProOffseasonPanelProps) {
  const lastReview = save.promiseReviews.at(-1);
  const renewalOffer = save.pendingOffers[0] ?? null;
  const stats = save.proSeasonStats;
  const playedLeague =
    save.proSeason?.fixtures.filter(({ status }) => status === 'played').length ?? 0;

  return (
    <section className="offseason" aria-label="职业休赛期">
      <h2>职业赛季总结</h2>
      <ul className="offseason-list">
        <li>
          联赛出场 {stats.leagueAppearances} 次，预备队出场 {stats.reserveAppearances} 次，共{' '}
          {stats.minutes} 分钟。
        </li>
        <li>
          进球 {stats.goals} 个，助攻 {stats.assists} 次
          {stats.ratingCount > 0
            ? `，场均评分 ${Math.round((stats.ratingSum / stats.ratingCount) * 10) / 10}。`
            : '。'}
        </li>
        <li>本赛季联赛已赛 {playedLeague} 场。</li>
      </ul>

      {lastReview && (
        <div className={lastReview.status === 'kept' ? 'promise kept' : 'promise broken'}>
          <h3>合同承诺对照：{lastReview.status === 'kept' ? '已兑现' : '未兑现'}</h3>
          <p>
            出场份额 {Math.round(lastReview.share * 100)}%（承诺{' '}
            {Math.round(lastReview.promisedShare * 100)}%）
            {lastReview.cause !== 'none' ? `，归因：${causeLabels[lastReview.cause]}` : ''}。
          </p>
        </div>
      )}

      {renewalOffer ? (
        <div className="sign-confirm" role="alertdialog" aria-label="续约确认">
          <h3>合同到期</h3>
          <p>
            {renewalOffer.clubName} 提供为期 {renewalOffer.contractYears} 年的续约合同：年薪{' '}
            {renewalOffer.salaryPerYear.toLocaleString('zh-CN')}，角色{' '}
            {ROLE_LABELS[renewalOffer.squadRole]}。
          </p>
          <button className="confirm" onClick={onAcceptRenewal}>
            接受续约
          </button>
          <button onClick={onDeclineRenewal}>拒绝续约，成为自由球员</button>
        </div>
      ) : (
        <div className="offseason-actions">
          <button onClick={onStartNextSeason}>开始下个职业赛季</button>
        </div>
      )}
    </section>
  );
}

const ROLE_LABELS: Record<string, string> = {
  'youth-team': '青训队注册',
  rotation: '轮换球员',
  'first-team-rotation': '一线队轮换',
  'highlighted-prospect': '重点培养新星',
};
