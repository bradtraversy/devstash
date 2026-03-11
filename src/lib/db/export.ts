import { prisma } from '@/lib/prisma';

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
