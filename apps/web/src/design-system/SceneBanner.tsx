import type { ReactNode } from 'react';
import type { SceneKind } from './scene-types';

export interface SceneBannerProps {
  kind: SceneKind;
  eyebrow: string;
  title: string;
  detail?: string;
}

const sceneArt: Record<SceneKind, ReactNode> = {
  training: (
    <>
      <path d="M12 5v14M5 12h14" />
      <path d="M6 17l1.5-5h3L9 17zM15 17l1.5-5h3L18 17z" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
  match: (
    <>
      <path d="M3 5h18v14H3zM12 5v14M3 9h4v6H3M21 9h-4v6h4" />
      <circle cx="12" cy="12" r="1.8" />
    </>
  ),
  'locker-room': (
    <>
      <path d="M4 5h16v14H4zM9.3 5v14M14.7 5v14M6.5 9h1M11 9h1M16.5 9h1M6.5 15h1M11 15h1M16.5 15h1" />
      <path d="M7 3h10" />
    </>
  ),
  recovery: (
    <>
      <path d="M19 8a7.5 7.5 0 1 0 1 5" />
      <path d="M20 4v5h-5" />
      <path d="M12 8v4l2.4 1.5" />
    </>
  ),
  neutral: (
    <>
      <path d="M4 4h16v16H4zM4 10h16M10 4v16" />
      <circle cx="16" cy="16" r="2" />
    </>
  ),
};

export const SceneBanner = ({ kind, eyebrow, title, detail }: SceneBannerProps) => (
  <section
    className={'scene-banner scene-banner--' + kind}
    aria-label={'足球场景：' + title}
    data-scene-kind={kind}
  >
    <div className="scene-banner-art" data-testid="scene-art" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        {sceneArt[kind]}
      </svg>
    </div>
    <div className="scene-banner-copy">
      <span className="scene-banner-eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      {detail && <p>{detail}</p>}
    </div>
  </section>
);
