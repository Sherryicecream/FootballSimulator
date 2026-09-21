import type { CareerSaveV5Like, TrainingPlan, WorldNewsItem } from '@football/contracts';
import { labelAttribute } from './career-presentation';
import { pickLeadBeat, sceneKindForBeat } from './career-presentation';
import { ContractCard } from './ContractCard';
import type { MonthlyReport } from '@football/contracts';
import { MonthlyMomentumPanel } from './MonthlyMomentumPanel';
import { SceneBanner } from '../design-system/SceneBanner';
import { CurrentStateBadges } from './CurrentStateBadges';
import { StoryProgressPanel } from './StoryProgressPanel';
import { MatchdayRhythmPanel } from './MatchdayRhythmPanel';
import { TrainingFeedbackPanel } from './TrainingFeedbackPanel';
import { TrainingPlanEditor } from './TrainingPlanEditor';
import { WorldFootballPanel } from './WorldFootballPanel';
import { CareerActionBar } from './CareerActionBar';
import { NodeBrief } from './NodeBrief';
import { FootballGlyph } from '../design-system/FootballGlyph';
import { countClubFixtures } from '@football/application';
import { allClubProfiles, overseasClubs, youthClubs } from '@football/content';
import type { ProCupState } from '@football/contracts';
import {
  contractClubName,
  professionalClubName,
  professionalLeagueRank,
  sortProfessionalStandings,
} from './pro-presentation';

interface ProDashboardProps {
  save: CareerSaveV5Like;
  report: MonthlyReport | null;
  advancing: boolean;
  busy?: boolean;
  onAdvance?: () => void;
  onAdvanceToNode?: () => void;
  onAdvanceOneMonth?: () => void;
  onOpenArchives: () => void;
  onTrainingPlanChange?: (plan: TrainingPlan) => void;
  worldNewsItems?: readonly WorldNewsItem[];
}

const POSITION_LABELS: Record<string, string> = {
  CENTER_BACK: '中后卫',
  FULL_BACK: '边后卫',
  DEFENSIVE_MIDFIELDER: '后腰',
  MIDFIELDER: '中场',
  WINGER: '边锋',
  FORWARD: '前锋',
};

const ROLE_LABELS: Record<string, string> = {
  'youth-team': '青训队注册',
  rotation: '轮换球员',
  'first-team-rotation': '一线队轮换',
  'highlighted-prospect': '重点培养新星',
};
const CUP_ROUND_LABELS: Record<ProCupState['currentRound'], string> = {
  quarterfinal: '四分之一决赛',
  semifinal: '半决赛',
  final: '决赛',
  complete: '已结束',
};

const tierMovementLabel = (currentTier: number | undefined, nextTier: number | null): string => {
  if (nextTier === null) return '赛季进行中';
  if (currentTier === undefined) return '下一季实力档位 ' + nextTier;
  if (nextTier > currentTier) return '升级';
  if (nextTier < currentTier) return '降级';
  return '实力档位保持';
};

