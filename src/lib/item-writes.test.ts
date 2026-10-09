import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

vi.mock('@/lib/db/items', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/db/items')>()),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  setItemVisibility: vi.fn(),
}));

vi.mock('@/lib/usage', () => ({ canCreateItem: vi.fn() }));

vi.mock('@/lib/db/public', () => ({ publicPathsForItem: vi.fn() }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  createItem as createItemQuery,
  updateItem as updateItemQuery,
  deleteItem as deleteItemQuery,
  setItemVisibility as setItemVisibilityQuery,
  UnknownCollectionError,
  type CreateItemData,
  type ItemDetail,
  type UpdateItemData,
} from '@/lib/db/items';
import { canCreateItem } from '@/lib/usage';
import { publicPathsForItem } from '@/lib/db/public';
import { revalidatePath } from 'next/cache';
import { itemLimitError } from '@/lib/constants/limits';
import {
  createItemForUser,
  deleteItemForUser,
  setItemVisibilityForUser,
  toActionResult,
  updateItemForUser,
  type WriteResult,
} from './item-writes';

const mockCreateQuery = vi.mocked(createItemQuery);
const mockUpdateQuery = vi.mocked(updateItemQuery);
const mockDeleteQuery = vi.mocked(deleteItemQuery);
const mockSetVisibilityQuery = vi.mocked(setItemVisibilityQuery);
const mockCanCreateItem = vi.mocked(canCreateItem);
const mockPublicPaths = vi.mocked(publicPathsForItem);
const mockRevalidatePath = vi.mocked(revalidatePath);
const revalidated = () => mockRevalidatePath.mock.calls.map((call) => call[0]);

const R2 = 'https://pub-test.r2.dev';
const FREE = { id: 'user-1', isPro: false };
const PRO = { id: 'user-1', isPro: true };

const snippetInput: CreateItemData = {
  typeName: 'snippet',
  title: 'Example',
  description: null,
  content: 'const x = 1;',
  url: null,
  language: 'typescript',
  tags: [],
  visibility: 'PRIVATE',
};

const fileInput: CreateItemData = {
  ...snippetInput,
  typeName: 'file',
  content: null,
  language: null,
  fileUrl: `${R2}/user-1/1700000000-notes.pdf`,
  fileName: 'notes.pdf',
  fileSize: 1024,
};

const created = {
  id: 'item-1',
  shortId: 'abc12345',
  title: 'Example',
  visibility: 'UNLISTED',
} as ItemDetail;

const updateInput: UpdateItemData = {
  title: 'Updated',
  description: null,
  content: 'const x = 2;',
  url: null,
  language: 'typescript',
  tags: ['typescript'],
};

let consoleError: ReturnType<typeof vi.spyOn>;

// These tests cover Pro gating, so the switch is on unless a test turns it off.
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', 'true');
  vi.stubEnv('R2_PUBLIC_URL', R2);
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  mockCanCreateItem.mockResolvedValue(true);
  mockPublicPaths.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  consoleError.mockRestore();
});

