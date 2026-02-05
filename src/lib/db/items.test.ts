import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getItemById, deleteItem } from './items';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    item: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

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
