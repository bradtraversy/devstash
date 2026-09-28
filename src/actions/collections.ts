'use server';

import { z } from 'zod';
import {
  createCollection as createCollectionQuery,
  updateCollection as updateCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  getUserCollections as getUserCollectionsQuery,
  toggleCollectionFavorite as toggleCollectionFavoriteQuery,
  setCollectionVisibility as setCollectionVisibilityQuery,
  moveCollectionItem as moveCollectionItemQuery,
  type CreatedCollection,
  type CollectionForPicker,
  type VisibilityUpdate,
} from '@/lib/db/collections';
import { collectionSlugSchema, parseZodErrors, validateId } from '@/lib/validation';
import { isUniqueViolation } from '@/lib/db/errors';
import { COLLECTION_VISIBILITIES } from '@/lib/constants/visibility';
import { canCreateCollection } from '@/lib/usage';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';

const createCollectionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().trim().max(500, 'Description must be 500 characters or less').nullable().optional().transform((val) => val || null),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export async function createCollection(
  input: CreateCollectionInput
): Promise<ActionResult<CreatedCollection>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = createCollectionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  // Usage limit check
  const isPro = session.user.isPro ?? false;
  const allowed = await canCreateCollection(session.user.id, isPro);
  if (!allowed) {
    return { success: false, error: 'You have reached the free tier limit of 3 collections. Upgrade to Pro for unlimited collections.' };
  }

  try {
    const created = await createCollectionQuery(session.user.id, parsed.data);
    return { success: true, data: created };
  } catch {
    return { success: false, error: 'Failed to create collection' };
  }
}

export async function getUserCollections(): Promise<ActionResult<CollectionForPicker[]>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  try {
    const collections = await getUserCollectionsQuery(session.user.id);
    return { success: true, data: collections };
  } catch {
    return { success: false, error: 'Failed to fetch collections' };
  }
}

export async function toggleCollectionFavorite(
  collectionId: string
): Promise<ActionResult<{ isFavorite: boolean }>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(collectionId, 'collection ID');
  if (idError) return idError;

  const isFavorite = await toggleCollectionFavoriteQuery(collectionId, session.user.id);

  if (isFavorite === null) {
    return { success: false, error: 'Collection not found' };
  }

  return { success: true, data: { isFavorite } };
}

const updateCollectionSchema = z.object({
  id: z.string().min(1, 'Collection ID is required'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().trim().max(500, 'Description must be 500 characters or less').nullable().optional().transform((val) => val || null),
  slug: collectionSlugSchema.optional(),
});

export type UpdateCollectionInput = z.input<typeof updateCollectionSchema>;

export async function updateCollection(
  input: UpdateCollectionInput
): Promise<ActionResult<CreatedCollection>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = updateCollectionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  try {
    const updated = await updateCollectionQuery(parsed.data.id, session.user.id, {
      name: parsed.data.name,
      description: parsed.data.description,
      slug: parsed.data.slug,
    });

    if (!updated) {
      return { success: false, error: 'Collection not found' };
    }

    return { success: true, data: updated };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: { slug: ['Another collection already uses this slug'] },
      };
    }
    return { success: false, error: 'Failed to update collection' };
  }
}

const setVisibilitySchema = z.object({
  id: z.string().min(1, 'Collection ID is required'),
  visibility: z.enum(COLLECTION_VISIBILITIES),
});

export type SetCollectionVisibilityInput = z.infer<typeof setVisibilitySchema>;

export async function setCollectionVisibility(
  input: SetCollectionVisibilityInput
): Promise<ActionResult<VisibilityUpdate>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = setVisibilitySchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  try {
    const updated = await setCollectionVisibilityQuery(
      parsed.data.id,
      session.user.id,
      parsed.data.visibility
    );

    if (!updated) {
      return { success: false, error: 'Collection not found' };
    }

    return { success: true, data: updated };
  } catch {
    return { success: false, error: 'Failed to update visibility' };
  }
}

const moveItemSchema = z.object({
  collectionId: z.string().min(1, 'Collection ID is required'),
  itemId: z.string().min(1, 'Item ID is required'),
  direction: z.enum(['up', 'down']),
});

export type MoveCollectionItemInput = z.infer<typeof moveItemSchema>;

export async function moveCollectionItem(
  input: MoveCollectionItemInput
): Promise<ActionResult<null>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = moveItemSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  try {
    const moved = await moveCollectionItemQuery(
      parsed.data.collectionId,
      session.user.id,
      parsed.data.itemId,
      parsed.data.direction
    );

    if (!moved) {
      return { success: false, error: 'Item not found in this collection' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to move item' };
  }
}

export type DeleteCollectionInput = { id: string };

export async function deleteCollection(
  input: DeleteCollectionInput
): Promise<ActionResult<null>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(input.id, 'collection ID');
  if (idError) return idError;

  try {
    const deleted = await deleteCollectionQuery(input.id, session.user.id);

    if (!deleted) {
      return { success: false, error: 'Collection not found' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete collection' };
  }
}
