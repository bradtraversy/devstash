import { findOwnedItems } from '@/lib/db/items';
import { deleteItemForUser } from '@/lib/item-writes';

export interface DeletedItem {
  id: string;
  title: string;
}

export type BulkDeleteResult =
  | { deleted: DeletedItem[]; notFound: string[]; failedPartway?: never }
  | { deleted: DeletedItem[]; notFound?: never; failedPartway: true };

/** Deletes the caller's items among `refs` (ids or short ids) one at a time, reporting what went and what was not found. */
export async function deleteItemsForUser(userId: string, refs: string[]): Promise<BulkDeleteResult> {
  const unique = [...new Set(refs)];
  const owned = await findOwnedItems(userId, unique);
  const deleted: DeletedItem[] = [];
  const removedRefs = new Set<string>();

  for (const item of owned) {
    try {
      const result = await deleteItemForUser(userId, item.id);
      if (!result.success) continue;
    } catch (error) {
      // Report what was already removed, since those deletes cannot be taken back.
      console.error('Bulk delete stopped partway', error);
      return { deleted, failedPartway: true };
    }
    deleted.push({ id: item.id, title: item.title });
    removedRefs.add(item.id);
    removedRefs.add(item.shortId);
  }

  return { deleted, notFound: unique.filter((ref) => !removedRefs.has(ref)) };
}
