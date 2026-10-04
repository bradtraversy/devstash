import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getItemById,
  deleteItem,
  updateItem,
  createItem,
  getItemsByCollection,
  getSharedItems,
  getFavoriteItems,
  getHomeItems,
  getHomeCounts,
  setItemVisibility,
  UnknownCollectionError,
} from './items';

// Mock Prisma client
vi.mock('@/lib/prisma', () => {
  const prisma = {
    item: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    itemType: {
      findFirst: vi.fn(),
    },
    collection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
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
      collection: { id: 'col-1', name: 'React Patterns', visibility: 'PRIVATE' },
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
      collections: [{ id: 'col-1', name: 'React Patterns', visibility: 'PRIVATE' }],
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
          collection: { id: 'col-1', name: 'React Patterns', visibility: 'PRIVATE' },
        },
        {
          itemId: 'item-1',
          collectionId: 'col-2',
          addedAt: mockDate,
          collection: { id: 'col-2', name: 'Interview Prep', visibility: 'PRIVATE' },
        },
      ],
    } as never);

    const result = await getItemById('user-1', 'item-1');

    expect(result?.collections).toEqual([
      { id: 'col-1', name: 'React Patterns', visibility: 'PRIVATE' },
      { id: 'col-2', name: 'Interview Prep', visibility: 'PRIVATE' },
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
              select: { id: true, name: true, visibility: true },
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
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(null);
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
      collection: {
        findMany: vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]),
        findUnique: vi.fn().mockResolvedValue(null),
      },
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

