import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicSharedItem } from '@/lib/db/public';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  permanentRedirect: vi.fn((path: string) => {
    throw new Error(`PERMANENT_REDIRECT:${path}`);
  }),
}));

vi.mock('@/lib/db/public', () => ({ resolveShortLink: vi.fn() }));

vi.mock('@/components/public/public-item-view', () => ({
  default: ({ item }: { item: PublicSharedItem }) => <div data-item={item.id} />,
}));

import { resolveShortLink } from '@/lib/db/public';
import ShortLinkPage, { generateMetadata } from './page';

const mockResolveShortLink = vi.mocked(resolveShortLink);

const item: PublicSharedItem = {
  id: 'item-1',
  title: 'useAuth Hook',
  description: null,
  content: 'export function useAuth() {}',
  url: null,
  language: 'typescript',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
  shortId: 'abc12345',
  visibility: 'UNLISTED',
  publishedAt: new Date('2026-10-01T12:00:00Z'),
  updatedAt: new Date('2026-10-01T12:00:00Z'),
  handle: 'brad',
};

const params = (shortId: string) => ({ params: Promise.resolve({ shortId }) });

describe('/s/[shortId] page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders not found for a malformed id without querying', async () => {
    await expect(ShortLinkPage(params('not-a-short-id'))).rejects.toThrow('NOT_FOUND');
    expect(mockResolveShortLink).not.toHaveBeenCalled();
  });

  it('redirects a case variant to the lowercase path before querying', async () => {
    await expect(ShortLinkPage(params('ABC12345'))).rejects.toThrow('PERMANENT_REDIRECT:/s/abc12345');
    expect(mockResolveShortLink).not.toHaveBeenCalled();
  });

  it('renders not found when the id is unknown or private', async () => {
    mockResolveShortLink.mockResolvedValue(null);

    await expect(ShortLinkPage(params('abc12345'))).rejects.toThrow('NOT_FOUND');
    expect(mockResolveShortLink).toHaveBeenCalledWith('abc12345');
  });

  it('redirects a collection short id to its readable URL', async () => {
    mockResolveShortLink.mockResolvedValue({ kind: 'collection', handle: 'brad', slug: 'react-hooks' });

    await expect(ShortLinkPage(params('abc12345'))).rejects.toThrow('REDIRECT:/brad/react-hooks');
  });

  it('renders the item view for an item short id', async () => {
    mockResolveShortLink.mockResolvedValue({ kind: 'item', item });

    const element = await ShortLinkPage(params('abc12345'));

    expect(element.props.item).toEqual(item);
  });
});

describe('/s/[shortId] metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is empty for a malformed id, a collection, and an unknown id', async () => {
    expect(await generateMetadata(params('nope'))).toEqual({});

    mockResolveShortLink.mockResolvedValue({ kind: 'collection', handle: 'brad', slug: 'x' });
    expect(await generateMetadata(params('abc12345'))).toEqual({});

    mockResolveShortLink.mockResolvedValue(null);
    expect(await generateMetadata(params('abc12345'))).toEqual({});
  });

  it('describes a shared item at its canonical short path', async () => {
    mockResolveShortLink.mockResolvedValue({ kind: 'item', item });

    const metadata = await generateMetadata(params('abc12345'));

    expect(metadata.title).toBe('useAuth Hook by @brad | DevStash');
    expect(metadata.alternates).toEqual({ canonical: '/s/abc12345' });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
