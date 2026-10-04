import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import type { CollectionVisibility, VisibilityUpdate } from '@/lib/constants/visibility';
import type { HomeFilter } from '@/lib/home';
import type { FavoriteItemSort } from '@/lib/favorites-sort';
import { DEFAULT_PAGE_SIZE } from '@/lib/page-size';
import { generateShortId } from '@/lib/short-id';
import { isUniqueViolation } from '@/lib/db/errors';
import { ensureUserHandle, retryOnHandleCollision } from '@/lib/db/users';

/** Display order of a collection's items; the reorder in collections.ts walks the same order. */
export const COLLECTION_ITEM_ORDER: Prisma.ItemCollectionOrderByWithRelationInput[] = [
  { position: 'asc' },
  { addedAt: 'asc' },
  { itemId: 'asc' },
];

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
  language: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  visibility: CollectionVisibility;
  shortId: string;
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
  visibility: CollectionVisibility;
  shortId: string;
  itemType: ItemType;
  tags: string[];
  collections: { id: string; name: string; visibility: CollectionVisibility }[];
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
  language: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  visibility: CollectionVisibility;
  shortId: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
  itemType: { name: string; icon: string; color: string };
  tags: { name: string }[];
};

type PrismaItemWithDetail = PrismaItemWithType & {
  contentType: string;
  collections: { collection: { id: string; name: string; visibility: CollectionVisibility } }[];
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
    language: item.language,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    visibility: item.visibility,
    shortId: item.shortId,
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
    visibility: item.visibility,
    shortId: item.shortId,
    itemType: {
      name: item.itemType.name,
      icon: item.itemType.icon,
      color: item.itemType.color,
    },
    tags: item.tags.map((tag) => tag.name),
    collections: item.collections.map((ic) => ({
      id: ic.collection.id,
      name: ic.collection.name,
      visibility: ic.collection.visibility,
    })),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// Define the display order for item types
export const ITEM_TYPE_ORDER = ['snippet', 'prompt', 'command', 'note', 'file', 'image', 'link'];

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

export interface HomeCounts {
  total: number;
  shared: number;
  pinned: number;
}

export async function getHomeCounts(userId: string): Promise<HomeCounts> {
  const [total, shared, pinned] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, visibility: { not: 'PRIVATE' } } }),
    prisma.item.count({ where: { userId, isPinned: true } }),
  ]);
  return { total, shared, pinned };
}

const HOME_FILTER_WHERE: Record<HomeFilter, Prisma.ItemWhereInput> = {
  all: {},
  shared: { visibility: { not: 'PRIVATE' } },
  pinned: { isPinned: true },
};