describe('createItemForUser', () => {
  it('refuses a file for a free user as forbidden before the limit check', async () => {
    const result = await createItemForUser(FREE, fileInput);

    expect(result).toEqual({
      success: false,
      error: 'File and image uploads require a Pro subscription',
      failure: 'forbidden',
    });
    expect(mockCanCreateItem).not.toHaveBeenCalled();
    expect(mockCreateQuery).not.toHaveBeenCalled();
  });

  it('refuses files for everyone while Pro is off', async () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '');

    const result = await createItemForUser(PRO, { ...fileInput, typeName: 'image' });

    expect(result).toEqual({
      success: false,
      error: 'File and image items are not available right now',
      failure: 'forbidden',
    });
  });

  it('returns the item limit as forbidden', async () => {
    mockCanCreateItem.mockResolvedValue(false);

    const result = await createItemForUser(FREE, snippetInput);

    expect(result).toEqual({ success: false, error: itemLimitError(), failure: 'forbidden' });
    expect(mockCanCreateItem).toHaveBeenCalledWith('user-1', false);
    expect(mockCreateQuery).not.toHaveBeenCalled();
  });

  it('refuses a link without a url as invalid', async () => {
    const result = await createItemForUser(FREE, { ...snippetInput, typeName: 'link', content: null });

    expect(result).toEqual({
      success: false,
      error: 'URL is required for links',
      fieldErrors: { url: ['URL is required'] },
      failure: 'invalid',
    });
  });

  it("refuses a file URL outside the user's namespace as invalid", async () => {
    const result = await createItemForUser(PRO, { ...fileInput, fileUrl: `${R2}/user-2/1700000000-notes.pdf` });

    expect(result).toEqual({
      success: false,
      error: 'Invalid file reference',
      fieldErrors: { fileUrl: ['File must be uploaded through DevStash'] },
      failure: 'invalid',
    });
    expect(mockCreateQuery).not.toHaveBeenCalled();
  });

  it("keeps a Pro user's own file reference", async () => {
    mockCreateQuery.mockResolvedValue(created);

    await createItemForUser(PRO, fileInput);

    expect(mockCreateQuery).toHaveBeenCalledWith('user-1', expect.objectContaining({ fileUrl: fileInput.fileUrl }));
  });

  it('drops file fields from a text item without changing the input', async () => {
    mockCreateQuery.mockResolvedValue(created);
    const input = { ...snippetInput, fileUrl: `${R2}/user-2/x.pdf`, fileName: 'x.pdf', fileSize: 9 };

    await createItemForUser(FREE, input);

    expect(mockCreateQuery).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ fileUrl: null, fileName: null, fileSize: null })
    );
    expect(input.fileUrl).toBe(`${R2}/user-2/x.pdf`);
  });

  it('reports an unknown collection as invalid on collectionIds', async () => {
    mockCreateQuery.mockRejectedValue(new UnknownCollectionError());

    const result = await createItemForUser(FREE, { ...snippetInput, collectionIds: ['col-other'] });

    expect(result).toEqual({
      success: false,
      error: 'One of the selected collections no longer exists',
      fieldErrors: { collectionIds: ['One of the selected collections no longer exists'] },
      failure: 'invalid',
    });
  });

  it('turns any other thrown error into a generic error', async () => {
    mockCreateQuery.mockRejectedValue(new Error('connection reset'));

    const result = await createItemForUser(FREE, snippetInput);

    expect(result).toEqual({ success: false, error: 'Failed to create item', failure: 'error' });
    expect(consoleError).toHaveBeenCalled();
  });

  it('returns an error when the query creates nothing', async () => {
    mockCreateQuery.mockResolvedValue(null as never);

    const result = await createItemForUser(FREE, snippetInput);

    expect(result).toEqual({ success: false, error: 'Failed to create item', failure: 'error' });
  });

  it("creates the item for the user and revalidates the new item's public paths", async () => {
    mockCreateQuery.mockResolvedValue(created);
    mockPublicPaths.mockResolvedValue(['/s/abc12345', '/s/abc12345/raw']);

    const result = await createItemForUser(FREE, { ...snippetInput, visibility: 'UNLISTED' });

    expect(result).toEqual({ success: true, data: created });
    expect(mockCreateQuery).toHaveBeenCalledWith('user-1', expect.objectContaining({ visibility: 'UNLISTED' }));
    expect(mockPublicPaths).toHaveBeenCalledWith('item-1');
    expect(revalidated()).toEqual(['/s/abc12345', '/s/abc12345/raw']);
  });
});

