import type { CareerSaveV5 } from '@football/contracts';
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
  onNewCareer,
}: {
  save: CareerSaveV5;
  onNewCareer: () => void;
}) {
  const review = buildCareerReview(save);
  return (
    <section className="career-review" aria-label="生涯回顾">
      <SceneBanner
        kind="match"
        landmark={false}
        eyebrow="生涯纪录片 · 终场哨响"
        title="生涯回顾"
        detail="从青训第一天到最后一次出场，重要选择都留在这份档案里。"
      />
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
          <dt>职业生涯</dt>
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
      <button onClick={onNewCareer}>开始新生涯</button>
    </section>
  );
}
