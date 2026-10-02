import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { collectionSlugBase, uniqueSlug } from '@/lib/slugs';
import { generateShortId } from '@/lib/short-id';
import { isUniqueViolation } from '@/lib/db/errors';
import { ensureUserHandle, retryOnHandleCollision } from '@/lib/db/users';
import { COLLECTION_ITEM_ORDER } from '@/lib/db/items';
import type { CollectionVisibility, VisibilityUpdate } from '@/lib/constants/visibility';

export type { VisibilityUpdate };

// Maximum allowed limit for queries to prevent abuse
const MAX_QUERY_LIMIT = 100;

/**
 * Validate and cap limit parameter
 */
function validateLimit(limit: number, defaultLimit: number): number {
  return Math.min(Math.max(1, limit), MAX_QUERY_LIMIT) || defaultLimit;
}

const DEMO_USER_EMAIL = 'demo@devstash.io';

/**
 * Get the demo user (temporary until auth is implemented)
 */
export async function getDemoUser() {
  return prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });
}

export interface CollectionItemType {
  name: string;
  icon: string;
  color: string;
  count: number;
}

export interface CollectionWithTypes {
  id: string;
  name: string;
  slug: string;
  shortId: string;
  visibility: CollectionVisibility;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  itemTypes: CollectionItemType[];
  dominantColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Maximum items to sample per collection for type aggregation
const MAX_ITEMS_FOR_TYPE_SAMPLE = 50;

// Type for items with itemType info used in type counting
type ItemWithType = {
  item: {
    itemType: {
      id: string;
      name?: string;
      icon?: string;
      color: string;
    };
  };
};

/**
 * Count items by type and return sorted array with full type info
 */
function countItemTypes(items: ItemWithType[]): CollectionItemType[] {
  const typeCounts = new Map<string, CollectionItemType>();

  for (const itemCollection of items) {
    const itemType = itemCollection.item.itemType;
    const existing = typeCounts.get(itemType.id);

    if (existing) {
      existing.count++;
    } else {
      typeCounts.set(itemType.id, {
        name: itemType.name || '',
        icon: itemType.icon || '',
        color: itemType.color,
        count: 1,
      });
    }
  }

  // Sort by count (descending)
  return Array.from(typeCounts.values()).sort((a, b) => b.count - a.count);
}

/**
 * Get dominant color from items (most frequently used type's color)
 */
function getDominantColor(items: ItemWithType[]): string | null {
  const typeCounts = new Map<string, { color: string; count: number }>();

  for (const itemCollection of items) {
    const itemType = itemCollection.item.itemType;
    const existing = typeCounts.get(itemType.id);

    if (existing) {
      existing.count++;
    } else {
      typeCounts.set(itemType.id, {
        color: itemType.color,
        count: 1,
      });
    }
  }

  let dominantColor: string | null = null;
  let maxCount = 0;
  for (const { color, count } of typeCounts.values()) {
    if (count > maxCount) {
      maxCount = count;
      dominantColor = color;
    }
  }

  return dominantColor;
}

/**
 * Get recent collections for a user with item type information
 * Returns collections sorted by updatedAt, with aggregated item type data
 * Uses _count for accurate item count and limits items fetched for type aggregation
 */
export async function getRecentCollections(
  userId: string,
  limit: number = 6
): Promise<CollectionWithTypes[]> {
  const safeLimit = validateLimit(limit, 6);

  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: safeLimit,
    include: {
      _count: {
        select: { items: true },
      },
      items: {
        take: MAX_ITEMS_FOR_TYPE_SAMPLE,
        include: {
          item: {
            select: {
              itemType: {
                select: {
                  id: true,
                  name: true,
                  icon: true,
                  color: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return collections.map((collection) => {
    const itemTypes = countItemTypes(collection.items);
    const dominantColor = itemTypes.length > 0 ? itemTypes[0].color : null;

    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      shortId: collection.shortId,
      visibility: collection.visibility,
      description: collection.description,
      isFavorite: collection.isFavorite,
      itemCount: collection._count.items,
      itemTypes,
      dominantColor,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  });
}

export interface SidebarCollection {
  id: string;
  name: string;
  itemCount: number;
  isFavorite: boolean;
  dominantColor: string | null;
}

export interface SidebarCollections {
  favorites: SidebarCollection[];
  recents: SidebarCollection[];
}

// Shared include config for sidebar collections
const sidebarCollectionInclude = {
  _count: {
    select: { items: true },
  },
  items: {
    take: MAX_ITEMS_FOR_TYPE_SAMPLE,
    include: {
      item: {
        select: {
          itemType: {
            select: {
              id: true,
              color: true,
            },
          },
        },
      },
    },
  },
} as const;

type SidebarCollectionWithItems = Awaited<
  ReturnType<typeof prisma.collection.findMany<{ include: typeof sidebarCollectionInclude }>>
>[number];

/**
 * Get collections for sidebar (favorites and recents)
 * Uses parallel queries with proper limits instead of fetching all and filtering
 */
export async function getSidebarCollections(
  userId: string
): Promise<SidebarCollections> {
  // Fetch favorites and recents in parallel with proper limits
  const [favoriteCollections, recentCollections] = await Promise.all([
    prisma.collection.findMany({
      where: { userId, isFavorite: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: sidebarCollectionInclude,
    }),
    prisma.collection.findMany({
      where: { userId, isFavorite: false },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      include: sidebarCollectionInclude,
    }),
  ]);

  const processCollection = (collection: SidebarCollectionWithItems): SidebarCollection => ({
    id: collection.id,
    name: collection.name,
    itemCount: collection._count.items,
    isFavorite: collection.isFavorite,
    dominantColor: getDominantColor(collection.items),
  });

  const favorites = favoriteCollections.map(processCollection);
  const recents = recentCollections.map(processCollection);

  return { favorites, recents };
}

export interface CreateCollectionData {
  name: string;
  description: string | null;
}

export interface CreatedCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type CollectionRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toCreatedCollection(row: CollectionRow): CreatedCollection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isFavorite: row.isFavorite,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface CollectionForPicker {
  id: string;
  name: string;
}

/**
 * Get all collections for a user (for picker dropdowns)
 */
export async function getUserCollections(
  userId: string
): Promise<CollectionForPicker[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
    },
  });

  return collections;
}

export interface PaginatedCollections {
  collections: CollectionWithTypes[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Get all collections for a user with item type information and pagination
 */
export async function getAllCollections(
  userId: string,
  page: number = 1,
  limit: number = 21
): Promise<PaginatedCollections> {
  const skip = (page - 1) * limit;

  const [collections, totalCount] = await Promise.all([
    prisma.collection.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: {
          select: { items: true },
        },
        items: {
          take: MAX_ITEMS_FOR_TYPE_SAMPLE,
          include: {
            item: {
              select: {
                itemType: {
                  select: {
                    id: true,
                    name: true,
                    icon: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.collection.count({
      where: { userId },
    }),
  ]);

  return {
    collections: collections.map((collection) => {
      const itemTypes = countItemTypes(collection.items);
      const dominantColor = itemTypes.length > 0 ? itemTypes[0].color : null;

      return {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        shortId: collection.shortId,
        visibility: collection.visibility,
        description: collection.description,
        isFavorite: collection.isFavorite,
        itemCount: collection._count.items,
        itemTypes,
        dominantColor,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
      };
    }),
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
}

export interface CollectionDetail {
  id: string;
  name: string;
  slug: string;
  shortId: string;
  visibility: CollectionVisibility;
  publishedAt: Date | null;
  ownerHandle: string | null;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  itemTypes: CollectionItemType[];
  dominantColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get a single collection by ID with ownership check
 */
export async function getCollectionById(
  collectionId: string,
  userId: string
): Promise<CollectionDetail | null> {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    include: {
      user: {
        select: { handle: true },
      },
      _count: {
        select: { items: true },
      },
      items: {
        take: MAX_ITEMS_FOR_TYPE_SAMPLE,
        include: {
          item: {
            select: {
              itemType: {
                select: {
                  id: true,
                  name: true,
                  icon: true,
                  color: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!collection) {
    return null;
  }

  const itemTypes = countItemTypes(collection.items);
  const dominantColor = itemTypes.length > 0 ? itemTypes[0].color : null;

  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    shortId: collection.shortId,
    visibility: collection.visibility,
    publishedAt: collection.publishedAt,
    ownerHandle: collection.user.handle,
    description: collection.description,
    isFavorite: collection.isFavorite,
    itemCount: collection._count.items,
    itemTypes,
    dominantColor,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

type CollectionWriter = Pick<Prisma.TransactionClient, 'collection' | 'collectionSlugHistory'>;

/** Creates a collection on a transaction client; a unique violation propagates for the caller's one retry. */
export async function insertCollectionTx(
  tx: CollectionWriter,
  userId: string,
  data: CreateCollectionData
) {
  const existing = await tx.collection.findMany({
    where: { userId },
    select: { slug: true },
  });
  const slug = uniqueSlug(
    collectionSlugBase(data.name),
    existing.map((collection) => collection.slug)
  );

  const created = await tx.collection.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      slug,
      shortId: generateShortId(),
    },
  });

  // The slug is live again, so a retired collection's redirect for it must not linger.
  await tx.collectionSlugHistory.deleteMany({ where: { userId, oldSlug: slug } });

  return created;
}

async function insertCollection(userId: string, data: CreateCollectionData) {
  return prisma.$transaction((tx) => insertCollectionTx(tx, userId, data));
}

export async function createCollection(
  userId: string,
  data: CreateCollectionData
): Promise<CreatedCollection> {
  let created: Awaited<ReturnType<typeof insertCollection>>;
  try {
    created = await insertCollection(userId, data);
  } catch (error) {
    // A short id collision or a concurrent create with the same name; one retry recomputes both.
    if (!isUniqueViolation(error)) throw error;
    created = await insertCollection(userId, data);
  }

  return toCreatedCollection(created);
}

export interface UpdateCollectionData {
  name: string;
  description: string | null;
  slug?: string;
}

/**
 * Update a collection (with ownership check). A changed slug records the old one in
 * slug history and reclaims the new one from history. A unique violation on the
 * new slug propagates so the action can report it.
 */
export async function updateCollection(
  collectionId: string,
  userId: string,
  data: UpdateCollectionData
): Promise<CreatedCollection | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.collection.findFirst({
      where: { id: collectionId, userId },
      select: { slug: true },
    });

    if (!existing) {
      return null;
    }

    const slugChanged = data.slug !== undefined && data.slug !== existing.slug;

    if (slugChanged) {
      await tx.collectionSlugHistory.deleteMany({ where: { userId, oldSlug: data.slug } });
      await tx.collectionSlugHistory.upsert({
        where: { userId_oldSlug: { userId, oldSlug: existing.slug } },
        create: { userId, oldSlug: existing.slug, collectionId },
        update: { collectionId, createdAt: new Date() },
      });
    }

    const updated = await tx.collection.update({
      where: { id: collectionId },
      data: {
        name: data.name,
        description: data.description,
        ...(slugChanged ? { slug: data.slug } : {}),
      },
    });

    return toCreatedCollection(updated);
  });
}

async function applyVisibility(
  collectionId: string,
  userId: string,
  visibility: CollectionVisibility
): Promise<VisibilityUpdate | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.collection.findFirst({
      where: { id: collectionId, userId },
      select: { publishedAt: true },
    });

    if (!existing) {
      return null;
    }

    const leavingPrivate = visibility !== 'PRIVATE';

    const updated = await tx.collection.update({
      where: { id: collectionId },
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
  });
}

/**
 * Set a collection's visibility (with ownership check). The first time it leaves
 * private, publishedAt is stamped and the owner gets a handle if they have none.
 */
export async function setCollectionVisibility(
  collectionId: string,
  userId: string,
  visibility: CollectionVisibility
): Promise<VisibilityUpdate | null> {
  return retryOnHandleCollision(() => applyVisibility(collectionId, userId, visibility));
}

export type MoveDirection = 'up' | 'down';

/**
 * Move an item one step within a collection (with ownership check).
 * Positions are rewritten as 0..n-1 in display order, so gaps and ties from
 * concurrent adds are repaired on the first move. Returns false when the
 * collection or the item is not found; a move past either end is a no-op.
 */
export async function moveCollectionItem(
  collectionId: string,
  userId: string,
  itemId: string,
  direction: MoveDirection
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // The update proves ownership and holds the collection's row lock for the rest of the transaction.
    const owned = await tx.collection.updateMany({
      where: { id: collectionId, userId },
      data: { updatedAt: new Date() },
    });

    if (owned.count === 0) {
      return false;
    }

    const rows = await tx.itemCollection.findMany({
      where: { collectionId },
      orderBy: COLLECTION_ITEM_ORDER,
      select: { itemId: true, position: true },
    });

    const index = rows.findIndex((row) => row.itemId === itemId);
    if (index === -1) {
      return false;
    }

    const order = rows.map((row) => row.itemId);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target >= 0 && target < order.length) {
      [order[index], order[target]] = [order[target], order[index]];
    }

    const current = new Map(rows.map((row) => [row.itemId, row.position]));
    for (const [position, id] of order.entries()) {
      if (current.get(id) !== position) {
        await tx.itemCollection.update({
          where: { itemId_collectionId: { itemId: id, collectionId } },
          data: { position },
        });
      }
    }

    return true;
  });
}

/**
 * Delete a collection (with ownership check)
 * Note: Items are NOT deleted, only the ItemCollection join records are removed (via cascade)
 */
export async function deleteCollection(
  collectionId: string,
  userId: string
): Promise<boolean> {
  // First verify ownership
  const existing = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
  });

  if (!existing) {
    return false;
  }

  await prisma.collection.delete({
    where: { id: collectionId },
  });

  return true;
}

/**
 * Toggle isFavorite on a collection (with ownership check)
 * Returns the new isFavorite value, or null if not found/not owned
 */
export async function toggleCollectionFavorite(
  collectionId: string,
  userId: string
): Promise<boolean | null> {
  const existing = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: { isFavorite: true },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.collection.update({
    where: { id: collectionId },
    data: { isFavorite: !existing.isFavorite },
    select: { isFavorite: true },
  });

  return updated.isFavorite;
}

export interface FavoriteCollection {
  id: string;
  name: string;
  itemCount: number;
  updatedAt: Date;
}

/**
 * Get all favorite collections for a user (sorted by updatedAt desc)
 */
export async function getFavoriteCollections(
  userId: string
): Promise<FavoriteCollection[]> {
  const collections = await prisma.collection.findMany({
    where: {
      userId,
      isFavorite: true,
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      _count: {
        select: { items: true },
      },
    },
  });

  return collections.map((c) => ({
    id: c.id,
    name: c.name,
    itemCount: c._count.items,
    updatedAt: c.updatedAt,
  }));
}

export interface SearchableCollection {
  id: string;
  name: string;
  itemCount: number;
}

/**
 * Get all collections for a user in a lightweight format for search
 */
export async function getSearchableCollections(
  userId: string
): Promise<SearchableCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      _count: {
        select: { items: true },
      },
    },
  });

  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    itemCount: collection._count.items,
  }));
}
