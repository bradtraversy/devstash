import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getItemById,
  deleteItem,
  updateItem,
  createItem,
  getItemsByCollection,
  UnknownCollectionError,
} from './items';

// Mock Prisma client
vi.mock('@/lib/prisma', () => {
  const prisma = {
    item: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    itemType: {
      findFirst: vi.fn(),
    },
    collection: {
      findMany: vi.fn(),
    },
    itemCollection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // Interactive transactions run the callback against the same mocked client.
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  return { prisma };
});

import { prisma } from '@/lib/prisma';

const mockFindUnique = vi.mocked(prisma.item.findUnique);
const mockDelete = vi.mocked(prisma.item.delete);

const mockDate = new Date('2025-06-15T12:00:00Z');

const basePrismaItem = {
  id: 'item-1',
  title: 'useAuth Hook',
  description: 'Custom authentication hook',
  content: 'import { useContext } from "react"',
  url: null,
  language: 'typescript',
  contentType: 'TEXT' as const,
  isFavorite: true,
  isPinned: false,
  userId: 'user-1',
  itemTypeId: 'type-1',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  createdAt: mockDate,
  updatedAt: mockDate,
  itemType: {
    id: 'type-1',
    name: 'snippet',
    icon: 'Code',
    color: '#3b82f6',
    isSystem: true,
    userId: null,
  },
  tags: [
    { id: 'tag-1', name: 'react' },
    { id: 'tag-2', name: 'hooks' },
  ],
  collections: [
    {
      itemId: 'item-1',
      collectionId: 'col-1',
      addedAt: mockDate,
      collection: { id: 'col-1', name: 'React Patterns' },
    },
  ],
};

describe('getItemById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped item detail when item exists and belongs to user', async () => {
    mockFindUnique.mockResolvedValue(basePrismaItem as never);

    const result = await getItemById('user-1', 'item-1');

    expect(result).toEqual({
      id: 'item-1',
      title: 'useAuth Hook',
      description: 'Custom authentication hook',
      content: 'import { useContext } from "react"',
      url: null,
      language: 'typescript',
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: true,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['react', 'hooks'],
      collections: [{ id: 'col-1', name: 'React Patterns' }],
      createdAt: mockDate,
      updatedAt: mockDate,
    });
  });

  it('returns null when item does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await getItemById('user-1', 'nonexistent');

    expect(result).toBeNull();
  });

  it('returns null when item belongs to a different user', async () => {
    mockFindUnique.mockResolvedValue(basePrismaItem as never);

    const result = await getItemById('other-user', 'item-1');

    expect(result).toBeNull();
  });

  it('maps empty tags and collections correctly', async () => {
    mockFindUnique.mockResolvedValue({
      ...basePrismaItem,
      tags: [],
      collections: [],
    } as never);

    const result = await getItemById('user-1', 'item-1');

    expect(result?.tags).toEqual([]);
    expect(result?.collections).toEqual([]);
  });

  it('maps multiple collections correctly', async () => {
    mockFindUnique.mockResolvedValue({
      ...basePrismaItem,
      collections: [
        {
          itemId: 'item-1',
          collectionId: 'col-1',
          addedAt: mockDate,
          collection: { id: 'col-1', name: 'React Patterns' },
        },
        {
          itemId: 'item-1',
          collectionId: 'col-2',
          addedAt: mockDate,
          collection: { id: 'col-2', name: 'Interview Prep' },
        },
      ],
    } as never);

    const result = await getItemById('user-1', 'item-1');

    expect(result?.collections).toEqual([
      { id: 'col-1', name: 'React Patterns' },
      { id: 'col-2', name: 'Interview Prep' },
    ]);
  });

  it('calls prisma with correct arguments', async () => {
    mockFindUnique.mockResolvedValue(basePrismaItem as never);

    await getItemById('user-1', 'item-1');

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      include: {
        itemType: true,
        tags: true,
        collections: {
          include: {
            collection: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  });
});

describe('deleteItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when item does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await deleteItem('user-1', 'nonexistent');

    expect(result).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('returns false when item belongs to different user', async () => {
    mockFindUnique.mockResolvedValue({ userId: 'other-user' } as never);

    const result = await deleteItem('user-1', 'item-1');

    expect(result).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes item and returns true when user owns item', async () => {
    mockFindUnique.mockResolvedValue({ userId: 'user-1' } as never);
    mockDelete.mockResolvedValue({} as never);

    const result = await deleteItem('user-1', 'item-1');

    expect(result).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
  });
});