describe('createItem short id and visibility', () => {
  const mockCollectionFindUnique = vi.mocked(prisma.collection.findUnique);
  const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
  const mockUserUpdate = vi.mocked(prisma.user.update);

  const payload = {
    typeName: 'snippet' as const,
    title: 'New',
    description: null,
    content: 'code',
    url: null,
    language: 'typescript',
    tags: [],
  };

  const createdData = () => vi.mocked(prisma.item.create).mock.calls.at(-1)![0].data;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: typeof prisma) => Promise<unknown>) =>
      fn(prisma)) as never);
    vi.mocked(prisma.itemType.findFirst).mockResolvedValue({ id: 'type-1', name: 'snippet' } as never);
    vi.mocked(prisma.item.create).mockResolvedValue({ ...basePrismaItem, tags: [], collections: [] } as never);
    vi.mocked(prisma.itemCollection.findFirst).mockResolvedValue(null);
    mockCollectionFindUnique.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({ handle: 'brad', email: 'brad@example.com' } as never);
  });

  it('creates a private item with an 8-character short id and no publish stamp', async () => {
    await createItem('user-1', payload);

    const data = createdData();
    expect(data.shortId).toMatch(/^[a-z0-9]{8}$/);
    expect(data.visibility).toBe('PRIVATE');
    expect(data.publishedAt).toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('checks the short id against collections and regenerates on a hit', async () => {
    mockCollectionFindUnique.mockResolvedValueOnce({ id: 'col-1' } as never).mockResolvedValueOnce(null);

    await createItem('user-1', payload);

    expect(mockCollectionFindUnique).toHaveBeenCalledTimes(2);
    const tried = mockCollectionFindUnique.mock.calls.map((call) => call[0].where.shortId);
    expect(tried[0]).not.toBe(tried[1]);
    expect(createdData().shortId).toBe(tried[1]);
  });

  it('stamps publishedAt and ensures the handle when created shared', async () => {
    await createItem('user-1', { ...payload, visibility: 'UNLISTED' });

    const data = createdData();
    expect(data.visibility).toBe('UNLISTED');
    expect(data.publishedAt).toBeInstanceOf(Date);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { handle: true, email: true },
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('retries the insert once on a unique violation', async () => {
    vi.mocked(prisma.item.create)
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({ ...basePrismaItem, tags: [], collections: [] } as never);

    const created = await createItem('user-1', payload);

    expect(created?.id).toBe('item-1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.item.create).toHaveBeenCalledTimes(2);
  });

  it('rethrows other errors without retrying', async () => {
    vi.mocked(prisma.item.create).mockRejectedValueOnce(new Error('down'));

    await expect(createItem('user-1', payload)).rejects.toThrow('down');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns the short id and visibility on the created item', async () => {
    vi.mocked(prisma.item.create).mockResolvedValue({
      ...basePrismaItem,
      shortId: 'k3j9x2ab',
      visibility: 'UNLISTED',
      tags: [],
      collections: [],
    } as never);

    const created = await createItem('user-1', { ...payload, visibility: 'UNLISTED' });

    expect(created?.shortId).toBe('k3j9x2ab');
    expect(created?.visibility).toBe('UNLISTED');
  });
});

describe('setItemVisibility', () => {
  const mockItemFindFirst = vi.mocked(prisma.item.findFirst);
  const mockItemUpdate = vi.mocked(prisma.item.update);
  const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
  const mockUserFindMany = vi.mocked(prisma.user.findMany);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: typeof prisma) => Promise<unknown>) =>
      fn(prisma)) as never);
    mockItemUpdate.mockResolvedValue({ visibility: 'UNLISTED', publishedAt: mockDate } as never);
    mockUserFindUnique.mockResolvedValue({ handle: 'brad', email: 'brad@example.com' } as never);
  });

  it('returns null without writing when the item is not the user\'s', async () => {
    mockItemFindFirst.mockResolvedValue(null);

    expect(await setItemVisibility('item-1', 'user-2', 'UNLISTED')).toBeNull();
    expect(mockItemFindFirst).toHaveBeenCalledWith({
      where: { id: 'item-1', userId: 'user-2' },
      select: { publishedAt: true },
    });
    expect(mockItemUpdate).not.toHaveBeenCalled();
  });

  it('stamps publishedAt on the first departure from private and ensures the handle', async () => {
    mockItemFindFirst.mockResolvedValue({ publishedAt: null } as never);

    const result = await setItemVisibility('item-1', 'user-1', 'UNLISTED');

    expect(mockItemUpdate).toHaveBeenCalledWith({
      where: { id: 'item-1', userId: 'user-1' },
      data: { visibility: 'UNLISTED', publishedAt: expect.any(Date) },
      select: { visibility: true, publishedAt: true },
    });
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { handle: true, email: true },
    });
    expect(result).toEqual({ visibility: 'UNLISTED', publishedAt: mockDate, handle: 'brad' });
  });

  it('keeps the original publishedAt on later changes', async () => {
    mockItemFindFirst.mockResolvedValue({ publishedAt: mockDate } as never);
    mockItemUpdate.mockResolvedValue({ visibility: 'PUBLIC', publishedAt: mockDate } as never);

    await setItemVisibility('item-1', 'user-1', 'PUBLIC');

    expect(mockItemUpdate.mock.calls[0][0].data).toEqual({ visibility: 'PUBLIC' });
  });

  it('reads the handle without generating one when going private', async () => {
    mockItemFindFirst.mockResolvedValue({ publishedAt: mockDate } as never);
    mockItemUpdate.mockResolvedValue({ visibility: 'PRIVATE', publishedAt: mockDate } as never);
    mockUserFindUnique.mockResolvedValue({ handle: null } as never);

    const result = await setItemVisibility('item-1', 'user-1', 'PRIVATE');

    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { id: 'user-1' }, select: { handle: true } });
    expect(mockUserFindMany).not.toHaveBeenCalled();
    expect(result).toEqual({ visibility: 'PRIVATE', publishedAt: mockDate, handle: null });
  });

  it('retries once when two first publishes generate the same handle', async () => {
    mockItemFindFirst.mockResolvedValue({ publishedAt: null } as never);
    mockUserFindUnique
      .mockResolvedValueOnce({ handle: null, email: 'brad@example.com' } as never)
      .mockResolvedValueOnce({ handle: 'brad', email: 'brad@example.com' } as never);
    mockUserFindMany.mockResolvedValue([] as never);
    vi.mocked(prisma.user.update).mockRejectedValueOnce({ code: 'P2002' });

    const result = await setItemVisibility('item-1', 'user-1', 'UNLISTED');

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(result?.handle).toBe('brad');
  });
});

