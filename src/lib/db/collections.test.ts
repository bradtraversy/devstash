import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCollectionById,
  updateCollection,
  deleteCollection,
  createCollection,
  setCollectionVisibility,
  moveCollectionItem,
  getSharedCollections,
} from './collections';
import { SHORT_ID_PATTERN } from '@/lib/short-id';
import { COLLECTION_ITEM_ORDER } from '@/lib/db/items';

// Mock Prisma client
vi.mock('@/lib/prisma', () => {
  const prisma = {
    collection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    collectionSlugHistory: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    itemCollection: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // Interactive transactions run the callback against the same mocked client.
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  return { prisma };
});

vi.mock('@/lib/db/users', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/db/users')>()),
  ensureUserHandle: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { ensureUserHandle } from '@/lib/db/users';

const mockFindFirst = vi.mocked(prisma.collection.findFirst);
const mockUpdate = vi.mocked(prisma.collection.update);
const mockUpdateMany = vi.mocked(prisma.collection.updateMany);
const mockDelete = vi.mocked(prisma.collection.delete);
const mockHistoryDeleteMany = vi.mocked(prisma.collectionSlugHistory.deleteMany);
const mockHistoryUpsert = vi.mocked(prisma.collectionSlugHistory.upsert);
const mockMembershipFindMany = vi.mocked(prisma.itemCollection.findMany);
const mockMembershipUpdate = vi.mocked(prisma.itemCollection.update);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockEnsureUserHandle = vi.mocked(ensureUserHandle);

const mockDate = new Date('2025-06-15T12:00:00Z');

const basePrismaCollection = {
  id: 'col-1',
  name: 'React Patterns',
  slug: 'react-patterns',
  shortId: 'abc12345',
  visibility: 'PRIVATE' as const,
  publishedAt: null,
  description: 'Useful React patterns and hooks',
  isFavorite: true,
  userId: 'user-1',
  defaultTypeId: null,
  createdAt: mockDate,
  updatedAt: mockDate,
  user: { handle: 'brad' },
  _count: { items: 3 },
  items: [
    {
      item: {
        itemType: { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6' },
      },
    },
    {
      item: {
        itemType: { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6' },
      },
    },
    {
      item: {
        itemType: { id: 'type-2', name: 'note', icon: 'StickyNote', color: '#fde047' },
      },
    },
  ],
};

function runOnSameClient() {
  mockTransaction.mockImplementation((async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)) as never);
}

describe('getCollectionById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped collection detail when collection exists and belongs to user', async () => {
    mockFindFirst.mockResolvedValue(basePrismaCollection as never);

    const result = await getCollectionById('col-1', 'user-1');

    expect(result).toEqual({
      id: 'col-1',
      name: 'React Patterns',
      slug: 'react-patterns',
      shortId: 'abc12345',
      visibility: 'PRIVATE',
      publishedAt: null,
      ownerHandle: 'brad',
      description: 'Useful React patterns and hooks',
      isFavorite: true,
      itemCount: 3,
      itemTypes: [
        { name: 'snippet', icon: 'Code', color: '#3b82f6', count: 2 },
        { name: 'note', icon: 'StickyNote', color: '#fde047', count: 1 },
      ],
      dominantColor: '#3b82f6',
      createdAt: mockDate,
      updatedAt: mockDate,
    });
  });

  it('returns null when collection does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getCollectionById('nonexistent', 'user-1');

    expect(result).toBeNull();
  });

  it('returns null dominantColor when collection has no items', async () => {
    mockFindFirst.mockResolvedValue({
      ...basePrismaCollection,
      _count: { items: 0 },
      items: [],
    } as never);

    const result = await getCollectionById('col-1', 'user-1');

    expect(result?.itemTypes).toEqual([]);
    expect(result?.dominantColor).toBeNull();
  });

  it('sorts item types by count descending', async () => {
    mockFindFirst.mockResolvedValue({
      ...basePrismaCollection,
      items: [
        { item: { itemType: { id: 'type-1', name: 'note', icon: 'StickyNote', color: '#fde047' } } },
        { item: { itemType: { id: 'type-2', name: 'snippet', icon: 'Code', color: '#3b82f6' } } },
        { item: { itemType: { id: 'type-2', name: 'snippet', icon: 'Code', color: '#3b82f6' } } },
        { item: { itemType: { id: 'type-2', name: 'snippet', icon: 'Code', color: '#3b82f6' } } },
      ],
    } as never);

    const result = await getCollectionById('col-1', 'user-1');

    expect(result?.itemTypes[0].name).toBe('snippet');
    expect(result?.itemTypes[0].count).toBe(3);
    expect(result?.itemTypes[1].name).toBe('note');
    expect(result?.itemTypes[1].count).toBe(1);
  });

  it('calls prisma with correct where clause including userId and reads the owner handle', async () => {
    mockFindFirst.mockResolvedValue(basePrismaCollection as never);

    await getCollectionById('col-1', 'user-1');

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'col-1', userId: 'user-1' },
        include: expect.objectContaining({ user: { select: { handle: true } } }),
      })
    );
  });
});

