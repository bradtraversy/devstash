import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPublicCollection,
  getPublicItem,
  resolveShortId,
  resolveShortLink,
  resolveSlugHistory,
  publicPathsForCollections,
  publicPathsForItem,
  publicPathsForUser,
  publicPathForOwnerSlug,
} from './public';
import { COLLECTION_ITEM_ORDER } from '@/lib/db/items';
import { PUBLIC_PAGE_ITEM_LIMIT } from '@/lib/constants/pagination';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    collection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    collectionSlugHistory: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    item: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const mockCollectionFindFirst = vi.mocked(prisma.collection.findFirst);
const mockCollectionFindMany = vi.mocked(prisma.collection.findMany);
const mockHistoryFindFirst = vi.mocked(prisma.collectionSlugHistory.findFirst);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockItemFindFirst = vi.mocked(prisma.item.findFirst);
const mockItemFindMany = vi.mocked(prisma.item.findMany);

const NOW = new Date('2026-09-28T12:00:00Z');

const prismaItem = {
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
};

const prismaCollection = {
  id: 'col-1',
  name: 'React Hooks',
  description: 'Hooks I reuse',
  slug: 'react-hooks',
  shortId: 'abc12345',
  visibility: 'PUBLIC' as const,
  publishedAt: NOW,
  updatedAt: NOW,
  user: { handle: 'brad' },
  _count: { items: 1 },
  items: [{ item: prismaItem }],
};

describe('getPublicCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters by handle, slug, and non-private visibility, in display order up to the limit', async () => {
    mockCollectionFindFirst.mockResolvedValue(prismaCollection as never);

    const result = await getPublicCollection('brad', 'react-hooks');

    const args = mockCollectionFindFirst.mock.calls[0][0]!;
    expect(args.where).toEqual({
      slug: 'react-hooks',
      visibility: { not: 'PRIVATE' },
      user: { handle: 'brad' },
    });
    const include = args.include as { items: { orderBy: unknown; take: number } };
    expect(include.items.orderBy).toBe(COLLECTION_ITEM_ORDER);
    expect(include.items.take).toBe(PUBLIC_PAGE_ITEM_LIMIT);

    expect(result).toEqual({
      id: 'col-1',
      name: 'React Hooks',
      description: 'Hooks I reuse',
      slug: 'react-hooks',
      shortId: 'abc12345',
      visibility: 'PUBLIC',
      publishedAt: NOW,
      updatedAt: NOW,
      contentUpdatedAt: NOW,
      handle: 'brad',
      itemCount: 1,
      items: [
        {
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
        },
      ],
    });
  });

  it('dates the content by the latest item change when that is newer than the collection row', async () => {
    const later = new Date('2026-10-02T08:00:00Z');
    mockCollectionFindFirst.mockResolvedValue({
      ...prismaCollection,
      items: [{ item: { ...prismaItem, updatedAt: NOW } }, { item: { ...prismaItem, id: 'item-2', updatedAt: later } }],
    } as never);

    const result = await getPublicCollection('brad', 'react-hooks');

    expect(result?.updatedAt).toEqual(NOW);
    expect(result?.contentUpdatedAt).toEqual(later);
  });

  it('returns null when nothing matches', async () => {
    mockCollectionFindFirst.mockResolvedValue(null);

    expect(await getPublicCollection('brad', 'missing')).toBeNull();
  });

  it('returns null when the owner has no handle', async () => {
    mockCollectionFindFirst.mockResolvedValue({ ...prismaCollection, user: { handle: null } } as never);

    expect(await getPublicCollection('brad', 'react-hooks')).toBeNull();
  });
});