const mockItemUpdate = vi.mocked(prisma.item.update);
const mockItemCreate = vi.mocked(prisma.item.create);
const mockItemTypeFindFirst = vi.mocked(prisma.itemType.findFirst);
const mockCollectionFindMany = vi.mocked(prisma.collection.findMany);
const mockMembershipFindMany = vi.mocked(prisma.itemCollection.findMany);
const mockMembershipFindFirst = vi.mocked(prisma.itemCollection.findFirst);
const mockMembershipCount = vi.mocked(prisma.itemCollection.count);
const mockMembershipDeleteMany = vi.mocked(prisma.itemCollection.deleteMany);
const mockMembershipCreateMany = vi.mocked(prisma.itemCollection.createMany);
const mockTransaction = vi.mocked(prisma.$transaction);

const updatePayload = {
  title: 'Renamed',
  description: null,
  content: 'code',
  url: null,
  language: 'typescript',
  tags: [],
};

const updatedRow = {
  ...basePrismaItem,
  title: 'Renamed',
  tags: [],
  collections: [],
};

describe('updateItem collection membership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
    mockFindUnique.mockResolvedValue({ userId: 'user-1' } as never);
    mockItemUpdate.mockResolvedValue(updatedRow as never);
    mockMembershipFindFirst.mockResolvedValue(null);
  });

  it('refuses to attach a collection the caller does not own', async () => {
    mockCollectionFindMany.mockResolvedValue([{ id: 'mine' }] as never);

    await expect(
      updateItem('user-1', 'item-1', { ...updatePayload, collectionIds: ['mine', 'victims'] })
    ).rejects.toBeInstanceOf(UnknownCollectionError);
    expect(mockCollectionFindMany).toHaveBeenCalledWith({
      where: { id: { in: ['mine', 'victims'] }, userId: 'user-1' },
      select: { id: true },
    });
    expect(mockMembershipDeleteMany).not.toHaveBeenCalled();
    expect(mockMembershipCreateMany).not.toHaveBeenCalled();
    expect(mockItemUpdate).not.toHaveBeenCalled();
  });

  it('diffs memberships inside one transaction instead of rewriting them', async () => {
    mockCollectionFindMany.mockResolvedValue([{ id: 'b' }, { id: 'c' }] as never);
    mockMembershipFindMany.mockResolvedValue([{ collectionId: 'a' }, { collectionId: 'b' }] as never);

    const result = await updateItem('user-1', 'item-1', { ...updatePayload, collectionIds: ['b', 'c'] });

    expect(result?.title).toBe('Renamed');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockMembershipDeleteMany).toHaveBeenCalledWith({
      where: { itemId: 'item-1', collectionId: { in: ['a'] } },
    });
    expect(mockMembershipCreateMany).toHaveBeenCalledWith({
      data: [{ itemId: 'item-1', collectionId: 'c', position: 0 }],
      skipDuplicates: true,
    });
  });

  it('appends a new membership after the last position in that collection', async () => {
    mockCollectionFindMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }] as never);
    mockMembershipFindMany.mockResolvedValue([{ collectionId: 'a' }] as never);
    mockMembershipFindFirst.mockResolvedValue({ position: 4 } as never);

    await updateItem('user-1', 'item-1', { ...updatePayload, collectionIds: ['a', 'b'] });

    expect(mockMembershipFindFirst).toHaveBeenCalledWith({
      where: { collectionId: 'b' },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    expect(mockMembershipCreateMany).toHaveBeenCalledWith({
      data: [{ itemId: 'item-1', collectionId: 'b', position: 5 }],
      skipDuplicates: true,
    });
  });

  it('leaves memberships untouched when the set is unchanged', async () => {
    mockCollectionFindMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }] as never);
    mockMembershipFindMany.mockResolvedValue([{ collectionId: 'a' }, { collectionId: 'b' }] as never);

    await updateItem('user-1', 'item-1', { ...updatePayload, collectionIds: ['b', 'a'] });

    expect(mockMembershipDeleteMany).not.toHaveBeenCalled();
    expect(mockMembershipCreateMany).not.toHaveBeenCalled();
    expect(mockItemUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not touch memberships when collectionIds is omitted', async () => {
    await updateItem('user-1', 'item-1', updatePayload);

    expect(mockCollectionFindMany).not.toHaveBeenCalled();
    expect(mockMembershipFindMany).not.toHaveBeenCalled();
    expect(mockItemUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('createItem collection membership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
    mockItemTypeFindFirst.mockResolvedValue({ id: 'type-1', name: 'snippet' } as never);
    mockItemCreate.mockResolvedValue({ ...basePrismaItem, tags: [], collections: [] } as never);
    mockMembershipFindFirst.mockResolvedValue(null);
  });

  const payload = {
    typeName: 'snippet' as const,
    title: 'New',
    description: null,
    content: 'code',
    url: null,
    language: 'typescript',
    tags: [],
  };

  it('refuses to create into a collection the caller does not own', async () => {
    mockCollectionFindMany.mockResolvedValue([] as never);

    await expect(createItem('user-1', { ...payload, collectionIds: ['victims'] })).rejects.toBeInstanceOf(
      UnknownCollectionError
    );
    expect(mockItemCreate).not.toHaveBeenCalled();
  });

  it('attaches only verified collections and dedupes the list', async () => {
    mockCollectionFindMany.mockResolvedValue([{ id: 'mine' }] as never);

    await createItem('user-1', { ...payload, collectionIds: ['mine', 'mine'] });

    expect(mockCollectionFindMany).toHaveBeenCalledWith({
      where: { id: { in: ['mine'] }, userId: 'user-1' },
      select: { id: true },
    });
    expect(mockItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ collections: { create: [{ collectionId: 'mine', position: 0 }] } }),
      })
    );
  });

  it('resolves collections, reads positions, and inserts on the transaction client', async () => {
    // A distinct tx client proves the reads and the insert all run inside the transaction.
    const tx = {
      collection: { findMany: vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]) },
      itemCollection: {
        findFirst: vi.fn().mockResolvedValueOnce({ position: 2 }).mockResolvedValueOnce(null),
      },
      item: { create: vi.fn().mockResolvedValue({ ...basePrismaItem, tags: [], collections: [] }) },
    };
    mockTransaction.mockImplementation((async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)) as never);

    await createItem('user-1', { ...payload, collectionIds: ['a', 'b'] });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockCollectionFindMany).not.toHaveBeenCalled();
    expect(mockMembershipFindFirst).not.toHaveBeenCalled();
    expect(mockItemCreate).not.toHaveBeenCalled();
    expect(tx.itemCollection.findFirst).toHaveBeenCalledTimes(2);
    expect(tx.item.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          collections: {
            create: [
              { collectionId: 'a', position: 3 },
              { collectionId: 'b', position: 0 },
            ],
          },
        }),
      })
    );
  });

  it('leaves collections undefined when none are given', async () => {
    await createItem('user-1', payload);

    expect(mockMembershipFindFirst).not.toHaveBeenCalled();
    expect(mockItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ collections: undefined }) })
    );
  });
});

describe('getItemsByCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMembershipFindMany.mockResolvedValue([
      { itemId: 'item-1', collectionId: 'col-1', position: 0, addedAt: mockDate, item: basePrismaItem },
    ] as never);
    mockMembershipCount.mockResolvedValue(1);
  });

  it('reads memberships in position order and maps the items', async () => {
    const result = await getItemsByCollection('user-1', 'col-1');

    expect(mockMembershipFindMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-1', item: { userId: 'user-1' } },
      orderBy: [{ position: 'asc' }, { addedAt: 'asc' }, { itemId: 'asc' }],
      skip: 0,
      take: 21,
      include: { item: { include: { itemType: true, tags: true } } },
    });
    expect(mockMembershipCount).toHaveBeenCalledWith({
      where: { collectionId: 'col-1', item: { userId: 'user-1' } },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: 'item-1', title: 'useAuth Hook', tags: ['react', 'hooks'] });
    expect(result.totalCount).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
  });

  it('paginates through the join table', async () => {
    mockMembershipCount.mockResolvedValue(45);

    const result = await getItemsByCollection('user-1', 'col-1', 3, 20);

    expect(mockMembershipFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20 }));
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(3);
  });
});
