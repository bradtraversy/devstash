import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getItemById, deleteItem, updateItem, createItem } from './items';

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
  });

  it('refuses to attach a collection the caller does not own', async () => {
    mockCollectionFindMany.mockResolvedValue([{ id: 'mine' }] as never);

    const result = await updateItem('user-1', 'item-1', { ...updatePayload, collectionIds: ['mine', 'victims'] });

    expect(result).toBeNull();
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
      data: [{ itemId: 'item-1', collectionId: 'c' }],
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
    mockItemTypeFindFirst.mockResolvedValue({ id: 'type-1', name: 'snippet' } as never);
    mockItemCreate.mockResolvedValue({ ...basePrismaItem, tags: [], collections: [] } as never);
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

    const result = await createItem('user-1', { ...payload, collectionIds: ['victims'] });

    expect(result).toBeNull();
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
        data: expect.objectContaining({ collections: { create: [{ collectionId: 'mine' }] } }),
      })
    );
  });
});
