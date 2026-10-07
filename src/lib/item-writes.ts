import {
  deleteItem as deleteItemQuery,
  createItem as createItemQuery,
  setItemVisibility as setItemVisibilityQuery,
  isFileType,
  UnknownCollectionError,
  type CreateItemData,
  type ItemDetail,
} from '@/lib/db/items';
import { isOwnedFileUrl } from '@/lib/file-urls';
import { canCreateItem } from '@/lib/usage';
import { itemLimitError } from '@/lib/constants/limits';
import { hasFileAccess, isProEnabled } from '@/lib/plans';
import type { ActionResult } from '@/lib/action-utils';
import type { CollectionVisibility, VisibilityUpdate } from '@/lib/constants/visibility';
import { publicPathsForItem } from '@/lib/db/public';
import { lookupPublicPaths, revalidateAfterWrite, revalidatePublicPaths } from '@/lib/public/revalidate';

/** Why a write failed, so the API can answer with the right status; server actions ignore it. */
export type WriteFailure = 'invalid' | 'forbidden' | 'not-found' | 'error';

export type WriteResult<T> = ActionResult<T> & { failure?: WriteFailure };

export interface ItemWriter {
  id: string;
  isPro: boolean;
}

const NOT_FOUND = 'Item not found or access denied';

/** The result a server action hands the browser, without the API's failure kind. */
export function toActionResult<T>(result: WriteResult<T>): ActionResult<T> {
  const plain: WriteResult<T> = { ...result };
  delete plain.failure;
  return plain;
}

export function collectionOrGenericError(error: unknown, fallback: string): WriteResult<never> {
  if (error instanceof UnknownCollectionError) {
    return {
      success: false,
      error: error.message,
      fieldErrors: { collectionIds: [error.message] },
      failure: 'invalid',
    };
  }
  console.error(fallback, error);
  return { success: false, error: fallback, failure: 'error' };
}

/** Every rule an item create follows after the caller is known and the input is parsed. */
export async function createItemForUser(
  user: ItemWriter,
  input: CreateItemData
): Promise<WriteResult<ItemDetail>> {
  const data = { ...input };
  const fileBacked = isFileType(data.typeName);
  if (fileBacked && !hasFileAccess(user.isPro)) {
    const error = isProEnabled()
      ? 'File and image uploads require a Pro subscription'
      : 'File and image items are not available right now';
    return { success: false, error, failure: 'forbidden' };
  }

  if (!(await canCreateItem(user.id, user.isPro))) {
    return { success: false, error: itemLimitError(), failure: 'forbidden' };
  }

  if (data.typeName === 'link' && !data.url) {
    return {
      success: false,
      error: 'URL is required for links',
      fieldErrors: { url: ['URL is required'] },
      failure: 'invalid',
    };
  }

  // A file reference is only valid when it points at this user's own upload namespace.
  if (fileBacked) {
    if (data.fileUrl && !isOwnedFileUrl(data.fileUrl, user.id)) {
      return {
        success: false,
        error: 'Invalid file reference',
        fieldErrors: { fileUrl: ['File must be uploaded through DevStash'] },
        failure: 'invalid',
      };
    }
  } else {
    data.fileUrl = null;
    data.fileName = null;
    data.fileSize = null;
  }

  try {
    const created = await createItemQuery(user.id, data);

    if (!created) {
      return { success: false, error: 'Failed to create item', failure: 'error' };
    }

    await revalidateAfterWrite([], () => publicPathsForItem(created.id));
    return { success: true, data: created };
  } catch (error) {
    return collectionOrGenericError(error, 'Failed to create item');
  }
}

/** Deletes through the drawer's path: the R2 file goes with the row and public pages revalidate. */
export async function deleteItemForUser(userId: string, itemId: string): Promise<WriteResult<null>> {
  const before = await lookupPublicPaths(() => publicPathsForItem(itemId));
  const deleted = await deleteItemQuery(userId, itemId);

  if (!deleted) {
    return { success: false, error: NOT_FOUND, failure: 'not-found' };
  }

  revalidatePublicPaths(before);
  return { success: true };
}

export async function setItemVisibilityForUser(
  userId: string,
  itemId: string,
  visibility: CollectionVisibility
): Promise<WriteResult<VisibilityUpdate>> {
  try {
    const before = await lookupPublicPaths(() => publicPathsForItem(itemId));
    const updated = await setItemVisibilityQuery(itemId, userId, visibility);

    if (!updated) {
      return { success: false, error: NOT_FOUND, failure: 'not-found' };
    }

    await revalidateAfterWrite(before, () => publicPathsForItem(itemId));
    return { success: true, data: updated };
  } catch {
    return { success: false, error: 'Failed to update visibility', failure: 'error' };
  }
}
