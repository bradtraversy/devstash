import { prisma } from '@/lib/prisma';
import { COLLECTION_ITEM_ORDER, type ItemType } from '@/lib/db/items';
import { PUBLIC_PAGE_ITEM_LIMIT } from '@/lib/constants/pagination';
import { publicCollectionPath } from '@/lib/public/paths';
import type { CollectionVisibility } from '@/lib/constants/visibility';

// Every query in this module carries this filter; nothing here takes a user id from a request.
const SHARED = { not: 'PRIVATE' } as const;

const OWNER_HANDLE = { select: { handle: true } } as const;

export interface PublicItem {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  itemType: ItemType;
}

export interface PublicCollection {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  shortId: string;
  visibility: CollectionVisibility;
  publishedAt: Date | null;
  updatedAt: Date;
  handle: string;
  itemCount: number;
  items: PublicItem[];
}

export interface PublicTarget {
  handle: string;
  slug: string;
}

/**
 * A non-private collection by its owner's handle and slug, with up to
 * PUBLIC_PAGE_ITEM_LIMIT items in display order and the full item count.
 */
export async function getPublicCollection(
  handle: string,
  slug: string
): Promise<PublicCollection | null> {
  const collection = await prisma.collection.findFirst({
    where: { slug, visibility: SHARED, user: { handle } },
    include: {
      user: OWNER_HANDLE,
      _count: { select: { items: true } },
      items: {
        orderBy: COLLECTION_ITEM_ORDER,
        take: PUBLIC_PAGE_ITEM_LIMIT,
        include: {
          item: {
            include: {
              itemType: { select: { name: true, icon: true, color: true } },
            },
          },
        },
      },
    },
  });

  if (!collection?.user.handle) {
    return null;
  }

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    slug: collection.slug,
    shortId: collection.shortId,
    visibility: collection.visibility,
    publishedAt: collection.publishedAt,
    updatedAt: collection.updatedAt,
    handle: collection.user.handle,
    itemCount: collection._count.items,
    items: collection.items.map(({ item }) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      content: item.content,
      url: item.url,
      language: item.language,
      fileUrl: item.fileUrl,
      fileName: item.fileName,
      fileSize: item.fileSize,
      itemType: {
        name: item.itemType.name,
        icon: item.itemType.icon,
        color: item.itemType.color,
      },
    })),
  };
}

/** Canonical handle and slug for a short id, or null when it is unknown or private. */
export async function resolveShortId(shortId: string): Promise<PublicTarget | null> {
  const collection = await prisma.collection.findFirst({
    where: { shortId, visibility: SHARED },
    select: { slug: true, user: OWNER_HANDLE },
  });

  if (!collection?.user.handle) {
    return null;
  }

  return { handle: collection.user.handle, slug: collection.slug };
}

/**
 * Canonical handle and slug for a retired slug of the owner, or null when no history
 * row matches or the collection it points at is private.
 */
export async function resolveSlugHistory(
  handle: string,
  oldSlug: string
): Promise<PublicTarget | null> {
  const history = await prisma.collectionSlugHistory.findFirst({
    where: { oldSlug, user: { handle }, collection: { visibility: SHARED } },
    select: {
      collection: { select: { slug: true, user: OWNER_HANDLE } },
    },
  });

  if (!history?.collection.user.handle) {
    return null;
  }

  return { handle: history.collection.user.handle, slug: history.collection.slug };
}

type PathRow = {
  slug: string;
  user: { handle: string | null };
  slugHistory: { oldSlug: string }[];
};

const PATH_SELECT = {
  slug: true,
  user: OWNER_HANDLE,
  slugHistory: { select: { oldSlug: true } },
} as const;

// Retired slugs are cached as redirects, so they are revalidated alongside the live page.
function toPaths(rows: PathRow[]): string[] {
  return rows.flatMap((row) => {
    const handle = row.user.handle;
    if (!handle) return [];
    return [row.slug, ...row.slugHistory.map((history) => history.oldSlug)].map((slug) =>
      publicCollectionPath(handle, slug)
    );
  });
}

/** Paths for the non-private collections among the given ids: the live page and its slug redirects. */
export async function publicPathsForCollections(collectionIds: string[]): Promise<string[]> {
  if (collectionIds.length === 0) return [];

  const rows = await prisma.collection.findMany({
    where: { id: { in: collectionIds }, visibility: SHARED },
    select: PATH_SELECT,
  });

  return toPaths(rows);
}

/** Paths for every non-private collection that holds the item, live pages and slug redirects. */
export async function publicPathsForItem(itemId: string): Promise<string[]> {
  const rows = await prisma.collection.findMany({
    where: { visibility: SHARED, items: { some: { itemId } } },
    select: PATH_SELECT,
  });

  return toPaths(rows);
}

/**
 * The path a slug of this owner has whatever the collection's visibility. Creating or renaming a
 * collection onto a retired slug deletes its history row, and the cached redirect for that path
 * must go with it even when the collection taking the slug is private.
 */
export async function publicPathForOwnerSlug(userId: string, slug: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { handle: true } });
  return user?.handle ? [publicCollectionPath(user.handle, slug)] : [];
}

/** Paths for every non-private collection the user owns, live pages and slug redirects. */
export async function publicPathsForUser(userId: string): Promise<string[]> {
  const rows = await prisma.collection.findMany({
    where: { userId, visibility: SHARED },
    select: PATH_SELECT,
  });

  return toPaths(rows);
}