describe('resolveShortId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the canonical target for a non-private collection', async () => {
    mockCollectionFindFirst.mockResolvedValue({ slug: 'react-hooks', user: { handle: 'brad' } } as never);

    const target = await resolveShortId('abc12345');

    expect(mockCollectionFindFirst.mock.calls[0][0]!.where).toEqual({
      shortId: 'abc12345',
      visibility: { not: 'PRIVATE' },
    });
    expect(target).toEqual({ handle: 'brad', slug: 'react-hooks' });
  });

  it('returns null for unknown, private, or handleless collections', async () => {
    mockCollectionFindFirst.mockResolvedValueOnce(null);
    expect(await resolveShortId('zzzzzzzz')).toBeNull();

    mockCollectionFindFirst.mockResolvedValueOnce({ slug: 'x', user: { handle: null } } as never);
    expect(await resolveShortId('abc12345')).toBeNull();
  });
});

describe('resolveSlugHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('follows a history row to a non-private collection', async () => {
    mockHistoryFindFirst.mockResolvedValue({
      collection: { slug: 'react-hooks', user: { handle: 'brad' } },
    } as never);

    const target = await resolveSlugHistory('brad', 'old-hooks');

    expect(mockHistoryFindFirst.mock.calls[0][0]!.where).toEqual({
      oldSlug: 'old-hooks',
      user: { handle: 'brad' },
      collection: { visibility: { not: 'PRIVATE' } },
    });
    expect(target).toEqual({ handle: 'brad', slug: 'react-hooks' });
  });

  it('returns null when no history row matches', async () => {
    mockHistoryFindFirst.mockResolvedValue(null);

    expect(await resolveSlugHistory('brad', 'never')).toBeNull();
  });
});

describe('public path lookups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionFindMany.mockResolvedValue([
      { slug: 'react-hooks', shortId: 'abc12345', user: { handle: 'brad' }, slugHistory: [{ oldSlug: 'hooks' }] },
      { slug: 'orphan', shortId: 'orphan01', user: { handle: null }, slugHistory: [{ oldSlug: 'lost' }] },
    ] as never);
    mockItemFindFirst.mockResolvedValue(null);
    mockItemFindMany.mockResolvedValue([]);
  });

  it('selects the live slug, the short id, the owner handle, and the retired slugs', async () => {
    await publicPathsForCollections(['col-1']);

    expect(mockCollectionFindMany.mock.calls[0][0]!.select).toEqual({
      slug: true,
      shortId: true,
      user: { select: { handle: true } },
      slugHistory: { select: { oldSlug: true } },
    });
  });

  it('publicPathsForCollections skips the query for an empty list', async () => {
    expect(await publicPathsForCollections([])).toEqual([]);
    expect(mockCollectionFindMany).not.toHaveBeenCalled();
  });

  it('publicPathsForCollections filters to the ids and non-private visibility', async () => {
    const paths = await publicPathsForCollections(['col-1', 'col-2']);

    expect(mockCollectionFindMany.mock.calls[0][0]!.where).toEqual({
      id: { in: ['col-1', 'col-2'] },
      visibility: { not: 'PRIVATE' },
    });
    expect(paths).toEqual(['/brad/react-hooks', '/brad/hooks', '/brad/react-hooks/og', '/s/abc12345']);
  });

  it('publicPathsForItem finds non-private collections holding the item', async () => {
    const paths = await publicPathsForItem('item-1');

    expect(mockCollectionFindMany.mock.calls[0][0]!.where).toEqual({
      visibility: { not: 'PRIVATE' },
      items: { some: { itemId: 'item-1' } },
    });
    expect(mockItemFindFirst.mock.calls[0][0]!.where).toEqual({
      id: 'item-1',
      visibility: { not: 'PRIVATE' },
    });
    expect(paths).toEqual(['/brad/react-hooks', '/brad/hooks', '/brad/react-hooks/og', '/s/abc12345']);
  });

  it('publicPathsForItem adds the item page when the item itself is shared', async () => {
    mockItemFindFirst.mockResolvedValue({ shortId: 'item0001' } as never);

    const paths = await publicPathsForItem('item-1');

    expect(paths).toEqual([
      '/s/item0001',
      '/s/item0001/og',
      '/s/item0001/image',
      '/brad/react-hooks',
      '/brad/hooks',
      '/brad/react-hooks/og',
      '/s/abc12345',
    ]);
  });

  it('publicPathsForUser finds the non-private collections and items of the owner', async () => {
    mockItemFindMany.mockResolvedValue([{ shortId: 'item0001' }, { shortId: 'item0002' }] as never);

    const paths = await publicPathsForUser('user-1');

    expect(mockCollectionFindMany.mock.calls[0][0]!.where).toEqual({
      userId: 'user-1',
      visibility: { not: 'PRIVATE' },
    });
    expect(mockItemFindMany.mock.calls[0][0]!.where).toEqual({
      userId: 'user-1',
      visibility: { not: 'PRIVATE' },
    });
    expect(paths).toEqual([
      '/brad/react-hooks',
      '/brad/hooks',
      '/brad/react-hooks/og',
      '/s/abc12345',
      '/s/item0001',
      '/s/item0001/og',
      '/s/item0001/image',
      '/s/item0002',
      '/s/item0002/og',
      '/s/item0002/image',
    ]);
  });
});

