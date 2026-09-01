import type { CareerSaveV5Like } from '@football/contracts';
import { labelAttribute } from './career-presentation';
import { pickLeadBeat, sceneKindForBeat } from './career-presentation';
import { ContractCard } from './ContractCard';
import type { MonthlyReport } from '@football/contracts';
import { MonthlyMomentumPanel } from './MonthlyMomentumPanel';
import { SceneBanner } from '../design-system/SceneBanner';
import { CurrentStateBadges } from './CurrentStateBadges';
import { StoryProgressPanel } from './StoryProgressPanel';

interface ProDashboardProps {
  save: CareerSaveV5Like;
  report: MonthlyReport | null;
  advancing: boolean;
  onAdvance: () => void;
  onNewCareer: () => void;
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

export function ProDashboard({
  save,
  report,
  advancing,
  onAdvance,
  onNewCareer,
}: ProDashboardProps) {
  const pro = save.proSeason;
  if (!pro) return null;
  const standings = [...pro.standings].sort(
    (left, right) =>
      right.points - left.points ||
      right.goalsFor - right.goalsAgainst - (left.goalsFor - left.goalsAgainst),
  );
  const position = save.player.identity.primaryPosition;
  const depthList = pro.depthChart[position] ?? [];
  const stats = save.proSeasonStats;
  const avgRating =
    stats.ratingCount > 0 ? Math.round((stats.ratingSum / stats.ratingCount) * 10) / 10 : null;
  const leadBeat = pickLeadBeat(report?.momentum?.beats ?? []);
  const sceneKind = leadBeat ? sceneKindForBeat(leadBeat.kind) : 'neutral';
  const sceneTitle = leadBeat?.title ?? report?.momentum?.title ?? '职业赛季进行中';
  const sceneDetail =
    leadBeat?.detail ??
    report?.momentum?.summary ??
    '训练、比赛与队内竞争正在共同决定你的下一次出场。';

  return (
    <section className="pro-dashboard" aria-label="职业仪表盘">
      <header className="career-hero">
        <h2>{pro.clubId && (save.contract?.clubName ?? '职业俱乐部')}</h2>
        <div className="career-meta">
          <span>{pro.currentDate}</span>
          <span>第 {pro.currentWeek} 周</span>
          <span>
            合同剩余{' '}
            {Math.max(0, (save.contract?.contractYears ?? 0) - save.contract!.seasonsCompleted)} 年
          </span>
        </div>
      </header>

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
              <dt>出场分钟</dt>
              <dd>{stats.minutes}</dd>
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
          <h3>联赛积分榜</h3>
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
            <MonthlyMomentumPanel monthKey={report.monthKey} momentum={report.momentum} />
            <StoryProgressPanel progress={report.storyProgress} />
          </>
        )}
      </div>

      <footer className="career-actions">
        <button
          className="primary-action"
          onClick={onAdvance}
          disabled={advancing || pro.completed}
        >
          {advancing ? '推进中…' : '推进到下个月'}
        </button>
        <button className="secondary-action" onClick={onNewCareer}>
          新生涯
        </button>
      </footer>
    </section>
  );
}

const memberName = (pro: NonNullable<CareerSaveV5Like['proSeason']>, personId: string): string =>
  pro.squad.find(({ personId: id }) => id === personId)?.name ?? personId;

const clubName = (save: CareerSaveV5Like, clubId: string): string => {
  if (clubId === save.proSeason?.clubId) return save.contract?.clubName ?? clubId;
  // 其他俱乐部名称从内容包渲染由调用方保证；此处退化为 ID
  return clubDisplayName(clubId);
};

import { youthClubs } from '@football/content';
const clubDisplayName = (clubId: string): string =>
  youthClubs.find(({ id }) => id === clubId)?.name ?? clubId;
