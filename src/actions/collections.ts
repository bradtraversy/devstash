'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import {
  createCollection as createCollectionQuery,
  updateCollection as updateCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  getUserCollections as getUserCollectionsQuery,
  toggleCollectionFavorite as toggleCollectionFavoriteQuery,
  type CreatedCollection,
  type CollectionForPicker,
} from '@/lib/db/collections';
import { parseZodErrors } from '@/lib/validation';
import { canCreateCollection } from '@/lib/usage';

const createCollectionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().trim().max(500, 'Description must be 500 characters or less').nullable().optional().transform((val) => val || null),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

interface ActionResult<T = CreatedCollection> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createCollection(
  input: CreateCollectionInput
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

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

interface GetCollectionsResult {
  success: boolean;
  data?: CollectionForPicker[];
  error?: string;
}

export async function getUserCollections(): Promise<GetCollectionsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const collections = await getUserCollectionsQuery(session.user.id);
    return { success: true, data: collections };
  } catch {
    return { success: false, error: 'Failed to fetch collections' };
  }
}

const toggleFavoriteSchema = z.object({
  id: z.string().min(1, 'Collection ID is required'),
});

interface ToggleFavoriteResult {
  success: boolean;
  data?: { isFavorite: boolean };
  error?: string;
}

export async function toggleCollectionFavorite(
  collectionId: string
): Promise<ToggleFavoriteResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = toggleFavoriteSchema.safeParse({ id: collectionId });

  if (!parsed.success) {
    return { success: false, error: 'Invalid collection ID' };
  }

  const isFavorite = await toggleCollectionFavoriteQuery(parsed.data.id, session.user.id);

  if (isFavorite === null) {
    return { success: false, error: 'Collection not found' };
  }

  return { success: true, data: { isFavorite } };
}

const updateCollectionSchema = z.object({
  id: z.string().min(1, 'Collection ID is required'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().trim().max(500, 'Description must be 500 characters or less').nullable().optional().transform((val) => val || null),
});

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

export async function updateCollection(
  input: UpdateCollectionInput
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = updateCollectionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  try {
    const updated = await updateCollectionQuery(parsed.data.id, session.user.id, {
      name: parsed.data.name,
      description: parsed.data.description,
    });

    if (!updated) {
      return { success: false, error: 'Collection not found' };
    }

    return { success: true, data: updated };
  } catch {
    return { success: false, error: 'Failed to update collection' };
  }
}

const deleteCollectionSchema = z.object({
  id: z.string().min(1, 'Collection ID is required'),
});

export type DeleteCollectionInput = z.infer<typeof deleteCollectionSchema>;

interface DeleteResult {
  success: boolean;
  error?: string;
}

export async function deleteCollection(
  input: DeleteCollectionInput
): Promise<DeleteResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = deleteCollectionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Invalid collection ID' };
  }

  try {
    const deleted = await deleteCollectionQuery(parsed.data.id, session.user.id);

    if (!deleted) {
      return { success: false, error: 'Collection not found' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete collection' };
  }
}
