'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import {
  updateItem as updateItemQuery,
  deleteItem as deleteItemQuery,
  createItem as createItemQuery,
  toggleItemFavorite as toggleItemFavoriteQuery,
  toggleItemPin as toggleItemPinQuery,
  VALID_ITEM_TYPES,
  type ItemDetail
} from '@/lib/db/items';
import { parseZodErrors, safeUrlSchema } from '@/lib/validation';
import { canCreateItem } from '@/lib/usage';

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

interface ActionResult<T = ItemDetail> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function updateItem(
  itemId: string,
  input: UpdateItemInput
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = updateItemSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  const updated = await updateItemQuery(session.user.id, itemId, parsed.data);

  if (!updated) {
    return { success: false, error: 'Item not found or access denied' };
  }

  return { success: true, data: updated };
}

const deleteItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
});

export async function deleteItem(
  itemId: string
): Promise<ActionResult<null>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = deleteItemSchema.safeParse({ itemId });

  if (!parsed.success) {
    return { success: false, error: 'Invalid item ID' };
  }

  const deleted = await deleteItemQuery(session.user.id, parsed.data.itemId);

  if (!deleted) {
    return { success: false, error: 'Item not found or access denied' };
  }

  return { success: true };
}

const toggleFavoriteSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
});

export async function toggleItemFavorite(
  itemId: string
): Promise<ActionResult<{ isFavorite: boolean }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = toggleFavoriteSchema.safeParse({ itemId });

  if (!parsed.success) {
    return { success: false, error: 'Invalid item ID' };
  }

  const isFavorite = await toggleItemFavoriteQuery(session.user.id, parsed.data.itemId);

  if (isFavorite === null) {
    return { success: false, error: 'Item not found or access denied' };
  }

  return { success: true, data: { isFavorite } };
}

const togglePinSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
});

export async function toggleItemPin(
  itemId: string
): Promise<ActionResult<{ isPinned: boolean }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = togglePinSchema.safeParse({ itemId });

  if (!parsed.success) {
    return { success: false, error: 'Invalid item ID' };
  }

  const isPinned = await toggleItemPinQuery(session.user.id, parsed.data.itemId);

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
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

export async function createItem(
  input: CreateItemInput
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = createItemSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  // Pro type check: file/image require Pro
  const isPro = session.user.isPro ?? false;
  if ((parsed.data.typeName === 'file' || parsed.data.typeName === 'image') && !isPro) {
    return { success: false, error: 'File and image uploads require a Pro subscription' };
  }

  // Usage limit check
  const allowed = await canCreateItem(session.user.id, isPro);
  if (!allowed) {
    return { success: false, error: 'You have reached the free tier limit of 50 items. Upgrade to Pro for unlimited items.' };
  }

  // Validate URL is required for link type
  if (parsed.data.typeName === 'link' && !parsed.data.url) {
    return { success: false, error: 'URL is required for links', fieldErrors: { url: ['URL is required'] } };
  }

  const created = await createItemQuery(session.user.id, parsed.data);

  if (!created) {
    return { success: false, error: 'Failed to create item' };
  }

  return { success: true, data: created };
}
