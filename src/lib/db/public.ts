import { prisma } from '@/lib/prisma';
import { COLLECTION_ITEM_ORDER, type ItemType } from '@/lib/db/items';
import {
  PUBLIC_PAGE_ITEM_LIMIT,
  PUBLIC_PROFILE_COLLECTION_LIMIT,
  PUBLIC_PROFILE_ITEM_LIMIT,
} from '@/lib/constants/pagination';
import {
  publicCollectionOgPath,
  publicCollectionPath,
  publicProfilePath,
  publicShortImagePath,
  publicShortOgPath,
  publicShortPath,
} from '@/lib/public/paths';
import type { CollectionVisibility } from '@/lib/constants/visibility';

// Every query in this module carries this filter; nothing here takes a user id from a request.
const SHARED = { not: 'PRIVATE' } as const;

// The profile lists only what the owner made Public; unlisted things stay reachable by link alone.
const LISTED = 'PUBLIC' as const;

const OWNER_HANDLE = { select: { handle: true } } as const;

const ITEM_TYPE_SELECT = { select: { name: true, icon: true, color: true } } as const;

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

/** An item shared on its own; what the item page needs beyond the block. */
export interface PublicSharedItem extends PublicItem {
  shortId: string;
  visibility: CollectionVisibility;
  publishedAt: Date | null;
  updatedAt: Date;
  handle: string;
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
  /** The latest update among the collection row and its listed items; what the page shows last changed then. */
  contentUpdatedAt: Date;
  handle: string;
  itemCount: number;
  items: PublicItem[];
}

export interface PublicProfileCollection {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  itemCount: number;
}

export interface PublicProfileItem {
  id: string;
  shortId: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  fileName: string | null;
  itemType: ItemType;
}

export interface PublicProfile {
  handle: string;
  collections: PublicProfileCollection[];
  collectionCount: number;
  items: PublicProfileItem[];
  itemCount: number;
}

export interface PublicTarget {
  handle: string;
  slug: string;
}

export type ShortLinkTarget =
  | ({ kind: 'collection' } & PublicTarget)
  | { kind: 'item'; item: PublicSharedItem };

type PrismaPublicItem = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  itemType: { name: string; icon: string; color: string };
};

function toPublicItem(item: PrismaPublicItem): PublicItem {
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
    itemType: {
      name: item.itemType.name,
      icon: item.itemType.icon,
      color: item.itemType.color,
    },
  };
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
              itemType: ITEM_TYPE_SELECT,
            },
          },
        },
      },
    },
  });

  if (!collection?.user.handle) {
    return null;
  }

  const contentUpdatedAt = collection.items.reduce(
    (latest, { item }) => (item.updatedAt > latest ? item.updatedAt : latest),
    collection.updatedAt
  );

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    slug: collection.slug,
    shortId: collection.shortId,
    visibility: collection.visibility,
    publishedAt: collection.publishedAt,
    updatedAt: collection.updatedAt,
    contentUpdatedAt,
    handle: collection.user.handle,
    itemCount: collection._count.items,
    items: collection.items.map(({ item }) => toPublicItem(item)),
  };
}

/** A non-private item by its short id, or null when it is unknown, private, or its owner has no handle. */
export async function getPublicItem(shortId: string): Promise<PublicSharedItem | null> {
  const item = await prisma.item.findFirst({
    where: { shortId, visibility: SHARED },
    include: { user: OWNER_HANDLE, itemType: ITEM_TYPE_SELECT },
  });

  if (!item?.user.handle) {
    return null;
  }

  return {
    ...toPublicItem(item),
    shortId: item.shortId,
    visibility: item.visibility,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    handle: item.user.handle,
  };
}

// publishedAt only changes through visibility writes, which revalidate the profile; updatedAt also
// moves on pin and favorite toggles, which do not, and would let a private action reorder the page.
const PROFILE_ORDER = [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }] as const;

/**
 * The Public collections and items of the user with this handle, most recently shared first and capped,
 * with the full counts. Null for an unknown handle or when nothing is Public, so the page 404s.
 */