describe('updateCollection', () => {
  const mockUpdated = {
    id: 'col-1',
    name: 'Updated Name',
    slug: 'react-patterns',
    description: 'Updated description',
    isFavorite: false,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    runOnSameClient();
    mockFindFirst.mockResolvedValue({ slug: 'react-patterns' } as never);
    mockUpdate.mockResolvedValue(mockUpdated as never);
    mockHistoryDeleteMany.mockResolvedValue({ count: 0 } as never);
    mockHistoryUpsert.mockResolvedValue({} as never);
  });

  it('returns null when collection does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await updateCollection('col-1', 'user-1', {
      name: 'Updated Name',
      description: null,
    });

    expect(result).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns updated collection when successful', async () => {
    const result = await updateCollection('col-1', 'user-1', {
      name: 'Updated Name',
      description: 'Updated description',
    });

    expect(result).toEqual({
      id: 'col-1',
      name: 'Updated Name',
      slug: 'react-patterns',
      description: 'Updated description',
      isFavorite: false,
      createdAt: mockDate,
      updatedAt: mockDate,
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'col-1' },
      data: { name: 'Updated Name', description: 'Updated description' },
    });
  });

  it('verifies ownership before updating', async () => {
    mockFindFirst.mockResolvedValue(null);

    await updateCollection('col-1', 'user-1', {
      name: 'Test',
      description: null,
    });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 'col-1', userId: 'user-1' },
      select: { slug: true },
    });
  });

  it('writes no slug history when the slug is unchanged', async () => {
    await updateCollection('col-1', 'user-1', {
      name: 'Updated Name',
      description: null,
      slug: 'react-patterns',
    });

    expect(mockHistoryDeleteMany).not.toHaveBeenCalled();
    expect(mockHistoryUpsert).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'col-1' },
      data: { name: 'Updated Name', description: null },
    });
  });

  it('records the old slug and reclaims the new one when the slug changes', async () => {
    mockUpdate.mockResolvedValue({ ...mockUpdated, slug: 'hooks' } as never);

    const result = await updateCollection('col-1', 'user-1', {
      name: 'Updated Name',
      description: null,
      slug: 'hooks',
    });

    expect(result?.slug).toBe('hooks');
    expect(mockHistoryDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', oldSlug: 'hooks' },
    });
    expect(mockHistoryUpsert).toHaveBeenCalledWith({
      where: { userId_oldSlug: { userId: 'user-1', oldSlug: 'react-patterns' } },
      create: { userId: 'user-1', oldSlug: 'react-patterns', collectionId: 'col-1' },
      update: { collectionId: 'col-1', createdAt: expect.any(Date) },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'col-1' },
      data: { name: 'Updated Name', description: null, slug: 'hooks' },
    });
  });

  it('runs the ownership check, history writes, and update on the transaction client', async () => {
    const tx = {
      collection: {
        findFirst: vi.fn().mockResolvedValue({ slug: 'old' }),
        update: vi.fn().mockResolvedValue({ ...mockUpdated, slug: 'new' }),
      },
      collectionSlugHistory: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
    mockTransaction.mockImplementation((async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)) as never);

    await updateCollection('col-1', 'user-1', { name: 'Name', description: null, slug: 'new' });

    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockHistoryUpsert).not.toHaveBeenCalled();
    expect(tx.collection.findFirst).toHaveBeenCalledTimes(1);
    expect(tx.collectionSlugHistory.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.collectionSlugHistory.upsert).toHaveBeenCalledTimes(1);
    expect(tx.collection.update).toHaveBeenCalledTimes(1);
  });

  it('propagates a unique violation on the new slug', async () => {
    mockUpdate.mockRejectedValue({ code: 'P2002' });

    await expect(
      updateCollection('col-1', 'user-1', { name: 'Name', description: null, slug: 'taken' })
    ).rejects.toEqual({ code: 'P2002' });
  });
});

