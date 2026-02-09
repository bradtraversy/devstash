'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import {
  createCollection as createCollectionQuery,
  type CreatedCollection,
} from '@/lib/db/collections';
import { parseZodErrors } from '@/lib/validation';

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

  try {
    const created = await createCollectionQuery(session.user.id, parsed.data);
    return { success: true, data: created };
  } catch {
    return { success: false, error: 'Failed to create collection' };
  }
}
