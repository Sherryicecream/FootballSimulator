import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadCareerExport } from '../../src/persistence/career-export';

describe('downloadCareerExport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads the exact JSON content with a safe career filename', async () => {
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:career-export');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const appendLink = vi.spyOn(document.body, 'append');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadCareerExport('{"kind":"archive"}', 'damaged/slot');

    expect(createObjectUrl).toHaveBeenCalledOnce();
    const blob = createObjectUrl.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(await (blob as Blob).text()).toBe('{"kind":"archive"}');
    const clicked = appendLink.mock.calls[0]?.[0] as HTMLAnchorElement;
    expect(clicked.href).toBe('blob:career-export');
    expect(clicked.download).toBe('football-career-damaged-slot.json');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:career-export');
  });
});