describe('deleteCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when collection does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await deleteCollection('col-1', 'user-1');

    expect(result).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('returns true when collection is deleted', async () => {
    mockFindFirst.mockResolvedValue({ id: 'col-1', userId: 'user-1' } as never);
    mockDelete.mockResolvedValue({ id: 'col-1' } as never);

    const result = await deleteCollection('col-1', 'user-1');

    expect(result).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: 'col-1' },
    });
  });

  it('verifies ownership before deleting', async () => {
    mockFindFirst.mockResolvedValue(null);

    await deleteCollection('col-1', 'user-1');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 'col-1', userId: 'user-1' },
    });
  });
});

describe('createCollection', () => {
  const mockFindMany = vi.mocked(prisma.collection.findMany);
  const mockCreate = vi.mocked(prisma.collection.create);

  beforeEach(() => {
    vi.clearAllMocks();
    runOnSameClient();
    mockFindMany.mockResolvedValue([] as never);
    mockCreate.mockImplementation((async (args: { data: Record<string, unknown> }) => ({
      ...basePrismaCollection,
      ...args.data,
    })) as never);
    mockHistoryDeleteMany.mockResolvedValue({ count: 0 } as never);
  });

  it('derives the slug from the name and assigns a short id', async () => {
    const result = await createCollection('user-1', { name: 'React Patterns', description: null });

    expect(result.name).toBe('React Patterns');
    expect(result.slug).toBe('react-patterns');
    expect(mockFindMany).toHaveBeenCalledWith({ where: { userId: 'user-1' }, select: { slug: true } });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'React Patterns',
        description: null,
        slug: 'react-patterns',
        shortId: expect.stringMatching(SHORT_ID_PATTERN),
      },
    });
  });

  it('suffixes the slug when the user already has it', async () => {
    mockFindMany.mockResolvedValue([{ slug: 'react-patterns' }, { slug: 'react-patterns-2' }] as never);

    await createCollection('user-1', { name: 'React Patterns', description: null });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: 'react-patterns-3' }),
    });
  });

  it('falls back to "collection" for a reserved name', async () => {
    await createCollection('user-1', { name: 'New', description: null });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: 'collection' }),
    });
  });

  it('reclaims the slug from history so a retired redirect does not shadow it', async () => {
    await createCollection('user-1', { name: 'React Patterns', description: null });

    expect(mockHistoryDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', oldSlug: 'react-patterns' },
    });
  });

  it('retries once with fresh values after a unique violation', async () => {
    mockCreate.mockRejectedValueOnce({ code: 'P2002' });

    const result = await createCollection('user-1', { name: 'React Patterns', description: null });

    expect(result.name).toBe('React Patterns');
    expect(mockCreate).toHaveBeenCalledTimes(2);
    const [first, second] = mockCreate.mock.calls.map((call) => (call[0] as { data: { shortId: string } }).data.shortId);
    expect(first).not.toBe(second);
  });

  it('rethrows other errors without retrying', async () => {
    mockCreate.mockRejectedValueOnce(new Error('connection lost'));

    await expect(createCollection('user-1', { name: 'React Patterns', description: null })).rejects.toThrow(
      'connection lost'
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe('setCollectionVisibility', () => {
  const publishedAt = new Date('2025-06-16T09:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    runOnSameClient();
    mockFindFirst.mockResolvedValue({ publishedAt: null } as never);
    mockUpdate.mockResolvedValue({ visibility: 'UNLISTED', publishedAt } as never);
    mockEnsureUserHandle.mockResolvedValue('brad');
    mockUserFindUnique.mockResolvedValue({ handle: 'brad' } as never);
  });

  it('returns null when the collection is not owned', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await setCollectionVisibility('col-1', 'user-1', 'PUBLIC');

    expect(result).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockEnsureUserHandle).not.toHaveBeenCalled();
  });

  it('stamps publishedAt and ensures a handle the first time the collection leaves private', async () => {
    const result = await setCollectionVisibility('col-1', 'user-1', 'UNLISTED');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'col-1' },
      data: { visibility: 'UNLISTED', publishedAt: expect.any(Date) },
      select: { visibility: true, publishedAt: true },
    });
    expect(mockEnsureUserHandle).toHaveBeenCalledWith(prisma, 'user-1');
    expect(result).toEqual({ visibility: 'UNLISTED', publishedAt, handle: 'brad' });
  });

  it('keeps the original publishedAt on later visibility changes', async () => {
    mockFindFirst.mockResolvedValue({ publishedAt } as never);
    mockUpdate.mockResolvedValue({ visibility: 'PUBLIC', publishedAt } as never);

    const result = await setCollectionVisibility('col-1', 'user-1', 'PUBLIC');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'col-1' },
      data: { visibility: 'PUBLIC' },
      select: { visibility: true, publishedAt: true },
    });
    expect(result?.publishedAt).toBe(publishedAt);
  });

  it('does not generate a handle when the collection goes private', async () => {
    mockFindFirst.mockResolvedValue({ publishedAt } as never);
    mockUpdate.mockResolvedValue({ visibility: 'PRIVATE', publishedAt } as never);
    mockUserFindUnique.mockResolvedValue({ handle: null } as never);

    const result = await setCollectionVisibility('col-1', 'user-1', 'PRIVATE');

    expect(mockEnsureUserHandle).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { visibility: 'PRIVATE' } })
    );
    expect(result).toEqual({ visibility: 'PRIVATE', publishedAt, handle: null });
  });

  it('runs the check, update, and handle generation on the transaction client', async () => {
    const tx = {
      collection: {
        findFirst: vi.fn().mockResolvedValue({ publishedAt: null }),
        update: vi.fn().mockResolvedValue({ visibility: 'PUBLIC', publishedAt }),
      },
      user: { findUnique: vi.fn() },
    };
    mockTransaction.mockImplementation((async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)) as never);

    await setCollectionVisibility('col-1', 'user-1', 'PUBLIC');

    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(tx.collection.findFirst).toHaveBeenCalledTimes(1);
    expect(tx.collection.update).toHaveBeenCalledTimes(1);
    expect(mockEnsureUserHandle).toHaveBeenCalledWith(tx, 'user-1');
  });

  it('retries the whole transaction once when the generated handle collides', async () => {
    mockEnsureUserHandle.mockRejectedValueOnce({ code: 'P2002' }).mockResolvedValueOnce('brad-2');

    const result = await setCollectionVisibility('col-1', 'user-1', 'PUBLIC');

    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(result?.handle).toBe('brad-2');
  });

  it('rethrows other errors without retrying', async () => {
    mockEnsureUserHandle.mockRejectedValueOnce(new Error('connection lost'));

    await expect(setCollectionVisibility('col-1', 'user-1', 'PUBLIC')).rejects.toThrow('connection lost');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });
});

