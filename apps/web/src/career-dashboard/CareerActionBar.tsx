import type { MouseEvent } from 'react';

interface CareerActionBarProps {
  busy: boolean;
  label: string;
  disabled?: boolean;
  onAdvanceToNode: () => void;
  onAdvanceOneMonth: () => void;
  onOpenArchives: () => void;
}

export const CareerActionBar = ({
  busy,
  label,
  disabled = false,
  onAdvanceToNode,
  onAdvanceOneMonth,
  onOpenArchives,
}: CareerActionBarProps) => {
  const actionsDisabled = busy || disabled;

  const handleAdvanceOneMonth = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!actionsDisabled) onAdvanceOneMonth();
  };

  return (
    <section className="career-action-bar" aria-label="生涯操作">
      <div className="career-action-bar-main">
        <span className="career-action-bar-kicker">下一步</span>
        <strong>推进生涯节点</strong>
      </div>
      <div className="career-action-bar-actions">
        <button
          className="primary-action"
          type="button"
          onClick={onAdvanceToNode}
          disabled={actionsDisabled}
          aria-label="推进到下一节点"
        >
          {label}
        </button>
        <a
          className="career-action-bar-monthly"
          href="#monthly-advance"
          onClick={handleAdvanceOneMonth}
          aria-disabled={actionsDisabled}
          tabIndex={actionsDisabled ? -1 : 0}
        >
          逐月推进
        </a>
        <button className="secondary-action" type="button" onClick={onOpenArchives} disabled={busy}>
          生涯档案
        </button>
      </div>
    </section>
  );
};
