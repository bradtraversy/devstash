'use server';

import { z } from 'zod';
import {
  updateItem as updateItemQuery,
  deleteItem as deleteItemQuery,
  createItem as createItemQuery,
  toggleItemFavorite as toggleItemFavoriteQuery,
  toggleItemPin as toggleItemPinQuery,
  setItemVisibility as setItemVisibilityQuery,
  VALID_ITEM_TYPES,
  isFileType,
  UnknownCollectionError,
  type ItemDetail
} from '@/lib/db/items';
import { parseZodErrors, safeUrlSchema, validateId } from '@/lib/validation';
import { isOwnedFileUrl } from '@/lib/file-urls';
import { canCreateItem } from '@/lib/usage';
import { itemLimitError } from '@/lib/constants/limits';
import { hasFileAccess, isProEnabled } from '@/lib/plans';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';
import { COLLECTION_VISIBILITIES, type VisibilityUpdate } from '@/lib/constants/visibility';
import { publicPathsForItem } from '@/lib/db/public';
import { lookupPublicPaths, revalidateAfterWrite, revalidatePublicPaths } from '@/lib/public/revalidate';

function collectionOrGenericError(error: unknown, fallback: string): ActionResult<never> {
  if (error instanceof UnknownCollectionError) {
    return { success: false, error: error.message, fieldErrors: { collectionIds: [error.message] } };
  }
  console.error(fallback, error);
  return { success: false, error: fallback };
}

const updateItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().nullable().optional().transform((val) => val || null),
  content: z.string().nullable().optional().transform((val) => val || null),
  url: safeUrlSchema,
  language: z.string().trim().nullable().optional().transform((val) => val || null),
  tags: z.array(z.string().trim()).transform((tags) =>
    tags.filter((tag) => tag.length > 0)
  ),
  collectionIds: z.array(z.string()).optional(),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export async function updateItem(
  itemId: string,
  input: UpdateItemInput
): Promise<ActionResult<ItemDetail>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = updateItemSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  try {
    const before = await lookupPublicPaths(() => publicPathsForItem(itemId));
    const updated = await updateItemQuery(session.user.id, itemId, parsed.data);

    if (!updated) {
      return { success: false, error: 'Item not found or access denied' };
    }

    await revalidateAfterWrite(before, () => publicPathsForItem(itemId));
    return { success: true, data: updated };
  } catch (error) {
    return collectionOrGenericError(error, 'Failed to update item');
  }
}

export async function deleteItem(
  itemId: string
): Promise<ActionResult<null>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(itemId, 'item ID');
  if (idError) return idError;

  const before = await lookupPublicPaths(() => publicPathsForItem(itemId));
  const deleted = await deleteItemQuery(session.user.id, itemId);

  if (!deleted) {
    return { success: false, error: 'Item not found or access denied' };
  }

  revalidatePublicPaths(before);
  return { success: true };
}

export async function toggleItemFavorite(
  itemId: string
): Promise<ActionResult<{ isFavorite: boolean }>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(itemId, 'item ID');
  if (idError) return idError;

  const isFavorite = await toggleItemFavoriteQuery(session.user.id, itemId);

  if (isFavorite === null) {
    return { success: false, error: 'Item not found or access denied' };
  }

  return { success: true, data: { isFavorite } };
}

export async function toggleItemPin(
  itemId: string
): Promise<ActionResult<{ isPinned: boolean }>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(itemId, 'item ID');
  if (idError) return idError;

  const isPinned = await toggleItemPinQuery(session.user.id, itemId);

  if (isPinned === null) {
    return { success: false, error: 'Item not found or access denied' };
  }

  return { success: true, data: { isPinned } };
}

const createItemSchema = z.object({
  typeName: z.enum(VALID_ITEM_TYPES, { message: 'Invalid item type' }),
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().nullable().optional().transform((val) => val || null),
  content: z.string().nullable().optional().transform((val) => val || null),
  url: safeUrlSchema,
  language: z.string().trim().nullable().optional().transform((val) => val || null),
  tags: z.array(z.string().trim()).transform((tags) =>
    tags.filter((tag) => tag.length > 0)
  ),
  collectionIds: z.array(z.string()).optional(),
  fileUrl: safeUrlSchema,
  fileName: z.string().nullable().optional().transform((val) => val || null),
  fileSize: z.number().int().positive().nullable().optional().transform((val) => val || null),
  visibility: z.enum(COLLECTION_VISIBILITIES).optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

export async function createItem(
  input: CreateItemInput
): Promise<ActionResult<ItemDetail>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = createItemSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  const isPro = session.user.isPro ?? false;
  const fileBacked = isFileType(parsed.data.typeName);
  if (fileBacked && !hasFileAccess(isPro)) {
    const error = isProEnabled()
      ? 'File and image uploads require a Pro subscription'
      : 'File and image items are not available right now';
    return { success: false, error };
  }

  // Usage limit check
  const allowed = await canCreateItem(session.user.id, isPro);
  if (!allowed) {
    return { success: false, error: itemLimitError() };
  }

  // Validate URL is required for link type
  if (parsed.data.typeName === 'link' && !parsed.data.url) {
    return { success: false, error: 'URL is required for links', fieldErrors: { url: ['URL is required'] } };
  }

  // A file reference is only valid when it points at this user's own upload namespace.
  if (fileBacked) {
    if (parsed.data.fileUrl && !isOwnedFileUrl(parsed.data.fileUrl, session.user.id)) {
      return {
        success: false,
        error: 'Invalid file reference',
        fieldErrors: { fileUrl: ['File must be uploaded through DevStash'] },
      };
    }
  } else {
    parsed.data.fileUrl = null;
    parsed.data.fileName = null;
    parsed.data.fileSize = null;
  }

  try {
    const created = await createItemQuery(session.user.id, parsed.data);

    if (!created) {
      return { success: false, error: 'Failed to create item' };
    }

    await revalidateAfterWrite([], () => publicPathsForItem(created.id));
    return { success: true, data: created };
  } catch (error) {
    return collectionOrGenericError(error, 'Failed to create item');
  }
}

const setItemVisibilitySchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  visibility: z.enum(COLLECTION_VISIBILITIES),
});

export type SetItemVisibilityInput = z.infer<typeof setItemVisibilitySchema>;

export async function setItemVisibility(
  input: SetItemVisibilityInput
): Promise<ActionResult<VisibilityUpdate>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = setItemVisibilitySchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  try {
    const before = await lookupPublicPaths(() => publicPathsForItem(parsed.data.id));
    const updated = await setItemVisibilityQuery(
      parsed.data.id,
      session.user.id,
      parsed.data.visibility
    );

    if (!updated) {
      return { success: false, error: 'Item not found or access denied' };
    }

    await revalidateAfterWrite(before, () => publicPathsForItem(parsed.data.id));
    return { success: true, data: updated };
  } catch {
    return { success: false, error: 'Failed to update visibility' };
  }
}