describe('deleteItemForUser', () => {
  it('returns not-found when the item is missing or not owned', async () => {
    mockPublicPaths.mockResolvedValue(['/s/abc12345']);
    mockDeleteQuery.mockResolvedValue(false);

    const result = await deleteItemForUser('user-1', 'item-1');

    expect(result).toEqual({ success: false, error: 'Item not found or access denied', failure: 'not-found' });
    expect(mockDeleteQuery).toHaveBeenCalledWith('user-1', 'item-1');
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('looks up the public paths before deleting and revalidates them after', async () => {
    mockPublicPaths.mockResolvedValue(['/s/abc12345']);
    mockDeleteQuery.mockResolvedValue(true);

    const result = await deleteItemForUser('user-1', 'item-1');

    expect(result).toEqual({ success: true });
    expect(mockPublicPaths.mock.invocationCallOrder[0]).toBeLessThan(mockDeleteQuery.mock.invocationCallOrder[0]);
    expect(revalidated()).toEqual(['/s/abc12345']);
  });
});

describe('updateItemForUser', () => {
  it('returns not-found without revalidating when the item is missing or foreign', async () => {
    mockPublicPaths.mockResolvedValue(['/s/abc12345']);
    mockUpdateQuery.mockResolvedValue(null);

    const result = await updateItemForUser('user-1', 'item-1', updateInput);

    expect(result).toEqual({ success: false, error: 'Item not found or access denied', failure: 'not-found' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('reports an unknown collection as invalid', async () => {
    mockUpdateQuery.mockRejectedValue(new UnknownCollectionError());

    const result = await updateItemForUser('user-1', 'item-1', { ...updateInput, collectionIds: ['col-other'] });

    expect(result).toEqual({
      success: false,
      error: 'One of the selected collections no longer exists',
      fieldErrors: { collectionIds: ['One of the selected collections no longer exists'] },
      failure: 'invalid',
    });
  });

  it('looks up public paths before the write and revalidates paths from before and after', async () => {
    mockPublicPaths.mockResolvedValueOnce(['/brad/react']).mockResolvedValueOnce(['/s/abc12345/raw', '/brad/node']);
    mockUpdateQuery.mockResolvedValue(created);

    const result = await updateItemForUser('user-1', 'item-1', updateInput);

    expect(result).toEqual({ success: true, data: created });
    expect(mockPublicPaths.mock.invocationCallOrder[0]).toBeLessThan(mockUpdateQuery.mock.invocationCallOrder[0]);
    expect(mockUpdateQuery).toHaveBeenCalledWith('user-1', 'item-1', updateInput);
    expect(revalidated()).toEqual(['/brad/react', '/s/abc12345/raw', '/brad/node']);
  });
});

describe('setItemVisibilityForUser', () => {
  const update = { visibility: 'UNLISTED' as const, publishedAt: new Date('2026-10-07T12:00:00Z'), handle: 'brad' };

  it('returns not-found when the item is missing or not owned', async () => {
    mockSetVisibilityQuery.mockResolvedValue(null);

    const result = await setItemVisibilityForUser('user-1', 'item-1', 'UNLISTED');

    expect(result).toEqual({ success: false, error: 'Item not found or access denied', failure: 'not-found' });
    expect(mockSetVisibilityQuery).toHaveBeenCalledWith('item-1', 'user-1', 'UNLISTED');
  });

  it('turns a thrown error into a generic error', async () => {
    mockSetVisibilityQuery.mockRejectedValue(new Error('connection reset'));

    const result = await setItemVisibilityForUser('user-1', 'item-1', 'PUBLIC');

    expect(result).toEqual({ success: false, error: 'Failed to update visibility', failure: 'error' });
  });

  it('returns the update and revalidates the paths from before and after', async () => {
    mockSetVisibilityQuery.mockResolvedValue(update);
    mockPublicPaths.mockResolvedValueOnce([]).mockResolvedValueOnce(['/s/abc12345']);

    const result = await setItemVisibilityForUser('user-1', 'item-1', 'UNLISTED');

    expect(result).toEqual({ success: true, data: update });
    expect(revalidated()).toEqual(['/s/abc12345']);
  });
});

describe('toActionResult', () => {
  it('strips only the failure kind', () => {
    const result: WriteResult<null> = {
      success: false,
      error: 'Validation failed',
      fieldErrors: { url: ['URL is required'] },
      failure: 'invalid',
    };

    expect(toActionResult(result)).toEqual({
      success: false,
      error: 'Validation failed',
      fieldErrors: { url: ['URL is required'] },
    });
    expect(toActionResult(result)).not.toHaveProperty('failure');
    expect(result.failure).toBe('invalid');
  });

  it('keeps the data on success', () => {
    expect(toActionResult({ success: true, data: { id: 'item-1' } })).toEqual({
      success: true,
      data: { id: 'item-1' },
    });
  });
});
