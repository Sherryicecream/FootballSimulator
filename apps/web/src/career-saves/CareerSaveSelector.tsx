import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { CareerSlotRecord, LoadedCareerSlot } from '../persistence/local-storage-save';
import { buildCareerSaveSummary, type CareerSaveSummary } from './career-save-summary';

export interface CareerSaveSelectorProps {
  records: readonly CareerSlotRecord[];
  academyNames: ReadonlyMap<string, string>;
  busy: boolean;
  onContinue(slotId: string): void;
  onCreate(): void;
  onDelete(slotId: string): Promise<void>;
}

interface PendingDeletion {
  slotId: string;
  detail: string;
}

const savedAtLabel = (savedAt: string | null): string => savedAt ?? '保存时间未知';

const summaryFor = (
  record: LoadedCareerSlot,
  academyNames: ReadonlyMap<string, string>,
): CareerSaveSummary => buildCareerSaveSummary(record, academyNames);

export const CareerSaveSelector = ({
  records,
  academyNames,
  busy,
  onContinue,
  onCreate,
  onDelete,
}: CareerSaveSelectorProps) => {
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deletionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const createCareerRef = useRef<HTMLButtonElement | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);
  const confirmDeleteRef = useRef<HTMLButtonElement | null>(null);
  const focusAfterCloseRef = useRef<'trigger' | 'create' | null>(null);
  const actionsDisabled = busy || deleting;

  useEffect(() => {
    if (pendingDeletion) {
      cancelDeleteRef.current?.focus();
      return;
    }
    if (focusAfterCloseRef.current === 'trigger') deletionTriggerRef.current?.focus();
    if (focusAfterCloseRef.current === 'create') createCareerRef.current?.focus();
    focusAfterCloseRef.current = null;
  }, [pendingDeletion]);

  const openDeletion = (deletion: PendingDeletion, trigger: HTMLButtonElement) => {
    deletionTriggerRef.current = trigger;
    setPendingDeletion(deletion);
  };

  const cancelDeletion = () => {
    if (actionsDisabled) return;
    focusAfterCloseRef.current = 'trigger';
    setPendingDeletion(null);
  };

  const trapDialogFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelDeletion();
      return;
    }
    if (event.key !== 'Tab') return;

    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
    );
    const first = buttons[0];
    const last = buttons.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeletion || actionsDisabled) return;
    setDeleting(true);
    try {
      await onDelete(pendingDeletion.slotId);
      focusAfterCloseRef.current = 'create';
      setPendingDeletion(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="career-save-selector" aria-label="生涯档案">
      <header className="career-save-selector-header">
        <div>
          <span className="eyebrow">本地档案</span>
          <h2>生涯档案</h2>
          <p>选择一段生涯继续旅程，或开启新的球员故事。</p>
        </div>
        <button
          className="primary-action"
          type="button"
          onClick={onCreate}
          disabled={actionsDisabled}
          ref={createCareerRef}
        >
          创建新生涯
        </button>
      </header>

      {records.length === 0 ? (
        <p className="career-save-empty">还没有可继续的生涯档案。</p>
      ) : (
        <div className="career-save-list">
          {records.map((record) =>
            record.status === 'loaded' ? (
              <LoadedSaveCard
                key={record.slotId}
                summary={summaryFor(record, academyNames)}
                disabled={actionsDisabled}
                onContinue={onContinue}
                onDelete={(event) =>
                  openDeletion(
                    {
                      slotId: record.slotId,
                      detail: `${record.save.player.identity.name} · ${buildCareerSaveSummary(record, academyNames).phaseLabel}`,
                    },
                    event.currentTarget,
                  )
                }
              />
            ) : (
              <DamagedSaveCard
                key={record.slotId}
                record={record}
                disabled={actionsDisabled}
                onDelete={(event) =>
                  openDeletion(
                    {
                      slotId: record.slotId,
                      detail: '无法读取的生涯档案',
                    },
                    event.currentTarget,
                  )
                }
              />
            ),
          )}
        </div>
      )}

      {pendingDeletion && (
        <section
          className="career-save-confirmation"
          role="alertdialog"
          aria-modal="true"
          aria-label="删除生涯确认"
          onKeyDown={trapDialogFocus}
        >
          <h3>删除生涯确认</h3>
          <p>确定要删除{pendingDeletion.detail}吗？此操作无法撤销。</p>
          <div className="career-save-confirmation-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={cancelDeletion}
              disabled={actionsDisabled}
              ref={cancelDeleteRef}
            >
              取消删除
            </button>
            <button
              className="danger-action"
              type="button"
              onClick={confirmDelete}
              disabled={actionsDisabled}
              ref={confirmDeleteRef}
            >
              确认删除
            </button>
          </div>
        </section>
      )}
    </section>
  );
};

interface LoadedSaveCardProps {
  summary: CareerSaveSummary;
  disabled: boolean;
  onContinue(slotId: string): void;
  onDelete(event: MouseEvent<HTMLButtonElement>): void;
}

const LoadedSaveCard = ({ summary, disabled, onContinue, onDelete }: LoadedSaveCardProps) => (
  <article className="career-save-card">
    <div className="career-save-card-heading">
      <div>
        <span className="career-save-phase">{summary.phaseLabel}</span>
        <h3>{summary.playerName}</h3>
      </div>
      <span className="career-save-age">{summary.age} 岁</span>
    </div>
    <dl className="career-save-facts">
      <div>
        <dt>所在</dt>
        <dd>{summary.location}</dd>
      </div>
      <div>
        <dt>当前日期</dt>
        <dd>{summary.currentDate}</dd>
      </div>
      <div>
        <dt>最后保存</dt>
        <dd>{summary.savedAt}</dd>
      </div>
    </dl>
    <div className="career-save-actions">
      <button
        className="primary-action"
        type="button"
        onClick={() => onContinue(summary.slotId)}
        disabled={disabled}
        aria-label={
          summary.terminal ? `查看${summary.playerName}的回顾` : `继续${summary.playerName}的生涯`
        }
      >
        {summary.terminal ? '查看回顾' : '继续'}
      </button>
      <button
        className="secondary-action"
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`删除${summary.playerName}的生涯`}
      >
        删除
      </button>
    </div>
  </article>
);

interface DamagedSaveCardProps {
  record: Exclude<CareerSlotRecord, LoadedCareerSlot>;
  disabled: boolean;
  onDelete(event: MouseEvent<HTMLButtonElement>): void;
}

const DamagedSaveCard = ({ record, disabled, onDelete }: DamagedSaveCardProps) => (
  <article className="career-save-card career-save-card--damaged">
    <span className="career-save-phase">无法读取</span>
    <h3>无法读取此生涯档案</h3>
    <p>{record.reason}</p>
    <p className="career-save-saved-at">最后保存：{savedAtLabel(record.savedAt)}</p>
    <div className="career-save-actions">
      <button
        className="secondary-action"
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label="删除损坏的生涯"
      >
        删除
      </button>
    </div>
  </article>
);