describe('moveCollectionItem', () => {
  const addedAt = mockDate;

  function rows(...entries: [itemId: string, position: number][]) {
    return entries.map(([itemId, position]) => ({ itemId, position, addedAt }));
  }

  function positionWrites() {
    return mockMembershipUpdate.mock.calls.map((call) => {
      const args = call[0] as { where: { itemId_collectionId: { itemId: string } }; data: { position: number } };
      return [args.where.itemId_collectionId.itemId, args.data.position];
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    runOnSameClient();
    mockUpdateMany.mockResolvedValue({ count: 1 } as never);
    mockMembershipFindMany.mockResolvedValue(rows(['a', 0], ['b', 1], ['c', 2]) as never);
    mockMembershipUpdate.mockResolvedValue({} as never);
  });

  it('returns false without reading positions when the collection is not owned', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 } as never);

    const result = await moveCollectionItem('col-1', 'user-1', 'b', 'up');

    expect(result).toBe(false);
    expect(mockMembershipFindMany).not.toHaveBeenCalled();
    expect(mockMembershipUpdate).not.toHaveBeenCalled();
  });

  it('locks the collection row before reading positions, all on the transaction client', async () => {
    const tx = {
      collection: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      itemCollection: {
        findMany: vi.fn().mockResolvedValue(rows(['a', 0], ['b', 1])),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    mockTransaction.mockImplementation((async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)) as never);

    await moveCollectionItem('col-1', 'user-1', 'b', 'up');

    expect(tx.collection.updateMany).toHaveBeenCalledWith({
      where: { id: 'col-1', userId: 'user-1' },
      data: { updatedAt: expect.any(Date) },
    });
    expect(tx.collection.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.itemCollection.findMany.mock.invocationCallOrder[0]
    );
    expect(tx.itemCollection.findMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-1' },
      orderBy: COLLECTION_ITEM_ORDER,
      select: { itemId: true, position: true },
    });
    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(mockMembershipFindMany).not.toHaveBeenCalled();
    expect(mockMembershipUpdate).not.toHaveBeenCalled();
    expect(tx.itemCollection.update).toHaveBeenCalledTimes(2);
  });

  it('swaps with the previous item on up', async () => {
    const result = await moveCollectionItem('col-1', 'user-1', 'b', 'up');

    expect(result).toBe(true);
    expect(positionWrites()).toEqual([
      ['b', 0],
      ['a', 1],
    ]);
  });

  it('swaps with the next item on down', async () => {
    const result = await moveCollectionItem('col-1', 'user-1', 'b', 'down');

    expect(result).toBe(true);
    expect(positionWrites()).toEqual([
      ['c', 1],
      ['b', 2],
    ]);
  });

  it('is a no-op at the top and bottom', async () => {
    expect(await moveCollectionItem('col-1', 'user-1', 'a', 'up')).toBe(true);
    expect(await moveCollectionItem('col-1', 'user-1', 'c', 'down')).toBe(true);
    expect(mockMembershipUpdate).not.toHaveBeenCalled();
  });

  it('repairs gaps and ties while moving', async () => {
    mockMembershipFindMany.mockResolvedValue(rows(['a', 0], ['b', 5], ['c', 5], ['d', 9]) as never);

    await moveCollectionItem('col-1', 'user-1', 'c', 'up');

    expect(positionWrites()).toEqual([
      ['c', 1],
      ['b', 2],
      ['d', 3],
    ]);
  });

  it('returns false when the item is not in the collection', async () => {
    const result = await moveCollectionItem('col-1', 'user-1', 'missing', 'up');

    expect(result).toBe(false);
    expect(mockMembershipUpdate).not.toHaveBeenCalled();
  });
});

describe('getSharedCollections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks only for the owner\'s collections that are not private and flattens the count', async () => {
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      {
        id: 'col-1',
        name: 'DevOps',
        slug: 'devops',
        shortId: 'abc12345',
        visibility: 'PUBLIC',
        _count: { items: 3 },
      },
    ] as never);

    const result = await getSharedCollections('user-1');

    expect(prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', visibility: { not: 'PRIVATE' } },
        orderBy: { updatedAt: 'desc' },
      })
    );
    expect(result).toEqual([
      { id: 'col-1', name: 'DevOps', slug: 'devops', shortId: 'abc12345', visibility: 'PUBLIC', itemCount: 3 },
    ]);
  });
});
