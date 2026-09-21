import { useEffect, useMemo, useState } from 'react';
import type {
  CareerArchiveV1,
  CareerSaveV5,
  CareerSaveV6,
  CareerSaveV7,
  MilestoneInput,
} from '@football/contracts';
import { MilestoneInputSchema } from '@football/contracts';
import {
  buildCareerReview,
  buildCareerSummaryFacts,
  generateCareerSummary,
} from '@football/application';
import { FootballGlyph } from '../design-system/FootballGlyph';
import { SceneBanner } from '../design-system/SceneBanner';
import {
  createCareerSummaryRequest,
  createMilestoneNarrationRequest,
  type LocalNarrativeClient,
} from '../narration/local-ai-client';

const replayGlyphs = {
  story: 'form',
  match: 'match',
  relationship: 'relationship',
  international: 'coach-trust',
  contract: 'locker-room',
  milestone: 'form',
  health: 'recovery',
} as const;

const replayKindLabels = {
  story: '故事',
  match: '比赛',
  relationship: '关系',
  international: '国家队',
  contract: '合同',
  milestone: '里程碑',
  health: '健康',
} as const;

type CareerReviewSave = CareerSaveV5 | CareerSaveV6 | CareerSaveV7;

type CareerReviewPageProps =
  | {
      save: CareerReviewSave;
      archive?: never;
      onOpenArchives: () => void;
      narrativeClient?: LocalNarrativeClient | undefined;
    }
  | {
      save?: never;
      archive: CareerArchiveV1;
      onOpenArchives: () => void;
      narrativeClient?: LocalNarrativeClient | undefined;
    };

const buildLocalRetirementNarrative = (input: MilestoneInput): string => {
  if (input.kind !== 'retirement') return '';
  const { careerOverview } = input;
  const honourSummary =
    input.honours.length > 0
      ? '荣誉记录包括' + input.honours.map(({ label }) => label).join('、') + '。'
      : '档案中没有记录在案的生涯荣誉。';
  const signatureSummary =
    input.signatureMatches.length > 0
      ? '独特比赛记录包括' +
        input.signatureMatches.map(({ highlight }) => highlight).join('；') +
        '。'
      : '档案中没有可单独提取的独特比赛记录，因此不对空白作额外推断。';
  return (
    input.playerName +
    '的球员生涯在' +
    input.seasonId.replace('retirement-', '') +
    '进入退役结算。职业生涯共经历' +
    careerOverview.seasons +
    '个赛季，效力' +
    careerOverview.clubs +
    '家俱乐部，累计出场' +
    careerOverview.appearances +
    '次、踢满' +
    careerOverview.minutes +
    '分钟，贡献' +
    careerOverview.goals +
    '个进球和' +
    careerOverview.assists +
    '次助攻。' +
    honourSummary +
    signatureSummary +
    '这份本地评价只复述已保存的履历、荣誉和关键数据；没有记录的经历会保持为空白。'
  );
};

