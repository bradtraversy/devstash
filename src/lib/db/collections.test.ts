import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCollectionById, updateCollection, deleteCollection, createCollection } from './collections';
import { SHORT_ID_PATTERN } from '@/lib/short-id';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    collection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const mockFindFirst = vi.mocked(prisma.collection.findFirst);
const mockUpdate = vi.mocked(prisma.collection.update);
const mockDelete = vi.mocked(prisma.collection.delete);

const mockDate = new Date('2025-06-15T12:00:00Z');

const basePrismaCollection = {
  id: 'col-1',
  name: 'React Patterns',
  description: 'Useful React patterns and hooks',
  isFavorite: true,
  userId: 'user-1',
  defaultTypeId: null,
  createdAt: mockDate,
  updatedAt: mockDate,
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

  it('calls prisma with correct where clause including userId', async () => {
    mockFindFirst.mockResolvedValue(basePrismaCollection as never);

    await getCollectionById('col-1', 'user-1');

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'col-1', userId: 'user-1' },
      })
    );
  });
});

describe('updateCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const mockUpdated = {
      id: 'col-1',
      name: 'Updated Name',
      description: 'Updated description',
      isFavorite: false,
      createdAt: mockDate,
      updatedAt: mockDate,
    };

    mockFindFirst.mockResolvedValue({ id: 'col-1', userId: 'user-1' } as never);
    mockUpdate.mockResolvedValue(mockUpdated as never);

    const result = await updateCollection('col-1', 'user-1', {
      name: 'Updated Name',
      description: 'Updated description',
    });

    expect(result).toEqual({
      id: 'col-1',
      name: 'Updated Name',
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
    });
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
    mockFindMany.mockResolvedValue([] as never);
    mockCreate.mockImplementation((async (args: { data: Record<string, unknown> }) => ({
      ...basePrismaCollection,
      ...args.data,
    })) as never);
  });

  it('derives the slug from the name and assigns a short id', async () => {
    const result = await createCollection('user-1', { name: 'React Patterns', description: null });

    expect(result.name).toBe('React Patterns');
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
