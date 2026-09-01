import type { MonthlyMomentum } from '@football/contracts';
import { FootballGlyph, type FootballGlyphName } from '../design-system/FootballGlyph';

interface MonthlyMomentumPanelProps {
  monthKey: string;
  momentum: MonthlyMomentum | undefined;
}

const TONE_LABELS: Record<MonthlyMomentum['tone'], string> = {
  steady: '稳步积累',
  progress: '状态上扬',
  'turning-point': '出现转折',
  warning: '需要回应',
};

const BEAT_GLYPHS: Record<MonthlyMomentum['beats'][number]['kind'], FootballGlyphName> = {
  training: 'training',
  match: 'match',
  decision: 'form',
  event: 'warning',
  health: 'recovery',
  relationship: 'relationship',
  'first-team': 'coach-trust',
  settlement: 'locker-room',
};

export const MonthlyMomentumPanel = ({ monthKey, momentum }: MonthlyMomentumPanelProps) => {
  if (!momentum) return null;

  return (
    <section
      className={`monthly-momentum-panel monthly-momentum-${momentum.tone}`}
      aria-label="本月节奏"
    >
      <header className="monthly-momentum-header">
        <div className="monthly-momentum-label">
          <span className="eyebrow">本月节奏</span>
          <span className="monthly-momentum-tone">{TONE_LABELS[momentum.tone]}</span>
        </div>
        <span className="monthly-momentum-month">{monthKey} · 月度章节</span>
        <h3>{momentum.title}</h3>
        <p>{momentum.summary}</p>
      </header>

      <ol className="monthly-momentum-beats">
        {momentum.beats.map((beat, index) => (
          <li
            className={`monthly-momentum-beat monthly-momentum-beat-${beat.intensity}`}
            key={`${beat.weekKey}-${beat.kind}`}
          >
            <div className="monthly-momentum-beat-marker" aria-hidden="true">
              <FootballGlyph name={BEAT_GLYPHS[beat.kind]} size={17} />
            </div>
            <div className="monthly-momentum-beat-copy">
              <div className="monthly-momentum-beat-meta">
                <span>第 {index + 1} 周</span>
                <small>{beat.weekKey}</small>
              </div>
              <strong>{beat.title}</strong>
              <p>{beat.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <footer className="monthly-momentum-next">
        <span>下一步关注</span>
        <p>{momentum.nextFocus}</p>
      </footer>
    </section>
  );
};