export function ProDashboard({
  save,
  report,
  advancing,
  busy = false,
  onAdvance,
  onAdvanceToNode,
  onAdvanceOneMonth,
  onOpenArchives,
  onTrainingPlanChange = () => undefined,
  worldNewsItems = [],
}: ProDashboardProps) {
  const pro = save.proSeason;
  if (!pro) return null;
  const standings = sortProfessionalStandings(pro.standings);
  const position = save.player.identity.primaryPosition;
  const depthList = pro.depthChart[position] ?? [];
  const stats = save.proSeasonStats;
  const avgRating =
    stats.ratingCount > 0 ? Math.round((stats.ratingSum / stats.ratingCount) * 10) / 10 : null;
  const playerRank = professionalLeagueRank(standings, pro.clubId) ?? 0;
  const cup = pro.domesticCup;
  const cupFixtures = cup?.fixtures ?? [];
  const cupPlayed = cupFixtures.filter(({ status }) => status === 'played').length;
  const cupClubPlayed = cup ? countClubFixtures(cupFixtures, pro.clubId) : 0;
  const cupProgress = cup
    ? cupPlayed === 0
      ? '尚未开赛'
      : '赛事总进度：已完成 ' + cupPlayed + '/' + cupFixtures.length + ' 场'
    : '本赛季暂无杯赛记录';
  const cupRound = cup ? CUP_ROUND_LABELS[cup.currentRound] : '暂无杯赛记录';
  const currentSeasonPrefix = pro.startDate.slice(0, 4) + '-';
  const recentCupFact = [...save.ledger]
    .reverse()
    .find(
      ({ type, matchContext, weekKey }) =>
        type === 'pro-match' &&
        weekKey.startsWith(currentSeasonPrefix) &&
        matchContext?.competitionId === 'domestic-cup',
    );
  const cupRecent =
    recentCupFact?.summary ??
    (cup
      ? cupPlayed === 0
        ? '最近杯赛：国内杯尚未开赛；本队已赛 0 场，当前轮次为' + cupRound
        : '最近杯赛：国内杯赛事总进度：已完成 ' +
          cupPlayed +
          '/' +
          cupFixtures.length +
          ' 场；本队已赛 ' +
          cupClubPlayed +
          ' 场，当前轮次为' +
          cupRound
      : '最近杯赛：本赛季暂无杯赛记录');
  const tierMovement = tierMovementLabel(
    save.activeLoan?.loanClubTier ?? save.contract?.clubTier,
    pro.nextClubTier,
  );
  const actualClubName = professionalClubName(save);
  const parentClubName = contractClubName(save);
  const leadBeat = pickLeadBeat(report?.momentum?.beats ?? []);
  const sceneKind = leadBeat ? sceneKindForBeat(leadBeat.kind) : 'neutral';
  const sceneTitle = leadBeat?.title ?? report?.momentum?.title ?? '职业赛季进行中';
  const sceneDetail =
    leadBeat?.detail ??
    report?.momentum?.summary ??
    '训练、比赛与队内竞争正在共同决定你的下一次出场。';

  const currentFocus = save.health.activeInjury
    ? '伤病恢复：' + save.health.activeInjury.bodyArea
    : (report?.momentum?.title ??
      (save.activeLoan ? '租借出场与回归安排' : '适应球队节奏与队内竞争'));
  const advanceToNode = onAdvanceToNode ?? onAdvance ?? (() => undefined);
  const advanceOneMonth = onAdvanceOneMonth ?? onAdvance ?? (() => undefined);
  const nodeAdvance = save.monthlyAdvance.nodeAdvance;
  return (
    <section className="pro-dashboard" aria-label="职业仪表盘">
      <header className="career-hero">
        <span className="eyebrow">职业赛季</span>
        <h2>{actualClubName}</h2>
        <p className="career-player-context">
          {save.player.identity.name} · {save.player.age}岁 ·{' '}
          {POSITION_LABELS[position] ?? position} · 当前俱乐部：{actualClubName}
        </p>
        <div className="career-meta">
          <span>{pro.currentDate}</span>
          <span>第 {pro.currentWeek} 周</span>
          <span>
            合同剩余{' '}
            {Math.max(0, (save.contract?.contractYears ?? 0) - save.contract!.seasonsCompleted)} 年
          </span>
        </div>
      </header>

      <p className="career-focus">
        <strong>当前关注：</strong>
        {currentFocus}
      </p>

      {pro.calendarBridge?.kind === 'long-break' && (
        <p className="calendar-bridge-note" role="status">
          赛历桥接休整：从 {pro.calendarBridge.fromDate} 到 {pro.calendarBridge.toDate}，共{' '}
          {pro.calendarBridge.gapDays} 天；期间不安排比赛，也不计入疲劳和成长消耗。
        </p>
      )}

      {nodeAdvance && (
        <NodeBrief brief={nodeAdvance.brief} skippedMonths={nodeAdvance.skippedMonths} />
      )}

      {save.activeLoan && (
        <section className="dashboard-card loan-status-card" aria-label="租借状态">
          <div className="card-heading">
            <span className="card-kicker">合同状态</span>
            <h3>租借状态</h3>
          </div>
          <p>当前参赛队：{actualClubName}</p>
          <p>合同归属：{parentClubName}</p>
          <p>赛季末自动回归：{save.activeLoan.returnsOn}</p>
        </section>
      )}

      <SceneBanner
        kind={sceneKind}
        eyebrow={report ? `${report.monthKey} · 职业赛季` : '职业赛季 · 工作台'}
        title={sceneTitle}
        detail={sceneDetail}
      />

      <div className="dashboard-grid">
        <section className="dashboard-card current-state-card">
          <div className="card-heading">
            <span className="card-kicker">球员监测</span>
            <h3>当前状态</h3>
          </div>
          <CurrentStateBadges
            fitness={save.health.fitness}
            fatigue={save.health.fatigue}
            morale={save.currentState.morale}
            form={save.currentState.form}
            coachEvaluation={save.clubContext.coachEvaluation}
            injuryWeeks={save.health.activeInjury?.expectedRecoveryWeeks}
          />
        </section>
        <TrainingPlanEditor
          plan={save.trainingPlan}
          disabled={
            busy || advancing || Boolean(save.story.pendingEvent || save.story.pendingFeedback)
          }
          onChange={onTrainingPlanChange}
        />
        <section className="dashboard-card competition-card" aria-label="本赛季赛事">
          <div className="card-heading competition-heading">
            <span className="card-kicker">赛季走势</span>
            <h3>
              <FootballGlyph name="match" size={19} />
              本赛季赛事
            </h3>
          </div>
          <div className="competition-grid">
            <div className="competition-stat competition-stat--accent">
              <span className="competition-stat-label">联赛排名</span>
              <strong>联赛第 {playerRank > 0 ? playerRank : '—'} 名</strong>
              <small>积分榜随每月比赛实时变化</small>
            </div>
            <div className="competition-stat">
              <span className="competition-stat-label">国内杯</span>
              <strong>{cupRound}</strong>
              <small>
                {cupProgress}
                {cup && cupPlayed > 0 ? '；本队已赛 ' + cupClubPlayed + ' 场' : ''}
              </small>
            </div>
            <div className="competition-stat">
              <span className="competition-stat-label">球队实力档位变化</span>
              <strong>{tierMovement}</strong>
              <small>
                {pro.nextClubTier === null
                  ? '赛季结算后更新'
                  : '下一赛季实力档位 ' + pro.nextClubTier}
              </small>
            </div>
          </div>
          <p className="competition-recent">{cupRecent}</p>
        </section>
        <section className="dashboard-card">
          <h3>赛季数据</h3>
          <dl className="profile-facts">
            <div>
              <dt>联赛出场</dt>
              <dd>{stats.leagueAppearances}</dd>
            </div>
            <div>
              <dt>预备队出场</dt>
              <dd>{stats.reserveAppearances}</dd>
            </div>
            <div>
              <dt>联赛分钟</dt>
              <dd>{stats.minutes}</dd>
            </div>
            <div>
              <dt>杯赛出场</dt>
              <dd>{stats.cupAppearances ?? 0}</dd>
            </div>
            <div>
              <dt>杯赛分钟</dt>
              <dd>{stats.cupMinutes ?? 0}</dd>
            </div>
            <div>
              <dt>杯赛进球 / 助攻</dt>
              <dd>
                {stats.cupGoals ?? 0} / {stats.cupAssists ?? 0}
              </dd>
            </div>
            <div>
              <dt>进球 / 助攻</dt>
              <dd>
                {stats.goals} / {stats.assists}
              </dd>
            </div>
            <div>
              <dt>场均评分</dt>
              <dd>{avgRating ?? '—'}</dd>
            </div>
            <div>
              <dt>队内角色</dt>
              <dd>{ROLE_LABELS[save.contract?.squadRole ?? 'youth-team']}</dd>
            </div>
          </dl>
        </section>

        <section className="dashboard-card">
          <h3>位置深度图（{POSITION_LABELS[position] ?? position}）</h3>
          <ol className="depth-list">
            {depthList.map((personId, index) => (
              <li key={personId} className={personId === 'player' ? 'depth-self' : undefined}>
                {index + 1}.{' '}
                {personId === 'player'
                  ? `${save.player.identity.name}（你）`
                  : memberName(pro, personId)}
              </li>
            ))}
          </ol>
        </section>

        <section className="dashboard-card standings-card">
          <details>
            <summary>查看完整联赛积分榜</summary>
            <table className="standings">
              <thead>
                <tr>
                  <th>#</th>
                  <th>俱乐部</th>
                  <th>赛</th>
                  <th>胜</th>
                  <th>平</th>
                  <th>负</th>
                  <th>分</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((standing, index) => (
                  <tr
                    key={standing.clubId}
                    className={standing.clubId === pro.clubId ? 'self' : undefined}
                  >
                    <td>{index + 1}</td>
                    <td>{clubName(save, standing.clubId)}</td>
                    <td>{standing.played}</td>
                    <td>{standing.won}</td>
                    <td>{standing.drawn}</td>
                    <td>{standing.lost}</td>
                    <td>{standing.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>

        <section className="dashboard-card national-team-card">
          <h3>国家队</h3>
          {save.nationalTeam?.capped ? (
            <dl className="profile-facts">
              <div>
                <dt>国家队出场</dt>
                <dd>{save.nationalTeam.caps}</dd>
              </div>
              <div>
                <dt>国家队进球</dt>
                <dd>{save.nationalTeam.goals}</dd>
              </div>
              <div>
                <dt>首秀日期</dt>
                <dd>{save.nationalTeam.debutOn ?? '—'}</dd>
              </div>
            </dl>
          ) : (
            <p>尚未入选国家队</p>
          )}
        </section>

        <WorldFootballPanel items={worldNewsItems} clubs={allClubProfiles()} />

        {save.contract && <ContractCard contract={save.contract} />}

        {report && (
          <>
            <section className="report-card" aria-label="月报">
              <h3>{report.monthKey} 月报</h3>
              <p>
                {report.matchIds.length} 场比赛 · {report.attributeChanges.length} 项属性提升 ·{' '}
                {report.facts.length} 条生涯记录
              </p>
              {report.attributeChanges.length > 0 && (
                <p>
                  {report.attributeChanges
                    .map(
                      ({ attribute, oldValue, newValue }) =>
                        `${labelAttribute(attribute)} ${oldValue}→${newValue}`,
                    )
                    .join('，')}
                </p>
              )}
            </section>
            {report.trainingFeedback && (
              <TrainingFeedbackPanel feedback={report.trainingFeedback} />
            )}
            <MonthlyMomentumPanel monthKey={report.monthKey} momentum={report.momentum} />
            <MatchdayRhythmPanel moments={report.matchdayMoments ?? []} />
            <StoryProgressPanel progress={report.storyProgress} />
          </>
        )}
      </div>

      <CareerActionBar
        busy={busy || advancing}
        disabled={pro.completed}
        label={advancing ? '推进中…' : '推进到下一节点'}
        onAdvanceToNode={advanceToNode}
        onAdvanceOneMonth={advanceOneMonth}
        onOpenArchives={onOpenArchives}
      />
    </section>
  );
}

const memberName = (pro: NonNullable<CareerSaveV5Like['proSeason']>, personId: string): string =>
  pro.squad.find(({ personId: id }) => id === personId)?.name ?? '待核实名单';

const clubName = (save: CareerSaveV5Like, clubId: string): string => {
  if (clubId === save.proSeason?.clubId) return professionalClubName(save);
  // 其他俱乐部名称从内容包渲染由调用方保证；此处退化为 ID
  return clubDisplayName(clubId);
};

const playableClubs = [...youthClubs, ...overseasClubs];
const clubDisplayName = (clubId: string): string =>
  playableClubs.find(({ id }) => id === clubId)?.name ?? clubId;
