import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyWhenReady } from './clipboard';

class FakeClipboardItem {
  constructor(public items: Record<string, Promise<Blob>>) {}
}

function stubClipboard(clipboard: Partial<Clipboard>) {
  vi.stubGlobal('navigator', { clipboard });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copyWhenReady', () => {
  it('starts a ClipboardItem write before the text resolves', async () => {
    const write = vi.fn(async (items: FakeClipboardItem[]) => {
      const blob = await items[0].items['text/plain'];
      expect(await blob.text()).toBe('https://devstash.io/s/abc12345');
    });
    stubClipboard({ write } as unknown as Clipboard);
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);

    let resolve!: (value: string) => void;
    const pending = copyWhenReady(new Promise<string>((r) => (resolve = r)));

    expect(write).toHaveBeenCalledTimes(1);
    resolve('https://devstash.io/s/abc12345');
    await pending;
  });

  it('rejects without copying when the text rejects', async () => {
    const write = vi.fn(async (items: FakeClipboardItem[]) => {
      await items[0].items['text/plain'];
    });
    stubClipboard({ write } as unknown as Clipboard);
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);

    await expect(copyWhenReady(Promise.reject(new Error('not shared')))).rejects.toThrow('not shared');
  });

  it('copies nothing on the fallback path when the text rejects', async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard({ writeText } as unknown as Clipboard);
    vi.stubGlobal('ClipboardItem', undefined);

    await expect(copyWhenReady(Promise.reject(new Error('not shared')))).rejects.toThrow('not shared');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to writeText when ClipboardItem is missing', async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard({ writeText } as unknown as Clipboard);
    vi.stubGlobal('ClipboardItem', undefined);

    await copyWhenReady(Promise.resolve('hello'));

    expect(writeText).toHaveBeenCalledWith('hello');
  });
});
