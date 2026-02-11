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
  content: string | null;
  url: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  itemType: ItemType;
  tags: string[];
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemDetail {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  contentType: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  isFavorite: boolean;
  isPinned: boolean;
  itemType: ItemType;
  tags: string[];
  collections: { id: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
}

// Prisma item type with relations for mapping
type PrismaItemWithType = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
  itemType: { name: string; icon: string; color: string };
  tags: { name: string }[];
};

type PrismaItemWithDetail = PrismaItemWithType & {
  language: string | null;
  contentType: string;
  collections: { collection: { id: string; name: string } }[];
};

/**
 * Transform Prisma item to ItemWithType
 */
function toItemWithType(item: PrismaItemWithType): ItemWithType {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    content: item.content,
    url: item.url,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    itemType: {
      name: item.itemType.name,
      icon: item.itemType.icon,
      color: item.itemType.color,
    },
    tags: item.tags.map((tag) => tag.name),
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Transform Prisma item to ItemDetail
 */
function toItemDetail(item: PrismaItemWithDetail): ItemDetail {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    content: item.content,
    url: item.url,
    language: item.language,
    contentType: item.contentType,
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    itemType: {
      name: item.itemType.name,
      icon: item.itemType.icon,
      color: item.itemType.color,
    },
    tags: item.tags.map((tag) => tag.name),
    collections: item.collections.map((ic) => ({
      id: ic.collection.id,
      name: ic.collection.name,
    })),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
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

  return items.map(toItemWithType);
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

  return items.map(toItemWithType);
}

/**
 * Valid item type names (singular form as stored in database)
 */
export const VALID_ITEM_TYPES = ['snippet', 'prompt', 'command', 'note', 'file', 'image', 'link'] as const;
export type ValidItemType = typeof VALID_ITEM_TYPES[number];

export interface PaginatedItems {
  items: ItemWithType[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Get items by type for a user with pagination
 */
export async function getItemsByType(
  userId: string,
  typeName: string,
  page: number = 1,
  limit: number = 21
): Promise<PaginatedItems> {
  const skip = (page - 1) * limit;

  const [items, totalCount] = await Promise.all([
    prisma.item.findMany({
      where: {
        userId,
        itemType: {
          name: typeName,
          isSystem: true,
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      skip,
      take: limit,
      include: {
        itemType: true,
        tags: true,
      },
    }),
    prisma.item.count({
      where: {
        userId,
        itemType: {
          name: typeName,
          isSystem: true,
        },
      },
    }),
  ]);

  return {
    items: items.map(toItemWithType),
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
}

/**
 * Get items by collection ID for a user with pagination
 */
export async function getItemsByCollection(
  userId: string,
  collectionId: string,
  page: number = 1,
  limit: number = 21
): Promise<PaginatedItems> {
  const skip = (page - 1) * limit;

  const [items, totalCount] = await Promise.all([
    prisma.item.findMany({
      where: {
        userId,
        collections: {
          some: { collectionId },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      skip,
      take: limit,
      include: {
        itemType: true,
        tags: true,
      },
    }),
    prisma.item.count({
      where: {
        userId,
        collections: {
          some: { collectionId },
        },
      },
    }),
  ]);

  return {
    items: items.map(toItemWithType),
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
}

/**
 * Get full item detail by ID for a user
 */
export async function getItemById(
  userId: string,
  itemId: string
): Promise<ItemDetail | null> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
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

  if (!item || item.userId !== userId) {
    return null;
  }

  return toItemDetail(item);
}

export interface UpdateItemData {
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  tags: string[];
  collectionIds?: string[];
}

/**
 * Update an item and return the updated ItemDetail
 */
export async function updateItem(
  userId: string,
  itemId: string,
  data: UpdateItemData
): Promise<ItemDetail | null> {
  // Verify ownership first
  const existing = await prisma.item.findUnique({
    where: { id: itemId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  // Update collections if provided (delete all existing, then create new)
  if (data.collectionIds !== undefined) {
    await prisma.itemCollection.deleteMany({
      where: { itemId },
    });

    if (data.collectionIds.length > 0) {
      await prisma.itemCollection.createMany({
        data: data.collectionIds.map((collectionId) => ({
          itemId,
          collectionId,
        })),
      });
    }
  }

  // Update item with tag disconnect/connect-or-create
  const updated = await prisma.item.update({
    where: { id: itemId },
    data: {
      title: data.title,
      description: data.description,
      content: data.content,
      url: data.url,
      language: data.language,
      tags: {
        set: [], // Disconnect all existing tags
        connectOrCreate: data.tags.map((tagName) => ({
          where: { name: tagName },
          create: { name: tagName },
        })),
      },
    },
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

  return toItemDetail(updated);
}

/**
 * Delete an item by ID (with ownership check)
 * Also deletes associated file from R2 if present
 * Returns true if deleted, false if not found or not owned
 */
export async function deleteItem(
  userId: string,
  itemId: string
): Promise<boolean> {
  // Verify ownership and get file URL
  const existing = await prisma.item.findUnique({
    where: { id: itemId },
    select: { userId: true, fileUrl: true },
  });

  if (!existing || existing.userId !== userId) {
    return false;
  }

  // Delete file from R2 if present
  if (existing.fileUrl) {
    try {
      const { deleteFromR2 } = await import('@/lib/r2');
      await deleteFromR2(existing.fileUrl);
    } catch (error) {
      // Log but don't fail - the DB record should still be deleted
      console.error('Failed to delete file from R2:', error);
    }
  }

  await prisma.item.delete({
    where: { id: itemId },
  });

  return true;
}

export interface CreateItemData {
  typeName: ValidItemType;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  tags: string[];
  collectionIds?: string[];
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}

/**
 * Create a new item for a user
 */
export interface SearchableItem {
  id: string;
  title: string;
  typeName: string;
  typeIcon: string;
  typeColor: string;
  contentPreview: string | null;
}

/**
 * Get all items for a user in a lightweight format for search
 */
export async function getSearchableItems(
  userId: string
): Promise<SearchableItem[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      content: true,
      description: true,
      url: true,
      itemType: {
        select: {
          name: true,
          icon: true,
          color: true,
        },
      },
    },
  });

  return items.map((item) => {
    // Create a content preview (first 100 chars of content, description, or url)
    const previewSource = item.content || item.description || item.url || '';
    const contentPreview = previewSource.length > 100
      ? previewSource.slice(0, 100) + '...'
      : previewSource || null;

    return {
      id: item.id,
      title: item.title,
      typeName: item.itemType.name,
      typeIcon: item.itemType.icon,
      typeColor: item.itemType.color,
      contentPreview,
    };
  });
}

/**
 * Get all favorite items for a user (sorted by updatedAt desc)
 */
export async function getFavoriteItems(userId: string): Promise<ItemWithType[]> {
  const items = await prisma.item.findMany({
    where: {
      userId,
      isFavorite: true,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      itemType: true,
      tags: true,
    },
  });

  return items.map(toItemWithType);
}

/**
 * Toggle isFavorite on an item (with ownership check)
 * Returns the new isFavorite value, or null if not found/not owned
 */
export async function toggleItemFavorite(
  userId: string,
  itemId: string
): Promise<boolean | null> {
  const existing = await prisma.item.findUnique({
    where: { id: itemId },
    select: { userId: true, isFavorite: true },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: { isFavorite: !existing.isFavorite },
    select: { isFavorite: true },
  });

  return updated.isFavorite;
}

export async function createItem(
  userId: string,
  data: CreateItemData
): Promise<ItemDetail | null> {
  // Look up the item type
  const itemType = await prisma.itemType.findFirst({
    where: {
      name: data.typeName,
      isSystem: true,
    },
  });

  if (!itemType) {
    return null;
  }

  // Determine contentType based on item type
  let contentType: 'TEXT' | 'FILE' | 'URL' = 'TEXT';
  if (data.typeName === 'link') {
    contentType = 'URL';
  } else if (data.typeName === 'file' || data.typeName === 'image') {
    contentType = 'FILE';
  }

  const created = await prisma.item.create({
    data: {
      userId,
      itemTypeId: itemType.id,
      title: data.title,
      description: data.description,
      content: data.content,
      url: data.url,
      language: data.language,
      contentType,
      fileUrl: data.fileUrl ?? null,
      fileName: data.fileName ?? null,
      fileSize: data.fileSize ?? null,
      tags: {
        connectOrCreate: data.tags.map((tagName) => ({
          where: { name: tagName },
          create: { name: tagName },
        })),
      },
      collections: data.collectionIds?.length
        ? {
            create: data.collectionIds.map((collectionId) => ({
              collectionId,
            })),
          }
        : undefined,
    },
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

  return {
    id: created.id,
    title: created.title,
    description: created.description,
    content: created.content,
    url: created.url,
    language: created.language,
    contentType: created.contentType,
    fileUrl: created.fileUrl,
    fileName: created.fileName,
    fileSize: created.fileSize,
    isFavorite: created.isFavorite,
    isPinned: created.isPinned,
    itemType: {
      name: created.itemType.name,
      icon: created.itemType.icon,
      color: created.itemType.color,
    },
    tags: created.tags.map((tag) => tag.name),
    collections: created.collections.map((ic) => ({
      id: ic.collection.id,
      name: ic.collection.name,
    })),
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}
