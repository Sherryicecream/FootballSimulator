import type { CareerSaveV5 } from '@football/contracts';
import { buildCareerReview } from '@football/application';

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
      <h2>生涯回顾</h2>
      <p className="review-tier">{review.tierLabel}</p>
      <p className="review-commentary">{review.commentary}</p>

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