describe('getPublicItem', () => {
  const prismaSharedItem = {
    ...prismaItem,
    shortId: 'item0001',
    visibility: 'UNLISTED' as const,
    publishedAt: NOW,
    updatedAt: NOW,
    user: { handle: 'brad' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters by short id and non-private visibility and maps the shared item', async () => {
    mockItemFindFirst.mockResolvedValue(prismaSharedItem as never);

    const item = await getPublicItem('item0001');

    expect(mockItemFindFirst).toHaveBeenCalledWith({
      where: { shortId: 'item0001', visibility: { not: 'PRIVATE' } },
      include: {
        user: { select: { handle: true } },
        itemType: { select: { name: true, icon: true, color: true } },
      },
    });
    expect(item).toEqual({
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
      shortId: 'item0001',
      visibility: 'UNLISTED',
      publishedAt: NOW,
      updatedAt: NOW,
      handle: 'brad',
    });
  });

  it('returns null when nothing matches or the owner has no handle', async () => {
    mockItemFindFirst.mockResolvedValue(null);
    expect(await getPublicItem('item0001')).toBeNull();

    mockItemFindFirst.mockResolvedValue({ ...prismaSharedItem, user: { handle: null } } as never);
    expect(await getPublicItem('item0001')).toBeNull();
  });
});

describe('resolveShortLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the collection target when a collection holds the id', async () => {
    mockCollectionFindFirst.mockResolvedValue({ slug: 'react-hooks', user: { handle: 'brad' } } as never);
    mockItemFindFirst.mockResolvedValue(null);

    expect(await resolveShortLink('abc12345')).toEqual({
      kind: 'collection',
      handle: 'brad',
      slug: 'react-hooks',
    });
  });

  it('returns the item when no collection holds the id', async () => {
    mockCollectionFindFirst.mockResolvedValue(null);
    mockItemFindFirst.mockResolvedValue({
      ...prismaItem,
      shortId: 'item0001',
      visibility: 'PUBLIC',
      publishedAt: NOW,
      updatedAt: NOW,
      user: { handle: 'brad' },
    } as never);

    const target = await resolveShortLink('item0001');

    expect(target?.kind).toBe('item');
    expect(target?.kind === 'item' && target.item.shortId).toBe('item0001');
  });

  it('returns null when neither matches', async () => {
    mockCollectionFindFirst.mockResolvedValue(null);
    mockItemFindFirst.mockResolvedValue(null);

    expect(await resolveShortLink('zzzzzzzz')).toBeNull();
  });
});

describe('publicPathForOwnerSlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the owner path for the slug without a visibility filter', async () => {
    mockUserFindUnique.mockResolvedValue({ handle: 'brad' } as never);

    expect(await publicPathForOwnerSlug('user-1', 'react')).toEqual(['/brad/react']);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { handle: true },
    });
  });

  it('returns nothing for an owner without a handle', async () => {
    mockUserFindUnique.mockResolvedValue({ handle: null } as never);

    expect(await publicPathForOwnerSlug('user-1', 'react')).toEqual([]);
  });
});