describe('getSharedItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.item.count).mockResolvedValue(30);
  });

  it('pages through the owner\'s items that are not private, newest update first', async () => {
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);

    const result = await getSharedItems('user-1', 2, 25);

    const where = { userId: 'user-1', visibility: { not: 'PRIVATE' } };
    expect(prisma.item.findMany).toHaveBeenCalledWith({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      skip: 25,
      take: 25,
      include: { itemType: true, tags: true },
    });
    expect(prisma.item.count).toHaveBeenCalledWith({ where });
    expect(result).toMatchObject({ totalCount: 30, totalPages: 2, currentPage: 2 });
  });

  it('maps rows to list items with their visibility, short id, and language', async () => {
    vi.mocked(prisma.item.findMany).mockResolvedValue([
      { ...basePrismaItem, visibility: 'UNLISTED', shortId: 'abc12345' },
    ] as never);

    const { items } = await getSharedItems('user-1');

    expect(items[0]).toMatchObject({
      id: 'item-1',
      visibility: 'UNLISTED',
      shortId: 'abc12345',
      language: 'typescript',
      tags: ['react', 'hooks'],
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
    });
  });
});

describe('getFavoriteItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.item.count).mockResolvedValue(60);
  });

  it('pages through favorites, newest first by default', async () => {
    const result = await getFavoriteItems('user-1');

    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', isFavorite: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: 0,
        take: 25,
      })
    );
    expect(result).toMatchObject({ totalCount: 60, totalPages: 3, currentPage: 1 });
  });

  it('sorts on the server so the order covers every page', async () => {
    await getFavoriteItems('user-1', 'type', 3, 50);

    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ itemType: { name: 'asc' } }, { title: 'asc' }, { id: 'asc' }],
        skip: 100,
        take: 50,
      })
    );
  });

  it('orders by name both ways and by oldest', async () => {
    await getFavoriteItems('user-1', 'name-desc');
    await getFavoriteItems('user-1', 'date-asc');

    const orders = vi.mocked(prisma.item.findMany).mock.calls.map((call) => call[0]?.orderBy);
    expect(orders).toEqual([
      [{ title: 'desc' }, { id: 'asc' }],
      [{ updatedAt: 'asc' }, { id: 'asc' }],
    ]);
  });
});

describe('getHomeItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.item.findMany).mockResolvedValue([basePrismaItem] as never);
    vi.mocked(prisma.item.count).mockResolvedValue(45);
  });

  it('lists every item pinned first, then newest, one page at a time', async () => {
    const result = await getHomeItems('user-1', 'all', 2, 21);

    expect(prisma.item.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      skip: 21,
      take: 21,
      include: { itemType: true, tags: true },
    });
    expect(prisma.item.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(result).toMatchObject({ totalCount: 45, totalPages: 3, currentPage: 2 });
    expect(result.items[0]).toMatchObject({ id: 'item-1', title: 'useAuth Hook' });
  });

  it('narrows to shared items', async () => {
    await getHomeItems('user-1', 'shared');

    const where = { userId: 'user-1', visibility: { not: 'PRIVATE' } };
    expect(vi.mocked(prisma.item.findMany).mock.calls[0][0]).toMatchObject({ where, skip: 0 });
    expect(prisma.item.count).toHaveBeenCalledWith({ where });
  });

  it('narrows to pinned items', async () => {
    await getHomeItems('user-1', 'pinned');

    expect(vi.mocked(prisma.item.findMany).mock.calls[0][0]).toMatchObject({
      where: { userId: 'user-1', isPinned: true },
    });
  });
});

describe('getHomeCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts all, shared, and pinned items for the owner', async () => {
    vi.mocked(prisma.item.count).mockResolvedValueOnce(12).mockResolvedValueOnce(4).mockResolvedValueOnce(2);

    expect(await getHomeCounts('user-1')).toEqual({ total: 12, shared: 4, pinned: 2 });
    expect(prisma.item.count).toHaveBeenNthCalledWith(1, { where: { userId: 'user-1' } });
    expect(prisma.item.count).toHaveBeenNthCalledWith(2, { where: { userId: 'user-1', visibility: { not: 'PRIVATE' } } });
    expect(prisma.item.count).toHaveBeenNthCalledWith(3, { where: { userId: 'user-1', isPinned: true } });
  });
});
