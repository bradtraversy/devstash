'use server';

import { z } from 'zod';
import {
  toggleItemFavorite as toggleItemFavoriteQuery,
  toggleItemPin as toggleItemPinQuery,
  VALID_ITEM_TYPES,
  type ItemDetail
} from '@/lib/db/items';
import { parseZodErrors, safeUrlSchema, validateId } from '@/lib/validation';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';
import { COLLECTION_VISIBILITIES, type VisibilityUpdate } from '@/lib/constants/visibility';
import {
  createItemForUser,
  deleteItemForUser,
  setItemVisibilityForUser,
  toActionResult,
  updateItemForUser,
} from '@/lib/item-writes';

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

  return toActionResult(await updateItemForUser(session.user.id, itemId, parsed.data));
}

export async function deleteItem(
  itemId: string
): Promise<ActionResult<null>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(itemId, 'item ID');
  if (idError) return idError;

  return toActionResult(await deleteItemForUser(session.user.id, itemId));
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

  const user = { id: session.user.id, isPro: session.user.isPro ?? false };
  return toActionResult(await createItemForUser(user, parsed.data));
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

  return toActionResult(
    await setItemVisibilityForUser(session.user.id, parsed.data.id, parsed.data.visibility)
  );
}
