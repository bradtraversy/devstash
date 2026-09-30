import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { COLLECTION_ITEM_ORDER, ITEM_TYPE_ORDER } from '@/lib/db/items';
import type { MarkdownItem } from '@/lib/public/markdown';

export interface ExportItem {
  title: string;
  type: string;
  content: string | null;
  language: string | null;
  description: string | null;
  url: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  tags: string[];
  collections: string[];
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExportCollection {
  name: string;
  description: string | null;
  isFavorite: boolean;
}

export interface ExportData {
  version: number;
  exportedAt: string;
  items: ExportItem[];
  collections: ExportCollection[];
}

/**
 * Fetch all user data for export
 */
export async function getUserExportData(userId: string): Promise<ExportData> {
  const [items, collections] = await Promise.all([
    prisma.item.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        itemType: { select: { name: true } },
        tags: { select: { name: true } },
        collections: {
          include: {
            collection: { select: { name: true } },
          },
        },
      },
    }),
    prisma.collection.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        name: true,
        description: true,
        isFavorite: true,
      },
    }),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: items.map((item) => ({
      title: item.title,
      type: item.itemType.name,
      content: item.content,
      language: item.language,
      description: item.description,
      url: item.url,
      fileName: item.fileName,
      fileSize: item.fileSize,
      fileUrl: item.fileUrl,
      tags: item.tags.map((t) => t.name),
      collections: item.collections.map((ic) => ic.collection.name),
      isFavorite: item.isFavorite,
      isPinned: item.isPinned,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    collections: collections.map((c) => ({
      name: c.name,
      description: c.description,
      isFavorite: c.isFavorite,
    })),
  };
}

export interface MarkdownExportItem extends MarkdownItem {
  id: string;
  tags: string[];
}

export interface MarkdownExportCollection {
  name: string;
  description: string | null;
  items: MarkdownExportItem[];
}

export interface MarkdownExport {
  exportedAt: Date;
  itemCount: number;
  collections: MarkdownExportCollection[];
  uncollected: MarkdownExportItem[];
}

const MARKDOWN_ITEM_INCLUDE = {
  itemType: { select: { name: true } },
  tags: { select: { name: true } },
} satisfies Prisma.ItemInclude;

interface MarkdownItemRow {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  itemType: { name: string };
  tags: { name: string }[];
}

function toMarkdownItem(item: MarkdownItemRow): MarkdownExportItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    content: item.content,
    url: item.url,
    language: item.language,
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
    itemType: { name: item.itemType.name },
    tags: item.tags.map((tag) => tag.name),
  };
}

function typeRank(name: string): number {
  const index = ITEM_TYPE_ORDER.indexOf(name);
  return index === -1 ? ITEM_TYPE_ORDER.length : index;
}

/**
 * Every collection with its items in display order, plus the items in no
 * collection sorted by type then age, for the markdown export.
 */
export async function getUserMarkdownExport(userId: string): Promise<MarkdownExport> {
  const [collections, uncollected, itemCount] = await Promise.all([
    prisma.collection.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        description: true,
        items: {
          where: { item: { userId } },
          orderBy: COLLECTION_ITEM_ORDER,
          select: { item: { include: MARKDOWN_ITEM_INCLUDE } },
        },
      },
    }),
    prisma.item.findMany({
      where: { userId, collections: { none: {} } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: MARKDOWN_ITEM_INCLUDE,
    }),
    prisma.item.count({ where: { userId } }),
  ]);

  return {
    exportedAt: new Date(),
    itemCount,
    collections: collections.map((collection) => ({
      name: collection.name,
      description: collection.description,
      items: collection.items.map(({ item }) => toMarkdownItem(item)),
    })),
    uncollected: [...uncollected]
      .sort((a, b) => typeRank(a.itemType.name) - typeRank(b.itemType.name))
      .map(toMarkdownItem),
  };
}
