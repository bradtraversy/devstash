'use server';

import { z } from 'zod';
import { SHORT_ID_PATTERN } from '@/lib/short-id';
import { normalizePublicSegment } from '@/lib/public/paths';
import { parseZodErrors } from '@/lib/validation';
import { getUserUsage } from '@/lib/usage';
import {
  COLLECTION_LIMIT_ERROR,
  ITEM_LIMIT_ERROR,
  SAVE_COLLECTION_ITEM_LIMIT,
} from '@/lib/constants/limits';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';
import {
  copySharedCollection,
  copySharedItem,
  describeSharedCollection,
} from '@/lib/db/save';

const OWN_ERROR = 'This is already in your stash';
const COLLECTION_GONE_ERROR = 'This collection is no longer shared';
const COLLECTION_EMPTY_ERROR = 'This collection has nothing that can be saved yet';

const saveItemSchema = z.object({
  shortId: z.string().trim().toLowerCase().regex(SHORT_ID_PATTERN, 'Invalid link'),
});

export type SaveItemInput = z.infer<typeof saveItemSchema>;

const segmentSchema = z.string().transform((value, ctx) => {
  const normalized = normalizePublicSegment(value);
  if (!normalized) {
    ctx.addIssue({ code: 'custom', message: 'Invalid link' });
    return z.NEVER;
  }
  return normalized;
});

const saveCollectionSchema = z.object({ handle: segmentSchema, slug: segmentSchema });

export type SaveCollectionInput = z.input<typeof saveCollectionSchema>;

export interface SavedItem {
  itemId: string;
  typeName: string;
}

export interface SavedCollection {
  collectionId: string;
  copied: number;
  skipped: number;
}

export async function saveSharedItem(input: SaveItemInput): Promise<ActionResult<SavedItem>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = saveItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  try {
    const usage = await getUserUsage(session.user.id, session.user.isPro ?? false);
    const result = await copySharedItem(session.user.id, parsed.data.shortId, usage.canCreateItem);

    switch (result.status) {
      case 'not-found':
        return { success: false, error: 'This item is no longer shared' };
      case 'own':
        return { success: false, error: OWN_ERROR };
      case 'unsupported':
        return { success: false, error: 'Files cannot be saved yet' };
      case 'limit':
        return { success: false, error: ITEM_LIMIT_ERROR };
      default:
        return { success: true, data: { itemId: result.itemId, typeName: result.typeName } };
    }
  } catch (error) {
    console.error('Failed to save item', error);
    return { success: false, error: 'Failed to save item' };
  }
}

export async function saveSharedCollection(
  input: SaveCollectionInput
): Promise<ActionResult<SavedCollection>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = saveCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  const { handle, slug } = parsed.data;
  const userId = session.user.id;

  try {
    // Source checks first, so a dead link or the owner's own collection never gets the upgrade message.
    const summary = await describeSharedCollection(handle, slug);
    if (!summary) {
      return { success: false, error: COLLECTION_GONE_ERROR };
    }
    if (summary.ownerId === userId) {
      return { success: false, error: OWN_ERROR };
    }
    if (summary.copyable === 0) {
      return { success: false, error: COLLECTION_EMPTY_ERROR };
    }
    if (summary.copyable > SAVE_COLLECTION_ITEM_LIMIT) {
      return {
        success: false,
        error: `Collections with more than ${SAVE_COLLECTION_ITEM_LIMIT} items cannot be saved yet`,
      };
    }

    const usage = await getUserUsage(userId, session.user.isPro ?? false);
    if (!usage.canCreateCollection) {
      return { success: false, error: COLLECTION_LIMIT_ERROR };
    }

    // maxItems is unbounded for Pro, so only a free account can fail this check.
    const left = Math.max(0, usage.maxItems - usage.itemCount);
    if (summary.copyable > left) {
      return {
        success: false,
        error: `Saving this collection needs ${summary.copyable} item slots and your free plan has ${left} left. Upgrade to Pro for unlimited items.`,
      };
    }

    const result = await copySharedCollection(userId, handle, slug);

    switch (result.status) {
      case 'not-found':
        return { success: false, error: COLLECTION_GONE_ERROR };
      case 'own':
        return { success: false, error: OWN_ERROR };
      case 'empty':
        return { success: false, error: COLLECTION_EMPTY_ERROR };
      default:
        return {
          success: true,
          data: { collectionId: result.collectionId, copied: result.copied, skipped: result.skipped },
        };
    }
  } catch (error) {
    console.error('Failed to save collection', error);
    return { success: false, error: 'Failed to save collection' };
  }
}
