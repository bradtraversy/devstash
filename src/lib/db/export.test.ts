import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUserMarkdownExport } from './export';
import { COLLECTION_ITEM_ORDER } from '@/lib/db/items';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    collection: { findMany: vi.fn() },
    item: { findMany: vi.fn(), count: vi.fn() },
  },
}));

import { prisma } from '@/lib/prisma';

const mockCollectionFindMany = vi.mocked(prisma.collection.findMany);
const mockItemFindMany = vi.mocked(prisma.item.findMany);
const mockItemCount = vi.mocked(prisma.item.count);

const NOW = new Date('2026-09-29T12:00:00Z');

const INCLUDE = {
  itemType: { select: { name: true } },
  tags: { select: { name: true } },
};

function row(type: string, title: string, tags: string[] = []) {
  return {
    id: title.toLowerCase(),
    title,
    description: null,
    content: `${title} body`,
    url: null,
    language: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    itemType: { name: type },
    tags: tags.map((name) => ({ name })),
  };
}

describe('getUserMarkdownExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockCollectionFindMany.mockResolvedValue([]);
    mockItemFindMany.mockResolvedValue([]);
    mockItemCount.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads every collection by name with its items through the join in display order', async () => {
    mockCollectionFindMany.mockResolvedValue([
      // Prisma returns the selected shape; the mock is typed as the full model.
      { name: 'React', description: 'Hooks', items: [{ item: row('snippet', 'useAuth', ['react']) }] },
      { name: 'Shell', description: null, items: [] },
    ] as never);
    mockItemCount.mockResolvedValue(1);

    const result = await getUserMarkdownExport('user-1');

    expect(mockCollectionFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        description: true,
        items: {
          where: { item: { userId: 'user-1' } },
          orderBy: COLLECTION_ITEM_ORDER,
          select: { item: { include: INCLUDE } },
        },
      },
    });
    expect(mockItemCount).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(result.exportedAt).toEqual(NOW);
    expect(result.itemCount).toBe(1);
    expect(result.collections).toEqual([
      {
        name: 'React',
        description: 'Hooks',
        items: [
          {
            id: 'useauth',
            title: 'useAuth',
            description: null,
            content: 'useAuth body',
            url: null,
            language: null,
            fileUrl: null,
            fileName: null,
            fileSize: null,
            itemType: { name: 'snippet' },
            tags: ['react'],
          },
        ],
      },
      { name: 'Shell', description: null, items: [] },
    ]);
  });

  it('reads the items in no collection and sorts them by type order then age', async () => {
    mockItemFindMany.mockResolvedValue([
      row('note', 'Older note'),
      row('snippet', 'First snippet'),
      row('recipe', 'Custom'),
      row('snippet', 'Second snippet'),
      row('link', 'Docs'),
    ] as never);

    const result = await getUserMarkdownExport('user-1');

    expect(mockItemFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', collections: { none: {} } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: INCLUDE,
    });
    expect(result.uncollected.map((item) => item.title)).toEqual([
      'First snippet',
      'Second snippet',
      'Older note',
      'Docs',
      'Custom',
    ]);
    expect(result.uncollected[0].tags).toEqual([]);
  });
});