/** One page of the user's items for Home, pinned first, then the most recently updated. */
export async function getHomeItems(
  userId: string,
  filter: HomeFilter,
  page: number = 1,
  limit: number = DEFAULT_PAGE_SIZE
): Promise<PaginatedItems> {
  return paginateItems(
    { userId, ...HOME_FILTER_WHERE[filter] },
    [{ isPinned: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
    page,
    limit
  );
}

/**
 * Valid item type names (singular form as stored in database)
 */
export const VALID_ITEM_TYPES = ['snippet', 'prompt', 'command', 'note', 'file', 'image', 'link'] as const;
export type ValidItemType = typeof VALID_ITEM_TYPES[number];

export function isFileType(typeName: string): boolean {
  return typeName === 'file' || typeName === 'image';
}

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
  limit: number = DEFAULT_PAGE_SIZE
): Promise<PaginatedItems> {
  return paginateItems(
    { userId, itemType: { name: typeName, isSystem: true } },
    [{ isPinned: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
    page,
    limit
  );
}

/**
 * Get items by collection ID for a user with pagination
 */
export async function getItemsByCollection(
  userId: string,
  collectionId: string,
  page: number = 1,
  limit: number = DEFAULT_PAGE_SIZE
): Promise<PaginatedItems> {
  const skip = (page - 1) * limit;
  const where = { collectionId, item: { userId } };

  const [memberships, totalCount] = await Promise.all([
    prisma.itemCollection.findMany({
      where,
      orderBy: COLLECTION_ITEM_ORDER,
      skip,
      take: limit,
      include: {
        item: {
          include: {
            itemType: true,
            tags: true,
          },
        },
      },
    }),
    prisma.itemCollection.count({ where }),
  ]);

  return {
    items: memberships.map((membership) => toItemWithType(membership.item)),
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
            select: { id: true, name: true, visibility: true },
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

type CollectionReader = {
  collection: { findMany: typeof prisma.collection.findMany };
};

/** Thrown when a write names a collection the caller does not own or that no longer exists. */
export class UnknownCollectionError extends Error {
  constructor() {
    super('One of the selected collections no longer exists');
    this.name = 'UnknownCollectionError';
  }
}

/**
 * Resolves the caller's own collections from a client-supplied id list.
 * Throws when any id is missing or belongs to someone else, so the whole
 * write is refused instead of silently attaching to a foreign collection.
 */
async function resolveOwnedCollectionIds(
  client: CollectionReader,
  userId: string,
  collectionIds: string[]
): Promise<string[]> {
  const unique = [...new Set(collectionIds)];
  if (unique.length === 0) return [];

  const owned = await client.collection.findMany({
    where: { id: { in: unique }, userId },
    select: { id: true },
  });

  if (owned.length !== unique.length) throw new UnknownCollectionError();
  return owned.map((collection) => collection.id);
}

export type PositionReader = {
  itemCollection: { findFirst: typeof prisma.itemCollection.findFirst };
};

export type ShortIdReader = {
  collection: { findUnique: typeof prisma.collection.findUnique };
};

const SHORT_ID_ATTEMPTS = 5;

/**
 * A short id no collection holds, so /s/{shortId} never resolves to two things. Items are
 * covered by their unique index; the caller retries once on that violation.
 */
export async function freeShortId(client: ShortIdReader): Promise<string> {
  for (let attempt = 0; attempt < SHORT_ID_ATTEMPTS; attempt++) {
    const shortId = generateShortId();
    const taken = await client.collection.findUnique({ where: { shortId }, select: { id: true } });
    if (!taken) return shortId;
  }
  throw new Error('Could not allocate a free short id');
}

/** Position after the last item in a collection, so a new membership appends at the end. */
export async function nextPosition(client: PositionReader, collectionId: string): Promise<number> {
  const last = await client.itemCollection.findFirst({
    where: { collectionId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  return last ? last.position + 1 : 0;
}

async function appendPositions(
  client: PositionReader,
  collectionIds: string[]
): Promise<{ collectionId: string; position: number }[]> {
  const rows: { collectionId: string; position: number }[] = [];
  for (const collectionId of collectionIds) {
    rows.push({ collectionId, position: await nextPosition(client, collectionId) });
  }
  return rows;
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

  return prisma.$transaction(async (tx) => {
    if (data.collectionIds !== undefined) {
      const desired = await resolveOwnedCollectionIds(tx, userId, data.collectionIds);

      const current = await tx.itemCollection.findMany({
        where: { itemId },
        select: { collectionId: true },
      });
      const currentIds = current.map((row) => row.collectionId);
      const toRemove = currentIds.filter((id) => !desired.includes(id));
      const toAdd = desired.filter((id) => !currentIds.includes(id));

      if (toRemove.length > 0) {
        await tx.itemCollection.deleteMany({
          where: { itemId, collectionId: { in: toRemove } },
        });
      }
      if (toAdd.length > 0) {
        const positions = await appendPositions(tx, toAdd);
        await tx.itemCollection.createMany({
          data: positions.map(({ collectionId, position }) => ({ itemId, collectionId, position })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await tx.item.update({
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
              select: { id: true, name: true, visibility: true },
            },
          },
        },
      },
    });

    return toItemDetail(updated);
  });
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
      await deleteFromR2(existing.fileUrl, userId);
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
  visibility?: CollectionVisibility;
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

const FAVORITE_DATE_ORDER: Record<'date-desc' | 'date-asc', Prisma.ItemOrderByWithRelationInput[]> = {
  'date-desc': [{ updatedAt: 'desc' }, { id: 'asc' }],
  'date-asc': [{ updatedAt: 'asc' }, { id: 'asc' }],
};

const compareTitles = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });

async function paginateItems(
  where: Prisma.ItemWhereInput,
  orderBy: Prisma.ItemOrderByWithRelationInput[],
  page: number,
  limit: number
): Promise<PaginatedItems> {
  const [items, totalCount] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { itemType: true, tags: true },
    }),
    prisma.item.count({ where }),
  ]);

  return {
    items: items.map(toItemWithType),
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
}

/** One page of the user's favorite items in the chosen order. */
export async function getFavoriteItems(
  userId: string,
  sort: FavoriteItemSort = 'date-desc',
  page: number = 1,
  limit: number = DEFAULT_PAGE_SIZE
): Promise<PaginatedItems> {
  const where: Prisma.ItemWhereInput = { userId, isFavorite: true };
  if (sort === 'date-desc' || sort === 'date-asc') {
    return paginateItems(where, FAVORITE_DATE_ORDER[sort], page, limit);
  }

  // Titles sort in JS, case-insensitively, because the database collation may put "Zebra" before "apple".
  const keys = await prisma.item.findMany({
    where,
    select: { id: true, title: true, itemType: { select: { name: true } } },
  });
  keys.sort((a, b) => {
    const byType = sort === 'type' ? a.itemType.name.localeCompare(b.itemType.name) : 0;
    const byTitle = sort === 'name-desc' ? compareTitles(b.title, a.title) : compareTitles(a.title, b.title);
    return byType || byTitle || a.id.localeCompare(b.id);
  });

  const pageIds = keys.slice((page - 1) * limit, page * limit).map((key) => key.id);
  const rows = await prisma.item.findMany({
    where: { id: { in: pageIds } },
    include: { itemType: true, tags: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return {
    items: pageIds.flatMap((id) => (byId.has(id) ? [toItemWithType(byId.get(id)!)] : [])),
    totalCount: keys.length,
    totalPages: Math.ceil(keys.length / limit),
    currentPage: page,
  };
}

/** One page of the user's items that anyone with the link can open, most recently updated first. */
export async function getSharedItems(userId: string, page: number = 1, limit: number = DEFAULT_PAGE_SIZE): Promise<PaginatedItems> {
  return paginateItems(
    { userId, visibility: { not: 'PRIVATE' } },
    [{ updatedAt: 'desc' }, { id: 'asc' }],
    page,
    limit
  );
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

/**
 * Toggle isPinned on an item (with ownership check)
 * Returns the new isPinned value, or null if not found/not owned
 */
export async function toggleItemPin(
  userId: string,
  itemId: string
): Promise<boolean | null> {
  const existing = await prisma.item.findUnique({
    where: { id: itemId },
    select: { userId: true, isPinned: true },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: { isPinned: !existing.isPinned },
    select: { isPinned: true },
  });

  return updated.isPinned;
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
  } else if (isFileType(data.typeName)) {
    contentType = 'FILE';
  }

  const visibility = data.visibility ?? 'PRIVATE';
  const shared = visibility !== 'PRIVATE';

  const insert = () =>
    prisma.$transaction(async (tx) => {
      const collectionIds = await resolveOwnedCollectionIds(tx, userId, data.collectionIds ?? []);
      const positions = await appendPositions(tx, collectionIds);
      const shortId = await freeShortId(tx);

      if (shared) {
        await ensureUserHandle(tx, userId);
      }

      return tx.item.create({
      data: {
        userId,
        itemTypeId: itemType.id,
        shortId,
        visibility,
        publishedAt: shared ? new Date() : null,
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
        collections: positions.length
          ? {
              create: positions.map(({ collectionId, position }) => ({
                collectionId,
                position,
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
              select: { id: true, name: true, visibility: true },
            },
          },
        },
      },
    });
    });

  let created: Awaited<ReturnType<typeof insert>>;
  try {
    created = await insert();
  } catch (error) {
    // A short id taken by another item, or two first shares generating the same handle; one retry recomputes both.
    if (!isUniqueViolation(error)) throw error;
    created = await insert();
  }

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
    visibility: created.visibility,
    shortId: created.shortId,
    itemType: {
      name: created.itemType.name,
      icon: created.itemType.icon,
      color: created.itemType.color,
    },
    tags: created.tags.map((tag) => tag.name),
    collections: created.collections.map((ic) => ({
      id: ic.collection.id,
      name: ic.collection.name,
      visibility: ic.collection.visibility,
    })),
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

/**
 * Set an item's visibility (with ownership check). The first time it leaves private,
 * publishedAt is stamped and the owner gets a handle if they have none, the same rule
 * as a collection's first publish.
 */
export async function setItemVisibility(
  itemId: string,
  userId: string,
  visibility: CollectionVisibility
): Promise<VisibilityUpdate | null> {
  return retryOnHandleCollision(() =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.item.findFirst({
        where: { id: itemId, userId },
        select: { publishedAt: true },
      });

      if (!existing) {
        return null;
      }

      const leavingPrivate = visibility !== 'PRIVATE';

      const updated = await tx.item.update({
        where: { id: itemId, userId },
        data: {
          visibility,
          ...(leavingPrivate && !existing.publishedAt ? { publishedAt: new Date() } : {}),
        },
        select: { visibility: true, publishedAt: true },
      });

      let handle: string | null;
      if (leavingPrivate) {
        handle = await ensureUserHandle(tx, userId);
      } else {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { handle: true } });
        handle = user?.handle ?? null;
      }

      return { visibility: updated.visibility, publishedAt: updated.publishedAt, handle };
    })
  );
}
