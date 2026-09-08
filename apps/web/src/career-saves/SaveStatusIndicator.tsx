export interface SaveCommitState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
}

export interface SaveStatusIndicatorProps {
  state: SaveCommitState;
  onRetry(): void;
}

export const SaveStatusIndicator = ({ state, onRetry }: SaveStatusIndicatorProps) => {
  if (state.status === 'idle') return null;

  if (state.status === 'saving') {
    return (
      <p className="save-status-indicator save-status-indicator--saving" role="status">
        正在保存
      </p>
    );
  }

  if (state.status === 'saved') {
    return (
      <p className="save-status-indicator save-status-indicator--saved" role="status">
        已自动保存
      </p>
    );
  }

  return (
    <div className="save-status-indicator save-status-indicator--error" role="alert">
      <span>{state.message ?? '保存失败，请重试。'}</span>
      <button className="secondary-action" type="button" onClick={onRetry} aria-label="重试保存">
        重试保存
      </button>
    </div>
  );
};
