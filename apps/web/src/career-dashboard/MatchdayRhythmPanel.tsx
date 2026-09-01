import type { MatchdayMoment } from '@football/contracts';

interface MatchdayRhythmPanelProps {
  moments: readonly MatchdayMoment[];
}

const DIFFICULTY_LABELS: Record<MatchdayMoment['difficulty'], string> = {
  favorable: '可拿分',
  balanced: '势均力敌',
  difficult: '高强度',
};

const RESULT_LABELS: Record<MatchdayMoment['result'], string> = {
  win: '胜',
  draw: '平',
  loss: '负',
};

export const MatchdayRhythmPanel = ({ moments }: MatchdayRhythmPanelProps) => {
  if (moments.length === 0) return null;

  return (
    <section className="matchday-rhythm-panel" aria-label="比赛日节奏">
      <header className="matchday-rhythm-header">
        <div>
          <span className="eyebrow">比赛日 · 赛前到赛后</span>
          <h3>比赛日回放</h3>
        </div>
        <span>{moments.length} 场关键比赛</span>
      </header>
      <div className="matchday-rhythm-list">
        {moments.map((moment) => (
          <article
            className={'matchday-moment matchday-moment--' + moment.difficulty}
            key={moment.weekKey + '-' + moment.opponentName}
          >
            <header className="matchday-moment-heading">
              <div>
                <span className="matchday-moment-week">{moment.weekKey}</span>
                <h4>{moment.opponentName}</h4>
              </div>
              <div className="matchday-moment-score">
                <strong>{moment.scoreline}</strong>
                <span>{RESULT_LABELS[moment.result]}</span>
              </div>
            </header>
            <div className="matchday-moment-difficulty">
              <span>对手强度 {moment.opponentStrength}</span>
              <strong>{DIFFICULTY_LABELS[moment.difficulty]}</strong>
            </div>
            <div className="matchday-moment-story">
              <section>
                <span>赛前判断</span>
                <p>{moment.preMatch}</p>
              </section>
              <section>
                <span>赛后反馈</span>
                <p>{moment.postMatch}</p>
              </section>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
