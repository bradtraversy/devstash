import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const prisma = {
    item: { findFirst: vi.fn(), create: vi.fn() },
    collection: { findFirst: vi.fn() },
    itemType: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  return { prisma };
});

vi.mock('@/lib/db/items', () => ({
  COLLECTION_ITEM_ORDER: [{ position: 'asc' }],
  createItem: vi.fn(),
  freeShortId: vi.fn(),
}));

vi.mock('@/lib/db/collections', () => ({
  insertCollectionTx: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { createItem, freeShortId } from '@/lib/db/items';
import { insertCollectionTx } from '@/lib/db/collections';
import {
  copySharedCollection,
  copySharedItem,
  countCopyableItems,
  describeSharedCollection,
} from './save';

const mockItemFindFirst = vi.mocked(prisma.item.findFirst);
const mockItemCreate = vi.mocked(prisma.item.create);
const mockCollectionFindFirst = vi.mocked(prisma.collection.findFirst);
const mockItemTypeFindMany = vi.mocked(prisma.itemType.findMany);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockCreateItem = vi.mocked(createItem);
const mockFreeShortId = vi.mocked(freeShortId);
const mockInsertCollectionTx = vi.mocked(insertCollectionTx);

const sourceItem = {
  title: 'useAuth Hook',
  description: 'Reads the session',
  content: 'export function useAuth() {}',
  url: null,
  language: 'typescript',
  contentType: 'TEXT' as const,
  itemType: { name: 'snippet' },
  tags: [{ name: 'react' }, { name: 'auth' }],
};

const fileItem = {
  ...sourceItem,
  title: 'Notes',
  content: null,
  contentType: 'FILE' as const,
  itemType: { name: 'file' },
  tags: [],
};

describe('countCopyableItems', () => {
  it('counts text and link types only', () => {
    expect(countCopyableItems(['snippet', 'file', 'command', 'image', 'note', 'prompt', 'link'])).toBe(5);
    expect(countCopyableItems([])).toBe(0);
  });
});

describe('copySharedItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the source with the public page filter: shared, owner with a handle', async () => {
    mockItemFindFirst.mockResolvedValue(null);

    await copySharedItem('viewer', 'abc12345', true);

    expect(mockItemFindFirst.mock.calls[0][0]!.where).toEqual({
      shortId: 'abc12345',
      visibility: { not: 'PRIVATE' },
      user: { handle: { not: null } },
    });
  });

  it('reports the cap only after the source checks pass', async () => {
    mockItemFindFirst.mockResolvedValueOnce({ ...sourceItem, userId: 'viewer' } as never);
    expect(await copySharedItem('viewer', 'abc12345', false)).toEqual({ status: 'own' });

    mockItemFindFirst.mockResolvedValueOnce({ ...fileItem, userId: 'owner' } as never);
    expect(await copySharedItem('viewer', 'abc12345', false)).toEqual({ status: 'unsupported' });

    mockItemFindFirst.mockResolvedValueOnce({ ...sourceItem, userId: 'owner' } as never);
    expect(await copySharedItem('viewer', 'abc12345', false)).toEqual({ status: 'limit' });

    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('reports not-found, own, and unsupported without creating anything', async () => {
    mockItemFindFirst.mockResolvedValueOnce(null);
    expect(await copySharedItem('viewer', 'abc12345', true)).toEqual({ status: 'not-found' });

    mockItemFindFirst.mockResolvedValueOnce({ ...sourceItem, userId: 'viewer' } as never);
    expect(await copySharedItem('viewer', 'abc12345', true)).toEqual({ status: 'own' });

    mockItemFindFirst.mockResolvedValueOnce({ ...fileItem, userId: 'owner' } as never);
    expect(await copySharedItem('viewer', 'abc12345', true)).toEqual({ status: 'unsupported' });

    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('creates a private copy with the source fields and tags', async () => {
    mockItemFindFirst.mockResolvedValue({ ...sourceItem, userId: 'owner' } as never);
    mockCreateItem.mockResolvedValue({ id: 'copy-1', itemType: { name: 'snippet' } } as never);

    const result = await copySharedItem('viewer', 'abc12345', true);

    expect(mockCreateItem).toHaveBeenCalledWith('viewer', {
      typeName: 'snippet',
      title: 'useAuth Hook',
      description: 'Reads the session',
      content: 'export function useAuth() {}',
      url: null,
      language: 'typescript',
      tags: ['react', 'auth'],
    });
    expect(result).toEqual({ status: 'saved', itemId: 'copy-1', typeName: 'snippet' });
  });

  it('throws when the system type is missing instead of reporting a save', async () => {
    mockItemFindFirst.mockResolvedValue({ ...sourceItem, userId: 'owner' } as never);
    mockCreateItem.mockResolvedValue(null);

    await expect(copySharedItem('viewer', 'abc12345', true)).rejects.toThrow('snippet');
  });
});

describe('describeSharedCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for a collection that is not shared', async () => {
    mockCollectionFindFirst.mockResolvedValue(null);

    expect(await describeSharedCollection('brad', 'react-hooks')).toBeNull();
    expect(mockCollectionFindFirst.mock.calls[0][0]!.where).toEqual({
      slug: 'react-hooks',
      visibility: { not: 'PRIVATE' },
      user: { handle: 'brad' },
    });
  });

  it('returns the owner and counts only the items a save would copy', async () => {
    mockCollectionFindFirst.mockResolvedValue({
      userId: 'owner',
      items: [
        { item: { itemType: { name: 'snippet' } } },
        { item: { itemType: { name: 'file' } } },
        { item: { itemType: { name: 'link' } } },
      ],
    } as never);

    expect(await describeSharedCollection('brad', 'react-hooks')).toEqual({ ownerId: 'owner', copyable: 2 });
  });
});

describe('copySharedCollection', () => {
  const source = {
    userId: 'owner',
    name: 'React Hooks',
    description: 'Hooks I reuse',
    items: [
      { item: sourceItem },
      { item: fileItem },
      { item: { ...sourceItem, title: 'Install', content: 'npm i', language: null, itemType: { name: 'command' }, tags: [] } },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: unknown) =>
      (fn as (tx: typeof prisma) => Promise<unknown>)(prisma)
    );
    mockItemTypeFindMany.mockResolvedValue([
      { id: 'type-snippet', name: 'snippet' },
      { id: 'type-command', name: 'command' },
      { id: 'type-file', name: 'file' },
    ] as never);
    mockInsertCollectionTx.mockResolvedValue({ id: 'col-new' } as never);
    mockFreeShortId.mockResolvedValueOnce('short001').mockResolvedValueOnce('short002');
    mockItemCreate.mockResolvedValue({} as never);
  });

  it('reads the source with the shared filter in display order', async () => {
    mockCollectionFindFirst.mockResolvedValue(null);

    await copySharedCollection('viewer', 'brad', 'react-hooks');

    const args = mockCollectionFindFirst.mock.calls[0][0]!;
    expect(args.where).toEqual({ slug: 'react-hooks', visibility: { not: 'PRIVATE' }, user: { handle: 'brad' } });
    expect((args.select as { items: { orderBy: unknown } }).items.orderBy).toEqual([{ position: 'asc' }]);
  });

  it('reports not-found, own, and empty without writing', async () => {
    mockCollectionFindFirst.mockResolvedValueOnce(null);
    expect(await copySharedCollection('viewer', 'brad', 'react-hooks')).toEqual({ status: 'not-found' });

    mockCollectionFindFirst.mockResolvedValueOnce({ ...source, userId: 'viewer' } as never);
    expect(await copySharedCollection('viewer', 'brad', 'react-hooks')).toEqual({ status: 'own' });

    mockCollectionFindFirst.mockResolvedValueOnce({ ...source, items: [{ item: fileItem }] } as never);
    expect(await copySharedCollection('viewer', 'brad', 'react-hooks')).toEqual({ status: 'empty' });

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('copies the text items in order into a new collection and skips the files', async () => {
    mockCollectionFindFirst.mockResolvedValue(source as never);

    const result = await copySharedCollection('viewer', 'brad', 'react-hooks');

    expect(mockInsertCollectionTx).toHaveBeenCalledWith(prisma, 'viewer', {
      name: 'React Hooks',
      description: 'Hooks I reuse',
    });
    expect(mockItemCreate).toHaveBeenCalledTimes(2);

    const first = mockItemCreate.mock.calls[0][0].data;
    expect(first).toMatchObject({
      userId: 'viewer',
      itemTypeId: 'type-snippet',
      shortId: 'short001',
      title: 'useAuth Hook',
      content: 'export function useAuth() {}',
      language: 'typescript',
      contentType: 'TEXT',
      collections: { create: [{ collectionId: 'col-new', position: 0 }] },
    });
    expect(first.tags).toEqual({
      connectOrCreate: [
        { where: { name: 'react' }, create: { name: 'react' } },
        { where: { name: 'auth' }, create: { name: 'auth' } },
      ],
    });
    expect(first).not.toHaveProperty('visibility');
    expect(first).not.toHaveProperty('publishedAt');

    const second = mockItemCreate.mock.calls[1][0].data;
    expect(second).toMatchObject({
      itemTypeId: 'type-command',
      shortId: 'short002',
      title: 'Install',
      collections: { create: [{ collectionId: 'col-new', position: 1 }] },
    });

    expect(result).toEqual({ status: 'saved', collectionId: 'col-new', copied: 2, skipped: 1 });
  });

  it('retries the whole transaction once on a unique violation', async () => {
    mockCollectionFindFirst.mockResolvedValue(source as never);
    mockTransaction.mockRejectedValueOnce({ code: 'P2002' });
    mockFreeShortId.mockReset().mockResolvedValue('short009');

    const result = await copySharedCollection('viewer', 'brad', 'react-hooks');

    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ status: 'saved', collectionId: 'col-new', copied: 2, skipped: 1 });
  });

  it('rethrows other errors without retrying', async () => {
    mockCollectionFindFirst.mockResolvedValue(source as never);
    mockTransaction.mockRejectedValueOnce(new Error('connection lost'));

    await expect(copySharedCollection('viewer', 'brad', 'react-hooks')).rejects.toThrow('connection lost');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('fails when a system type is missing instead of copying with the wrong type', async () => {
    mockCollectionFindFirst.mockResolvedValue(source as never);
    mockItemTypeFindMany.mockResolvedValue([{ id: 'type-snippet', name: 'snippet' }] as never);

    await expect(copySharedCollection('viewer', 'brad', 'react-hooks')).rejects.toThrow('command');
  });
});
