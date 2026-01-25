import { prisma } from '@/lib/prisma';

export interface ItemType {
  name: string;
  icon: string;
  color: string;
}

export interface ItemWithType {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  itemType: ItemType;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get pinned items for a user
 */
export async function getPinnedItems(userId: string): Promise<ItemWithType[]> {
  const items = await prisma.item.findMany({
    where: {
      userId,
      isPinned: true,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      itemType: true,
      tags: true,
    },
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    itemType: {
      name: item.itemType.name,
      icon: item.itemType.icon,
      color: item.itemType.color,
    },
    tags: item.tags.map((tag) => tag.name),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

/**
 * Get recent items for a user (excluding pinned items)
 */
export async function getRecentItems(
  userId: string,
  limit: number = 10
): Promise<ItemWithType[]> {
  const items = await prisma.item.findMany({
    where: {
      userId,
      isPinned: false,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      itemType: true,
      tags: true,
    },
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    itemType: {
      name: item.itemType.name,
      icon: item.itemType.icon,
      color: item.itemType.color,
    },
    tags: item.tags.map((tag) => tag.name),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}
