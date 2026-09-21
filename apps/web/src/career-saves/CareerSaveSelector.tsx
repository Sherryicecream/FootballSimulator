import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type {
  CareerSlotRecord,
  LoadedCareerArchiveSlot,
  LoadedCareerSlot,
} from '../persistence/local-storage-save';
import { buildCareerSaveSummary, type CareerSaveSummary } from './career-save-summary';

export interface CareerSaveSelectorProps {
  records: readonly CareerSlotRecord[];
  academyNames: ReadonlyMap<string, string>;
  busy: boolean;
  onContinue(slotId: string): void;
  onCreate(): void;
  onDelete(slotId: string): Promise<void>;
  onExport?(slotId: string): Promise<void>;
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
  onExport,
}: CareerSaveSelectorProps) => {
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [exportingSlotId, setExportingSlotId] = useState<string | null>(null);
  const deletionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const createCareerRef = useRef<HTMLButtonElement | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);
  const confirmDeleteRef = useRef<HTMLButtonElement | null>(null);
  const confirmationRef = useRef<HTMLElement | null>(null);
  const focusAfterCloseRef = useRef<'trigger' | 'create' | null>(null);
  const actionsDisabled = busy || deleting || exportingSlotId !== null;
  const backgroundDisabled = actionsDisabled || pendingDeletion !== null;

  useEffect(() => {
    if (pendingDeletion) {
      if (deleting) confirmationRef.current?.focus();
      else cancelDeleteRef.current?.focus();
      return;
    }
    if (focusAfterCloseRef.current === 'trigger') deletionTriggerRef.current?.focus();
    if (focusAfterCloseRef.current === 'create') createCareerRef.current?.focus();
    focusAfterCloseRef.current = null;
  }, [deleting, pendingDeletion]);

  const openDeletion = (deletion: PendingDeletion, trigger: HTMLButtonElement) => {
    if (backgroundDisabled) return;
    deletionTriggerRef.current = trigger;
    setDeleteError(null);
    setPendingDeletion(deletion);
  };

  const cancelDeletion = () => {
    if (actionsDisabled) return;
    focusAfterCloseRef.current = 'trigger';
    setDeleteError(null);
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
    if (!first || !last) {
      event.preventDefault();
      confirmationRef.current?.focus();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const requestExport = async (slotId: string) => {
    if (!onExport || actionsDisabled) return;
    setExportError(null);
    setExportingSlotId(slotId);
    try {
      await onExport(slotId);
    } catch {
      setExportError('导出失败，请稍后重试。');
    } finally {
      setExportingSlotId(null);
    }
  };

  const copySeed = async (seed: number) => {
    setCopyError(null);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard unavailable');
      }
      await navigator.clipboard.writeText(String(seed));
    } catch {
      setCopyError('复制失败，请手动选择种子文本。');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeletion || actionsDisabled) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(pendingDeletion.slotId);
      focusAfterCloseRef.current = 'create';
      setPendingDeletion(null);
    } catch {
      setDeleteError('删除失败，请稍后重试。');
    } finally {
      setDeleting(false);
    }
  };

  const renderRecord = (record: CareerSlotRecord) => {
    if (record.status === 'loaded') {
      return (
        <LoadedSaveCard
          key={record.slotId}
          summary={summaryFor(record, academyNames)}
          disabled={backgroundDisabled}
          onContinue={onContinue}
          onExport={onExport ? () => void requestExport(record.slotId) : undefined}
          onCopySeed={(seed) => void copySeed(seed)}
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
      );
    }
    if (record.status === 'archived') {
      return (
        <ArchivedSaveCard
          key={record.slotId}
          record={record}
          disabled={backgroundDisabled}
          onContinue={onContinue}
          onExport={onExport ? () => void requestExport(record.slotId) : undefined}
          onDelete={(event) =>
            openDeletion(
              {
                slotId: record.slotId,
                detail: `${record.archive.player.identity.name} · 历史生涯`,
              },
              event.currentTarget,
            )
          }
        />
      );
    }
    return (
      <DamagedSaveCard
        key={record.slotId}
        record={record}
        disabled={backgroundDisabled}
        onExport={onExport ? () => void requestExport(record.slotId) : undefined}
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
    );
  };
  const activeRecords = records.filter(
    (record): record is LoadedCareerSlot =>
      record.status === 'loaded' && !summaryFor(record, academyNames).terminal,
  );
  const historicalRecords = records.filter(
    (record) =>
      record.status === 'archived' ||
      (record.status === 'loaded' && summaryFor(record, academyNames).terminal),
  );
  const damagedRecords = records.filter(
    (record): record is Extract<CareerSlotRecord, { status: 'invalid' }> =>
      record.status === 'invalid',
  );
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
          disabled={backgroundDisabled}
          ref={createCareerRef}
        >
          创建新生涯
        </button>
      </header>

      {exportError && (
        <p className="career-save-export-error" role="alert">
          {exportError}
        </p>
      )}
      {copyError && (
        <p className="career-save-copy-error" role="alert">
          {copyError}
        </p>
      )}

      {records.length === 0 ? (
        <p className="career-save-empty">还没有可继续的生涯档案。</p>
      ) : (
        <div className="career-save-groups">
          {activeRecords.length > 0 && (
            <section className="career-save-group" aria-label="进行中的生涯">
              <h3>进行中的生涯</h3>
              <div className="career-save-list">{activeRecords.map(renderRecord)}</div>
            </section>
          )}
          {historicalRecords.length > 0 && (
            <section className="career-save-group" aria-label="历史生涯">
              <h3>历史生涯</h3>
              <div className="career-save-list">{historicalRecords.map(renderRecord)}</div>
            </section>
          )}
          {damagedRecords.length > 0 && (
            <section className="career-save-group" aria-label="损坏档案">
              <h3>损坏档案</h3>
              <div className="career-save-list">{damagedRecords.map(renderRecord)}</div>
            </section>
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
          ref={confirmationRef}
          tabIndex={-1}
        >
          <h3>删除生涯确认</h3>
          <p>确定要删除{pendingDeletion.detail}吗？此操作无法撤销。</p>
          {deleteError && (
            <p className="career-save-delete-error" role="alert">
              {deleteError}
            </p>
          )}
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
              {deleteError ? '重试删除' : '确认删除'}
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
  onExport: (() => void) | undefined;
  onCopySeed(seed: number): void;
  onDelete(event: MouseEvent<HTMLButtonElement>): void;
}

const LoadedSaveCard = ({
  summary,
  disabled,
  onContinue,
  onExport,
  onCopySeed,
  onDelete,
}: LoadedSaveCardProps) => (
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
      <div>
        <dt>世界种子</dt>
        <dd className="career-save-seed">
          <code>{summary.seed}</code>
          <button
            className="secondary-action"
            type="button"
            onClick={() => onCopySeed(summary.seed)}
            disabled={disabled}
            aria-label={'复制' + summary.playerName + '的世界种子'}
          >
            复制
          </button>
        </dd>
      </div>
      <div>
        <dt>复现版本</dt>
        <dd>
          {summary.mechanicsVersion} / {summary.contentVersion}
        </dd>
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
      {onExport && (
        <button
          className="secondary-action"
          type="button"
          onClick={onExport}
          disabled={disabled}
          aria-label={`导出${summary.playerName}的备份`}
        >
          导出备份
        </button>
      )}
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

interface ArchivedSaveCardProps {
  record: LoadedCareerArchiveSlot;
  disabled: boolean;
  onContinue(slotId: string): void;
  onExport: (() => void) | undefined;
  onDelete(event: MouseEvent<HTMLButtonElement>): void;
}

const ArchivedSaveCard = ({
  record,
  disabled,
  onContinue,
  onExport,
  onDelete,
}: ArchivedSaveCardProps) => {
  const playerName = record.archive.player.identity.name;
  return (
    <article className="career-save-card career-save-card--archive">
      <div className="career-save-card-heading">
        <div>
          <span className="career-save-phase">历史生涯</span>
          <h3>{playerName}</h3>
        </div>
        <span className="career-save-age">{record.archive.player.age} 岁</span>
      </div>
      <dl className="career-save-facts">
        <div>
          <dt>生涯结局</dt>
          <dd>{record.archive.review.ending.label}</dd>
        </div>
        <div>
          <dt>结束日期</dt>
          <dd>{record.archive.careerEnd.endedOn}</dd>
        </div>
        <div>
          <dt>最后保存</dt>
          <dd>{record.savedAt}</dd>
        </div>
      </dl>
      <div className="career-save-actions">
        <button
          className="primary-action"
          type="button"
          onClick={() => onContinue(record.slotId)}
          disabled={disabled}
          aria-label={`查看${playerName}的回顾`}
        >
          查看回顾
        </button>
        {onExport && (
          <button
            className="secondary-action"
            type="button"
            onClick={onExport}
            disabled={disabled}
            aria-label={`导出${playerName}的历史档案`}
          >
            导出备份
          </button>
        )}
        <button
          className="secondary-action"
          type="button"
          onClick={onDelete}
          disabled={disabled}
          aria-label={`删除${playerName}的历史档案`}
        >
          删除
        </button>
      </div>
    </article>
  );
};

interface DamagedSaveCardProps {
  record: Extract<CareerSlotRecord, { status: 'invalid' }>;
  disabled: boolean;
  onExport: (() => void) | undefined;
  onDelete(event: MouseEvent<HTMLButtonElement>): void;
}

const DamagedSaveCard = ({ record, disabled, onExport, onDelete }: DamagedSaveCardProps) => (
  <article className="career-save-card career-save-card--damaged">
    <span className="career-save-phase">无法读取</span>
    <h3>无法读取此生涯档案</h3>
    <p>{record.reason}</p>
    <p className="career-save-saved-at">最后保存：{savedAtLabel(record.savedAt)}</p>
    <div className="career-save-actions">
      {onExport && (
        <button
          className="secondary-action"
          type="button"
          onClick={onExport}
          disabled={disabled}
          aria-label="导出原始档案"
        >
          导出原始档案
        </button>
      )}
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
