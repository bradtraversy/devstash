import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { COLLECTION_ITEM_ORDER, createItem, freeShortId } from '@/lib/db/items';
import { insertCollectionTx } from '@/lib/db/collections';
import { isUniqueViolation } from '@/lib/db/errors';
import { isCopyableType } from '@/lib/constants/item-types';

// Every source read in this module carries the public page's filter: shared, and an owner with a handle.
const SHARED = { not: 'PRIVATE' } as const;
const WITH_HANDLE = { handle: { not: null } } as const;

const SOURCE_ITEM_SELECT = {
  title: true,
  description: true,
  content: true,
  url: true,
  language: true,
  contentType: true,
  itemType: { select: { name: true } },
  tags: { select: { name: true } },
} as const;

type SourceItem = Prisma.ItemGetPayload<{ select: typeof SOURCE_ITEM_SELECT }>;

// A collection copy runs a few hundred statements; the default five seconds is too tight on a pooled connection.
const COPY_TRANSACTION = { maxWait: 5000, timeout: 20000 };

export type SaveItemResult =
  | { status: 'not-found' }
  | { status: 'own' }
  | { status: 'unsupported' }
  | { status: 'limit' }
  | { status: 'saved'; itemId: string; typeName: string };

export type SaveCollectionResult =
  | { status: 'not-found' }
  | { status: 'own' }
  | { status: 'empty' }
  | { status: 'saved'; collectionId: string; copied: number; skipped: number };

export interface SharedCollectionSummary {
  ownerId: string;
  copyable: number;
}

/** How many of these types a save would copy; files and images stay behind. */
export function countCopyableItems(typeNames: string[]): number {
  return typeNames.filter(isCopyableType).length;
}

/**
 * Copies a shared item into the user's stash as a private item with a fresh short id. `canCreate`
 * is the caller's cap check, applied after the source checks so a dead link or the owner's own
 * item gets its own message rather than the upgrade one.
 */
export async function copySharedItem(
  userId: string,
  shortId: string,
  canCreate: boolean
): Promise<SaveItemResult> {
  const source = await prisma.item.findFirst({
    where: { shortId, visibility: SHARED, user: WITH_HANDLE },
    select: { ...SOURCE_ITEM_SELECT, userId: true },
  });

  if (!source) return { status: 'not-found' };
  if (source.userId === userId) return { status: 'own' };

  const typeName = source.itemType.name;
  if (!isCopyableType(typeName)) return { status: 'unsupported' };
  if (!canCreate) return { status: 'limit' };

  const created = await createItem(userId, {
    typeName,
    title: source.title,
    description: source.description,
    content: source.content,
    url: source.url,
    language: source.language,
    tags: source.tags.map((tag) => tag.name),
  });

  if (!created) throw new Error(`System item type ${typeName} is missing`);

  return { status: 'saved', itemId: created.id, typeName: created.itemType.name };
}

/** Who owns a shared collection and how many items a save of it would create, or null when it is not shared. */
export async function describeSharedCollection(
  handle: string,
  slug: string
): Promise<SharedCollectionSummary | null> {
  const collection = await prisma.collection.findFirst({
    where: { slug, visibility: SHARED, user: { handle } },
    select: {
      userId: true,
      items: { select: { item: { select: { itemType: { select: { name: true } } } } } },
    },
  });

  if (!collection) return null;

  return {
    ownerId: collection.userId,
    copyable: countCopyableItems(collection.items.map((row) => row.item.itemType.name)),
  };
}

/** Copies a shared collection and its text and link items, in display order, into the user's stash as private rows. */
export async function copySharedCollection(
  userId: string,
  handle: string,
  slug: string
): Promise<SaveCollectionResult> {
  const source = await prisma.collection.findFirst({
    where: { slug, visibility: SHARED, user: { handle } },
    select: {
      userId: true,
      name: true,
      description: true,
      items: { orderBy: COLLECTION_ITEM_ORDER, select: { item: { select: SOURCE_ITEM_SELECT } } },
    },
  });

  if (!source) return { status: 'not-found' };
  if (source.userId === userId) return { status: 'own' };

  const items: SourceItem[] = source.items
    .map((row) => row.item)
    .filter((item) => isCopyableType(item.itemType.name));
  const skipped = source.items.length - items.length;
  if (items.length === 0) return { status: 'empty' };

  const insert = () =>
    prisma.$transaction(async (tx) => {
      // Copies take the system type of the same name, never the source row's type id.
      const types = await tx.itemType.findMany({
        where: { isSystem: true },
        select: { id: true, name: true },
      });
      const typeIds = new Map(types.map((type) => [type.name, type.id]));

      const collection = await insertCollectionTx(tx, userId, {
        name: source.name,
        description: source.description,
      });

      let position = 0;
      for (const item of items) {
        const itemTypeId = typeIds.get(item.itemType.name);
        if (!itemTypeId) throw new Error(`System item type ${item.itemType.name} is missing`);

        await tx.item.create({
          data: {
            userId,
            itemTypeId,
            shortId: await freeShortId(tx),
            title: item.title,
            description: item.description,
            content: item.content,
            url: item.url,
            language: item.language,
            contentType: item.contentType,
            tags: {
              connectOrCreate: item.tags.map((tag) => ({
                where: { name: tag.name },
                create: { name: tag.name },
              })),
            },
            collections: { create: [{ collectionId: collection.id, position }] },
          },
        });
        position += 1;
      }

      return collection.id;
    }, COPY_TRANSACTION);

  let collectionId: string;
  try {
    collectionId = await insert();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    collectionId = await insert();
  }

  return { status: 'saved', collectionId, copied: items.length, skipped };
}
