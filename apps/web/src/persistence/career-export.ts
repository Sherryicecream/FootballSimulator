const SAFE_SLOT_ID = /[^a-zA-Z0-9_-]+/g;

const fileNameFor = (slotId: string): string => {
  const safeSlotId = slotId.replace(SAFE_SLOT_ID, '-').replace(/^-+|-+$/g, '') || 'slot';
  return `football-career-${safeSlotId}.json`;
};

/** Downloads raw persisted content without parsing or rewriting it. */
export const downloadCareerExport = (raw: string, slotId: string): void => {
  const blob = new Blob([raw], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileNameFor(slotId);
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};
