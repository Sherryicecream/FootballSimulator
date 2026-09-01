import type { StoryProgressSnapshot } from '@football/contracts';

interface StoryProgressPanelProps {
  progress: StoryProgressSnapshot | undefined;
}

const STATUS_LABELS: Record<StoryProgressSnapshot['entries'][number]['status'], string> = {
  active: '正在推进',
  waiting: '等待条件',
  completed: '已完成',
};

export const StoryProgressPanel = ({ progress }: StoryProgressPanelProps) => {
  if (!progress || (progress.entries.length === 0 && progress.recentChoice === null)) {
    return null;
  }

  return (
    <section className="story-progress-panel" aria-label="故事进度">
      <header className="story-progress-header">
        <div>
          <span className="eyebrow">生涯线索</span>
          <h3>正在发生的故事</h3>
        </div>
        <span className="story-progress-count">{progress.entries.length} 条故事线</span>
      </header>

      {progress.recentChoice && (
        <div className="story-progress-recent">
          <span>最近选择 · {progress.recentChoice.weekKey}</span>
          <strong>{progress.recentChoice.eventTitle}</strong>
          <p>你选择了「{progress.recentChoice.choiceText}」</p>
        </div>
      )}

      <div className="story-progress-list">
        {progress.entries.map((entry) => (
          <article className="story-progress-entry" key={entry.storyId}>
            <div className="story-progress-entry-header">
              <div>
                <span className={`story-progress-status story-progress-status--${entry.status}`}>
                  {STATUS_LABELS[entry.status]}
                </span>
                <h4>{entry.title}</h4>
              </div>
              <strong>{entry.progressPercent}%</strong>
            </div>
            <div
              className="story-progress-track"
              role="progressbar"
              aria-label={entry.title + ' 故事进度'}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={entry.progressPercent}
            >
              <span style={{ width: entry.progressPercent + '%' }} />
            </div>
            {entry.activeNodeTitles.length > 0 && (
              <p className="story-progress-active">当前线索：{entry.activeNodeTitles.join('、')}</p>
            )}
            <p className="story-progress-wait">{entry.waitReason}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
