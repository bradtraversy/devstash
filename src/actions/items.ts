'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { updateItem as updateItemQuery, deleteItem as deleteItemQuery, type ItemDetail } from '@/lib/db/items';

const updateItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().nullable().optional().transform((val) => val || null),
  content: z.string().nullable().optional().transform((val) => val || null),
  url: z.string().url('Invalid URL').nullable().optional().transform((val) => val || null),
  language: z.string().trim().nullable().optional().transform((val) => val || null),
  tags: z.array(z.string().trim()).transform((tags) =>
    tags.filter((tag) => tag.length > 0)
  ),
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
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString() || 'unknown';
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return { success: false, error: 'Validation failed', fieldErrors };
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
