import { useState } from 'react';
import type {
  CareerSaveV4Like,
  PromiseReview,
  ProCupState,
  SeasonHonour,
} from '@football/contracts';
import { SceneBanner } from '../design-system/SceneBanner';
import type { FootballGlyphName } from '../design-system/FootballGlyph';
import { FootballGlyph } from '../design-system/FootballGlyph';
import { StatusBadge } from '../design-system/StatusBadge';

interface ProOffseasonPanelProps {
  save: CareerSaveV4Like;
  onStartNextSeason: () => void;
  onAcceptRenewal: () => void;
  onDeclineRenewal: () => void;
  onRetire: () => void;
}

const causeLabels: Record<PromiseReview['cause'], string> = {
  none: '',
  injury: '伤病原因',
  club: '俱乐部原因',
  player: '状态原因',
};
const CUP_ROUND_LABELS: Record<ProCupState['currentRound'], string> = {
  quarterfinal: '四分之一决赛',
  semifinal: '半决赛',
  final: '决赛',
  complete: '已结束',
};

const HONOUR_GLYPHS: Record<SeasonHonour['kind'], FootballGlyphName> = {
  'league-champion': 'match',
  'cup-champion': 'match',
  promotion: 'form',
  relegation: 'warning',
};

const tierMovementLabel = (currentTier: number | undefined, nextTier: number | null): string => {
  if (nextTier === null) return '赛季进行中';
  if (currentTier === undefined) return '下一季层级 ' + nextTier;
  if (nextTier > currentTier) return '升级';
  if (nextTier < currentTier) return '降级';
  return '层级保持';
};

const leagueRankFor = (save: CareerSaveV4Like): number | null => {
  const pro = save.proSeason;
  if (!pro) return null;
  const sorted = [...pro.standings].sort(
    (left, right) =>
      right.points - left.points ||
      right.goalsFor - right.goalsAgainst - (left.goalsFor - left.goalsAgainst) ||
      right.goalsFor - left.goalsFor ||
      left.clubId.localeCompare(right.clubId),
  );
  const index = sorted.findIndex(({ clubId }) => clubId === pro.clubId);
  return index >= 0 ? index + 1 : null;
};

/** 职业休赛期：承诺对照报告 + 续约/下赛季选择。 */
export function ProOffseasonPanel({
  save,
  onStartNextSeason,
  onAcceptRenewal,
  onDeclineRenewal,
  onRetire,
}: ProOffseasonPanelProps) {
  const [retireConfirm, setRetireConfirm] = useState(false);
  const lastReview = save.promiseReviews.at(-1);
  const renewalOffer = save.pendingOffers[0] ?? null;
  const stats = save.proSeasonStats;
  const playedLeague =
    save.proSeason?.fixtures.filter(({ status }) => status === 'played').length ?? 0;
  const leagueRank = leagueRankFor(save);
  const cup = save.proSeason?.domesticCup;
  const cupFixtures = cup?.fixtures ?? [];
  const playedCup = cupFixtures.filter(({ status }) => status === 'played').length;
  const cupRound = cup ? CUP_ROUND_LABELS[cup.currentRound] : '暂无杯赛记录';
  const tierMovement = tierMovementLabel(
    save.contract?.clubTier,
    save.proSeason?.nextClubTier ?? null,
  );
  const honours = save.seasonHistory.at(-1)?.honours ?? [];

  return (
    <section className="offseason" aria-label="职业休赛期">
      <SceneBanner
        kind="locker-room"
        eyebrow="职业生涯 · 赛季结算"
        title="职业赛季总结"
        detail="更衣室的灯还亮着：回看这一年的出场、承诺与下一步选择。"
      />
      <div className="offseason-overview">
        <section className="season-briefing" aria-label="球队赛季">
          <div className="season-briefing-heading">
            <FootballGlyph name="match" size={20} />
            <div>
              <span className="card-kicker">球队战绩</span>
              <h3>球队赛季</h3>
            </div>
          </div>
          <div className="season-briefing-grid">
            <div>
              <span>联赛排名</span>
              <strong>{leagueRank ? '联赛第 ' + leagueRank + ' 名' : '暂无排名'}</strong>
            </div>
            <div>
              <span>国内杯</span>
              <strong>{cupRound}</strong>
              <small>
                {cup
                  ? '已赛 ' + playedCup + '/' + cupFixtures.length + ' 场'
                  : '本赛季暂无杯赛记录'}
              </small>
            </div>
            <div>
              <span>层级变化</span>
              <strong>{tierMovement}</strong>
              <small>
                {save.proSeason?.nextClubTier === null || !save.proSeason
                  ? '赛季结算后更新'
                  : '下一赛季层级 ' + save.proSeason.nextClubTier}
              </small>
            </div>
          </div>
        </section>
        <section className="honours-card" aria-label="本赛季荣誉">
          <div className="season-briefing-heading">
            <FootballGlyph name="form" size={20} />
            <div>
              <span className="card-kicker">赛季里程碑</span>
              <h3>本赛季荣誉</h3>
            </div>
          </div>
          {honours.length > 0 ? (
            <ul className="honours-list">
              {honours.map((honour) => (
                <li className="honour-item" key={honour.id}>
                  <FootballGlyph name={HONOUR_GLYPHS[honour.kind]} size={18} />
                  <span>{honour.label}</span>
                  <small>{honour.seasonId}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="honours-empty">本赛季暂无荣誉</p>
          )}
        </section>
      </div>
      <ul className="offseason-list">
        <li>
          联赛出场 {stats.leagueAppearances} 次，预备队出场 {stats.reserveAppearances} 次，联赛分钟{' '}
          {stats.minutes} 分钟；杯赛出场 {stats.cupAppearances ?? 0} 次，杯赛分钟{' '}
          {stats.cupMinutes ?? 0} 分钟。
        </li>
        <li>
          联赛进球 {stats.goals} 个，助攻 {stats.assists} 次；杯赛进球 {stats.cupGoals ?? 0}{' '}
          个，助攻 {stats.cupAssists ?? 0} 次
          {stats.ratingCount > 0
            ? `，场均评分 ${Math.round((stats.ratingSum / stats.ratingCount) * 10) / 10}。`
            : '。'}
        </li>
        <li>
          本赛季联赛已赛 {playedLeague} 场；国内杯{' '}
          {cup ? '已赛 ' + playedCup + '/' + cupFixtures.length + ' 场' : '本赛季暂无杯赛记录'}。
        </li>
      </ul>

      {lastReview && (
        <div className={lastReview.status === 'kept' ? 'promise kept' : 'promise broken'}>
          <h3>
            合同承诺对照：{lastReview.status === 'kept' ? '已兑现' : '未兑现'}{' '}
            <StatusBadge
              glyph={lastReview.status === 'kept' ? 'coach-trust' : 'warning'}
              label="承诺状态"
              value={lastReview.status === 'kept' ? '已兑现' : '未兑现'}
              tone={lastReview.status === 'kept' ? 'positive' : 'danger'}
            />
          </h3>
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

      {save.player.age >= 30 && (
        <div className="retire-block">
          {retireConfirm ? (
            <>
              <p>退役是不可逆的决定。确定要结束球员生涯吗？</p>
              <button className="confirm" onClick={onRetire}>
                确认退役
              </button>
              <button onClick={() => setRetireConfirm(false)}>再踢一年</button>
            </>
          ) : (
            <button className="secondary-action" onClick={() => setRetireConfirm(true)}>
              宣布退役
            </button>
          )}
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