/** 生涯回顾页（设计 §9）：退役后的 MVP 终点。 */
export function CareerReviewPage({
  save,
  archive,
  onOpenArchives,
  narrativeClient,
}: CareerReviewPageProps) {
  const review = useMemo(
    () => (archive ? archive.review : buildCareerReview(save!)),
    [archive, save],
  );
  const summaryFacts = useMemo(() => buildCareerSummaryFacts(archive ?? save!), [archive, save]);
  const retirementInput = useMemo(() => {
    if (!review.ending) return null;
    return MilestoneInputSchema.parse({
      kind: 'retirement',
      playerName: summaryFacts.player.name,
      seasonId: 'retirement-' + review.ending.endedOn,
      careerOverview: {
        seasons: review.seasons,
        clubs: review.clubs,
        appearances: review.totals.appearances,
        minutes: review.totals.minutes,
        goals: review.totals.goals,
        assists: review.totals.assists,
      },
      honours: review.honours.map(({ kind, label, seasonId }) => ({ kind, label, seasonId })),
      keyStats: [
        { label: '职业生涯出场', value: review.totals.appearances, unit: '次' },
        { label: '职业生涯进球', value: review.totals.goals, unit: '球' },
        { label: '职业生涯助攻', value: review.totals.assists, unit: '次' },
        { label: '职业生涯分钟', value: review.totals.minutes, unit: '分钟' },
      ],
      signatureMatches: [],
      regret: null,
      biggestAchievement: review.honours[0]?.label ?? null,
    });
  }, [review, summaryFacts]);
  const localRetirementNarrative = useMemo(
    () => (retirementInput ? buildLocalRetirementNarrative(retirementInput) : null),
    [retirementInput],
  );
  const localShortSummary = useMemo(
    () => generateCareerSummary(summaryFacts, 'short'),
    [summaryFacts],
  );
  const localLongSummary = useMemo(
    () => generateCareerSummary(summaryFacts, 'long'),
    [summaryFacts],
  );
  const [aiShortSummary, setAiShortSummary] = useState<string | null>(null);
  const [aiLongSummary, setAiLongSummary] = useState<string | null>(null);
  const [aiLongRequested, setAiLongRequested] = useState(false);
  const [aiLongLoading, setAiLongLoading] = useState(false);
  const [showLocalLong, setShowLocalLong] = useState(false);
  const [aiRetirementNarrative, setAiRetirementNarrative] = useState<string | null>(null);

  useEffect(() => {
    if (!narrativeClient) return;
    let active = true;
    void createCareerSummaryRequest(summaryFacts, 'short')
      .then((request) => narrativeClient.summarize(request))
      .then((output) => {
        if (active && output) setAiShortSummary(output.summary);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [narrativeClient, summaryFacts]);

  useEffect(() => {
    setAiRetirementNarrative(null);
    const narrateMilestone = narrativeClient?.narrateMilestone;
    if (!narrateMilestone || !retirementInput) return;
    let active = true;
    void createMilestoneNarrationRequest(retirementInput)
      .then((request) => narrateMilestone(request))
      .then((output) => {
        if (active && output) setAiRetirementNarrative(output.narrative);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [narrativeClient, retirementInput]);

  const requestAiLongSummary = () => {
    if (!narrativeClient || aiLongRequested || aiLongLoading) return;
    setAiLongRequested(true);
    setShowLocalLong(true);
    setAiLongLoading(true);
    void createCareerSummaryRequest(summaryFacts, 'long')
      .then((request) => narrativeClient.summarize(request))
      .then((output) => {
        if (output) setAiLongSummary(output.summary);
      })
      .catch(() => undefined)
      .finally(() => setAiLongLoading(false));
  };
  const loanHistory = archive?.history.loanHistory ?? save?.loanHistory ?? [];
  const clubHistory = archive?.history.clubHistory ?? save?.clubHistory ?? [];
  const nationalTeam = archive?.history.nationalTeam ?? save?.nationalTeam ?? null;
  const isYouthOnlyEnding = review.ending?.kind === 'youth-no-contract';
  return (
    <section className="career-review" aria-label="生涯回顾">
      <SceneBanner
        kind="match"
        landmark={false}
        eyebrow="生涯纪录片 · 终场哨响"
        title="生涯回顾"
        detail="从青训第一天到最后一次出场，重要选择都留在这份档案里。"
      />
      {review.ending && (
        <section className="review-ending" role="group" aria-label="生涯结局">
          <span className="review-kicker">生涯结局</span>
          <h2>{review.ending.label}</h2>
          <p>{review.ending.summary}</p>
          <time dateTime={review.ending.endedOn}>{review.ending.endedOn}</time>
        </section>
      )}
      <p className="review-tier">{review.tierLabel}</p>
      <p className="review-commentary">{review.commentary}</p>

      {retirementInput && localRetirementNarrative && (
        <section className="review-summary review-milestone" role="group" aria-label="退役节点评价">
          <div className="review-section-heading">
            <span className="review-kicker">关键节点 · 退役</span>
            <h3>退役节点评价</h3>
            <p>本地评价先行保留；接入本地 AI 后，只会在同一份事实包上改善表达。</p>
          </div>
          <article className="review-summary-card review-summary-local">
            <strong>本地退役评价</strong>
            <p>{localRetirementNarrative}</p>
          </article>
          {aiRetirementNarrative && (
            <article className="review-summary-card review-summary-ai">
              <strong>AI 退役节点评价</strong>
              <p>{aiRetirementNarrative}</p>
            </article>
          )}
        </section>
      )}

      <section className="review-summary" role="group" aria-label="人生总结">
        <div className="review-section-heading">
          <span className="review-kicker">生涯叙事</span>
          <h3>人生总结</h3>
          <p>本地总结始终根据当前存档生成；AI 只负责改善表达，不会覆盖事实评价。</p>
        </div>
        <article className="review-summary-card review-summary-local">
          <strong>本地生涯总结</strong>
          <p>{localShortSummary}</p>
        </article>
        {aiShortSummary && (
          <article className="review-summary-card review-summary-ai">
            <strong>AI 叙事增强</strong>
            <p>{aiShortSummary}</p>
          </article>
        )}
        <div className="review-summary-actions">
          <button
            className="secondary-action"
            type="button"
            onClick={() => setShowLocalLong((visible) => !visible)}
          >
            {showLocalLong ? '收起本地人生总结' : '展开本地人生总结'}
          </button>
          {narrativeClient && (
            <button type="button" onClick={requestAiLongSummary} disabled={aiLongLoading}>
              {aiLongLoading
                ? '正在生成 AI 人生总结…'
                : aiLongRequested
                  ? 'AI 人生总结已请求'
                  : '展开 AI 人生总结'}
            </button>
          )}
        </div>
        {showLocalLong && (
          <article className="review-summary-card review-summary-long">
            <strong>本地长版总结</strong>
            <p>{localLongSummary}</p>
          </article>
        )}
        {aiLongSummary && (
          <article className="review-summary-card review-summary-ai">
            <strong>AI 长版叙事增强</strong>
            <p>{aiLongSummary}</p>
          </article>
        )}
      </section>

      <div className="review-goals" role="group" aria-label="长期目标">
        <div className="review-section-heading">
          <span className="review-kicker">长期目标</span>
          <h3>你留下了什么</h3>
          <p>这些目标根据生涯账本和赛季记录计算，完成状态可以追溯到具体事实。</p>
        </div>
        <div className="review-goal-grid">
          {review.goals.map((goal) => {
            const percentage = Math.min(100, (goal.progress / Math.max(goal.target, 1)) * 100);
            return (
              <article className="review-goal-card" key={goal.id}>
                <div className="review-goal-header">
                  <FootballGlyph name={goal.status === 'complete' ? 'form' : 'warning'} size={17} />
                  <span>{goal.status === 'complete' ? '已完成' : '进行中'}</span>
                </div>
                <strong>{goal.label}</strong>
                <div className="review-goal-progress">
                  <div className="review-goal-track" aria-hidden="true">
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                  <b>
                    {goal.progress}/{goal.target}
                  </b>
                </div>
                <small>{goal.evidenceIds.length} 条账本证据</small>
              </article>
            );
          })}
        </div>
      </div>

      <h3>生涯总览</h3>
      <dl className="profile-facts">
        <div>
          <dt>{isYouthOnlyEnding ? '青训赛季' : '职业生涯'}</dt>
          <dd>{review.seasons} 个赛季</dd>
        </div>
        <div>
          <dt>累计出场</dt>
          <dd>{review.totals.appearances}</dd>
        </div>
        <div>
          <dt>累计分钟</dt>
          <dd>{review.totals.minutes} 分钟</dd>
        </div>
        <div>
          <dt>进球 / 助攻</dt>
          <dd>
            {review.totals.goals} / {review.totals.assists}
          </dd>
        </div>
        <div>
          <dt>俱乐部</dt>
          <dd>{review.clubs} 家</dd>
        </div>
        <div>
          <dt>国家队</dt>
          <dd>{review.caps > 0 ? `${review.caps} 场 ${review.nationalGoals} 球` : '未入选'}</dd>
        </div>
        <div>
          <dt>留洋经历</dt>
          <dd>{review.overseasSpells ? '有' : '无'}</dd>
        </div>
      </dl>

      <section className="review-history" role="group" aria-label="俱乐部履历">
        <div className="review-section-heading">
          <span className="review-kicker">效力轨迹</span>
          <h3>俱乐部履历</h3>
          <p>每段效力经历都来自生涯存档，不会因为进入历史档案而丢失。</p>
        </div>
        {clubHistory.length > 0 ? (
          <ul className="review-club-list">
            {clubHistory.map((club) => (
              <li className="review-club-item" key={`${club.clubId}-${club.from}`}>
                <strong>{club.clubName}</strong>
                <span>
                  {club.from} 至 {club.to ?? '退役'} · {club.seasons} 个赛季 · 出场{' '}
                  {club.appearances} 次，进球 {club.goals} 个
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="review-empty">没有记录在案的俱乐部履历。</p>
        )}
      </section>

      <section className="review-history" role="group" aria-label="国家队履历">
        <div className="review-section-heading">
          <span className="review-kicker">国家记忆</span>
          <h3>国家队履历</h3>
          <p>国家队数据与俱乐部履历分开记录，保留首秀、出场和进球。</p>
        </div>
        {nationalTeam?.capped ? (
          <p>
            国家队首秀：{nationalTeam.debutOn ?? '日期未知'} · {nationalTeam.caps} 场{' '}
            {nationalTeam.goals} 球
          </p>
        ) : (
          <p className="review-empty">未留下国家队履历。</p>
        )}
      </section>

      <section className="review-dimensions" role="group" aria-label="生涯八维">
        <div className="review-section-heading">
          <span className="review-kicker">生涯结算</span>
          <h3>生涯八维</h3>
          <p>八个维度由存档数据直接计算；分数条与文字标签同时表达评价，不只靠颜色区分。</p>
        </div>
        <div className="review-dimension-grid">
          {review.dimensions.map((dimension) => (
            <article className="review-dimension-card" key={dimension.key}>
              <header className="review-dimension-header">
                <strong>{dimension.label}</strong>
                <span>
                  {dimension.ratingLabel} · {dimension.score}
                </span>
              </header>
              <div
                className="review-dimension-bar"
                role="progressbar"
                aria-valuenow={dimension.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${dimension.label}：${dimension.ratingLabel} ${dimension.score}`}
              >
                <span style={{ width: `${dimension.score}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="review-behind-the-scenes" role="group" aria-label="幕后档案">
        <div className="review-section-heading">
          <span className="review-kicker">退役解锁</span>
          <h3>幕后档案</h3>
          <p>这些信息在生涯进行中不可见，退役后完整公开，全部来自你的存档记录。</p>
        </div>
        <div className="review-potential-grid">
          {review.behindTheScenes.potentials.map((group) => (
            <article className="review-potential-card" key={group.group}>
              <header className="review-potential-header">
                <strong>潜力兑现</strong>
                <span>
                  {group.label} {group.fulfillment}%
                </span>
              </header>
              <ul className="review-potential-list">
                {group.items.map((item) => (
                  <li key={item.key}>
                    <span>{item.label}</span>
                    <strong>
                      {item.achieved} / {item.potential}
                    </strong>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="review-traits">
          <h4>隐藏特质</h4>
          <ul className="review-trait-list">
            {review.behindTheScenes.traits.map((trait) => (
              <li key={trait.key}>
                <strong>
                  {trait.label}：{trait.value}
                </strong>
                <span>{trait.note}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="review-missed">
          <h4>错过的机会</h4>
          {review.behindTheScenes.missedOpportunities.length > 0 ? (
            <ul className="review-missed-list">
              {review.behindTheScenes.missedOpportunities.map((item) => (
                <li key={item.id}>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="review-empty">没有记录在案的错过。</p>
          )}
        </div>
      </section>

      <section className="review-honours" role="group" aria-label="生涯荣誉">
        <div className="review-section-heading">
          <span className="review-kicker">荣誉陈列室</span>
          <h3>生涯荣誉</h3>
          <p>每一项荣誉都对应一个已经完成的赛季目标。</p>
        </div>
        {review.honours.length > 0 ? (
          <ul className="review-honours-list">
            {review.honours.map((honour) => (
              <li key={honour.id} className="review-honour-item">
                <FootballGlyph name="form" size={18} />
                <div>
                  <strong>{honour.label}</strong>
                  <span>{honour.seasonId}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="review-empty">还没有解锁生涯荣誉。</p>
        )}
      </section>

      {loanHistory.length > 0 && (
        <section className="review-loans" role="group" aria-label="租借经历">
          <div className="review-section-heading">
            <span className="review-kicker">流动的赛季</span>
            <h3>租借经历</h3>
            <p>租借不会抹去母队合同，但会留下独立的出场和成长记录。</p>
          </div>
          <div className="review-loan-list">
            {loanHistory.map((loan) => (
              <article className="review-loan-card" key={`${loan.seasonId}-${loan.loanClubId}`}>
                <div className="review-loan-heading">
                  <strong>{loan.loanClubName}</strong>
                  <span>租借 · {loan.seasonId}</span>
                </div>
                <p>
                  合同母队：{loan.parentClubName} · {loan.from} 至 {loan.to}
                </p>
                <p>
                  出场 {loan.appearances} 次，进球 {loan.goals} 个，助攻 {loan.assists} 次，
                  {loan.minutes} 分钟
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="review-replay" role="group" aria-label="全生涯回放">
        <div className="review-section-heading">
          <span className="review-kicker">全生涯回放</span>
          <h3>全生涯回放</h3>
          <p>那些改变走向的瞬间，会被还原成一条条可追溯的纪录。</p>
        </div>
        <ol className="review-replay-list">
          {review.replay.map((moment) => (
            <li
              className={`review-replay-item review-replay-${moment.kind}`}
              key={moment.evidenceId}
            >
              <div className="review-replay-marker">
                <FootballGlyph name={replayGlyphs[moment.kind]} size={18} />
              </div>
              <div className="review-replay-copy">
                <div className="review-replay-meta">
                  <span>{moment.timeKey}</span>
                  <span>{replayKindLabels[moment.kind]}</span>
                </div>
                <strong>{moment.title}</strong>
                <p>{moment.summary}</p>
                {moment.participantIds.length > 0 && (
                  <small>相关人物：{moment.participantIds.join('、')}</small>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <h3>逐季时间线</h3>
      <ul className="review-timeline">
        {review.timeline.map((season) => (
          <li key={season.seasonId}>
            {season.seasonId}：
            {season.status === 'released'
              ? '被放弃'
              : season.status === 'graduated'
                ? '毕业'
                : '留队'}
            ， 出场 {season.appearances} 次，进球 {season.goals} 个
            {season.avgRating != null ? `，场均评分 ${season.avgRating}` : ''}
          </li>
        ))}
      </ul>

      <p className="review-footer">感谢你带来的这段旅程——足球的故事，到这里画上了句号。</p>
      <button onClick={onOpenArchives}>返回生涯档案</button>
    </section>
  );
}
