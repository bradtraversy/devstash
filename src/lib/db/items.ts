import { prisma } from '@/lib/prisma';

// Maximum allowed limit for queries to prevent abuse
const MAX_QUERY_LIMIT = 100;

/**
 * Validate and cap limit parameter
 */
function validateLimit(limit: number, defaultLimit: number): number {
  return Math.min(Math.max(1, limit), MAX_QUERY_LIMIT) || defaultLimit;
}

export interface ItemType {
  name: string;
  icon: string;
  color: string;
}

export interface ItemTypeWithCount extends ItemType {
  count: number;
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

export interface DashboardStats {
  totalItems: number;
  totalCollections: number;
  favoriteItems: number;
  favoriteCollections: number;
}

/**
 * Get dashboard stats for a user
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [totalItems, totalCollections, favoriteItems, favoriteCollections] =
    await Promise.all([
      prisma.item.count({ where: { userId } }),
      prisma.collection.count({ where: { userId } }),
      prisma.item.count({ where: { userId, isFavorite: true } }),
      prisma.collection.count({ where: { userId, isFavorite: true } }),
    ]);

  return {
    totalItems,
    totalCollections,
    favoriteItems,
    favoriteCollections,
  };
}

// Define the display order for item types
const ITEM_TYPE_ORDER = ['snippet', 'prompt', 'command', 'note', 'file', 'image', 'link'];

/**
 * Get system item types with counts for a user
 */
export async function getItemTypesWithCounts(
  userId: string
): Promise<ItemTypeWithCount[]> {
  const itemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
  });

  const counts = await prisma.item.groupBy({
    by: ['itemTypeId'],
    where: { userId },
    _count: { id: true },
  });

  const countMap = new Map(counts.map((c) => [c.itemTypeId, c._count.id]));

  const typesWithCounts = itemTypes.map((type) => ({
    name: type.name,
    icon: type.icon,
    color: type.color,
    count: countMap.get(type.id) || 0,
  }));

  // Sort by predefined order
  return typesWithCounts.sort((a, b) => {
    const indexA = ITEM_TYPE_ORDER.indexOf(a.name);
    const indexB = ITEM_TYPE_ORDER.indexOf(b.name);
    return indexA - indexB;
  });
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
  const safeLimit = validateLimit(limit, 10);

  const items = await prisma.item.findMany({
    where: {
      userId,
      isPinned: false,
    },
    orderBy: { updatedAt: 'desc' },
    take: safeLimit,
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
