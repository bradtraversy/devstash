import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicSharedItem } from '@/lib/db/public';

vi.mock('@/lib/db/public', () => ({ resolveShortLink: vi.fn() }));

import { resolveShortLink } from '@/lib/db/public';
import { GET } from './route';

const mockResolveShortLink = vi.mocked(resolveShortLink);

function get(shortId: string) {
  return GET(new Request(`https://devstash.io/s/${shortId}/raw`), {
    params: Promise.resolve({ shortId }),
  });
}

const item: PublicSharedItem = {
  id: 'item-1',
  title: 'Install',
  description: null,
  content: '$ npm install\n$ npm run dev',
  url: null,
  language: null,
  fileUrl: null,
  fileName: null,
  fileSize: null,
  itemType: { name: 'command', icon: 'Terminal', color: '#f97316' },
  shortId: 'abc12345',
  visibility: 'UNLISTED',
  publishedAt: new Date('2026-10-01T12:00:00Z'),
  updatedAt: new Date('2026-10-01T12:00:00Z'),
  handle: 'brad',
};

describe('GET /s/[shortId]/raw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders not found for a malformed id without querying', async () => {
    await expect(get('not-a-short-id')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mockResolveShortLink).not.toHaveBeenCalled();
  });

  it('redirects a case variant to the lowercase raw path before querying', async () => {
    const res = await get('ABC12345');

    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://devstash.io/s/abc12345/raw');
    expect(mockResolveShortLink).not.toHaveBeenCalled();
  });

  it('renders not found when the id is unknown or private', async () => {
    mockResolveShortLink.mockResolvedValue(null);

    await expect(get('abc12345')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mockResolveShortLink).toHaveBeenCalledWith('abc12345');
  });

  it('sends a collection short id to the collection raw route', async () => {
    mockResolveShortLink.mockResolvedValue({ kind: 'collection', handle: 'brad', slug: 'react-hooks' });

    const res = await get('abc12345');

    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://devstash.io/brad/react-hooks/raw');
  });

  it('returns a snippet as plain text', async () => {
    mockResolveShortLink.mockResolvedValue({
      kind: 'item',
      item: {
        ...item,
        content: 'const a = 1;\n',
        itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      },
    });

    const res = await get('abc12345');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await res.text()).toBe('const a = 1;\n');
  });

  it('strips the prompts from a command so the output can be piped', async () => {
    mockResolveShortLink.mockResolvedValue({ kind: 'item', item });

    const res = await get('abc12345');

    expect(await res.text()).toBe('npm install\nnpm run dev');
  });

  it('renders not found for links, images, and files', async () => {
    for (const name of ['link', 'image', 'file']) {
      mockResolveShortLink.mockResolvedValue({
        kind: 'item',
        item: { ...item, itemType: { name, icon: 'File', color: '#6b7280' } },
      });

      await expect(get('abc12345')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    }
  });
});