export async function getPublicProfile(handle: string): Promise<PublicProfile | null> {
  const user = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
  if (!user) return null;

  const collectionWhere = { userId: user.id, visibility: LISTED };
  const itemWhere = { userId: user.id, visibility: LISTED };

  const [collections, collectionCount, items, itemCount] = await Promise.all([
    prisma.collection.findMany({
      where: collectionWhere,
      orderBy: [...PROFILE_ORDER],
      take: PUBLIC_PROFILE_COLLECTION_LIMIT,
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.collection.count({ where: collectionWhere }),
    prisma.item.findMany({
      where: itemWhere,
      orderBy: [...PROFILE_ORDER],
      take: PUBLIC_PROFILE_ITEM_LIMIT,
      select: {
        id: true,
        shortId: true,
        title: true,
        description: true,
        content: true,
        url: true,
        language: true,
        fileName: true,
        itemType: ITEM_TYPE_SELECT,
      },
    }),
    prisma.item.count({ where: itemWhere }),
  ]);

  if (collectionCount === 0 && itemCount === 0) return null;

  return {
    handle,
    collections: collections.map(({ _count, ...collection }) => ({
      ...collection,
      itemCount: _count.items,
    })),
    collectionCount,
    items,
    itemCount,
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
 * What a short link points at: a collection (to redirect to) or an item (to render).
 * A collection wins when both match, which the backfill and the create path make unreachable.
 */
export async function resolveShortLink(shortId: string): Promise<ShortLinkTarget | null> {
  const [collection, item] = await Promise.all([resolveShortId(shortId), getPublicItem(shortId)]);

  if (collection) {
    return { kind: 'collection', ...collection };
  }
  if (item) {
    return { kind: 'item', item };
  }
  return null;
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
  shortId: string;
  user: { handle: string | null };
  slugHistory: { oldSlug: string }[];
};

const PATH_SELECT = {
  slug: true,
  shortId: true,
  user: OWNER_HANDLE,
  slugHistory: { select: { oldSlug: true } },
} as const;

// Retired slugs are cached as redirects, and so are the short link and the Open Graph image at the
// live slug, so all of them are revalidated with the live page. The owner's profile lists public
// collections, so it goes too; for an unlisted one that only re-renders the profile.
function toPaths(rows: PathRow[]): string[] {
  return rows.flatMap((row) => {
    const handle = row.user.handle;
    if (!handle) return [];
    return [
      ...[row.slug, ...row.slugHistory.map((history) => history.oldSlug)].map((slug) =>
        publicCollectionPath(handle, slug)
      ),
      publicCollectionOgPath(handle, row.slug),
      publicShortPath(row.shortId),
      publicProfilePath(handle),
    ];
  });
}

/** A shared item's page, its Open Graph card, its full image, and the owner's profile. */
function itemPaths(shortId: string, handle: string | null): string[] {
  return [
    publicShortPath(shortId),
    publicShortOgPath(shortId),
    publicShortImagePath(shortId),
    ...(handle ? [publicProfilePath(handle)] : []),
  ];
}

const ITEM_PATH_SELECT = { shortId: true, user: OWNER_HANDLE } as const;

/** Paths for the non-private collections among the given ids: the live page, its slug redirects, and its short link. */
export async function publicPathsForCollections(collectionIds: string[]): Promise<string[]> {
  if (collectionIds.length === 0) return [];

  const rows = await prisma.collection.findMany({
    where: { id: { in: collectionIds }, visibility: SHARED },
    select: PATH_SELECT,
  });

  return toPaths(rows);
}

/** The item's own page when it is shared, plus every non-private collection that holds it. */
export async function publicPathsForItem(itemId: string): Promise<string[]> {
  const [item, rows] = await Promise.all([
    prisma.item.findFirst({
      where: { id: itemId, visibility: SHARED },
      select: ITEM_PATH_SELECT,
    }),
    prisma.collection.findMany({
      where: { visibility: SHARED, items: { some: { itemId } } },
      select: PATH_SELECT,
    }),
  ]);

  return [...(item ? itemPaths(item.shortId, item.user.handle) : []), ...toPaths(rows)];
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

/** Paths for everything the user shares: collection pages with their redirects and short links, item pages, and the profile. */
export async function publicPathsForUser(userId: string): Promise<string[]> {
  const [rows, items] = await Promise.all([
    prisma.collection.findMany({
      where: { userId, visibility: SHARED },
      select: PATH_SELECT,
    }),
    prisma.item.findMany({
      where: { userId, visibility: SHARED },
      select: ITEM_PATH_SELECT,
    }),
  ]);

  return [...toPaths(rows), ...items.flatMap((item) => itemPaths(item.shortId, item.user.handle))];
}
