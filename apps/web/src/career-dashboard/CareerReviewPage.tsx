import type { CareerSaveV5, CareerSaveV6 } from '@football/contracts';
import { buildCareerReview } from '@football/application';
import { FootballGlyph } from '../design-system/FootballGlyph';
import { SceneBanner } from '../design-system/SceneBanner';

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

/** 生涯回顾页（设计 §9）：退役后的 MVP 终点。 */
export function CareerReviewPage({
  save,
  onOpenArchives,
}: {
  save: CareerSaveV5 | CareerSaveV6;
  onOpenArchives: () => void;
}) {
  const review = buildCareerReview(save);
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

      {save.loanHistory.length > 0 && (
        <section className="review-loans" role="group" aria-label="租借经历">
          <div className="review-section-heading">
            <span className="review-kicker">流动的赛季</span>
            <h3>租借经历</h3>
            <p>租借不会抹去母队合同，但会留下独立的出场和成长记录。</p>
          </div>
          <div className="review-loan-list">
            {save.loanHistory.map((loan) => (
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
