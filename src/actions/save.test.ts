import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));

vi.mock('@/lib/db/save', () => ({
  copySharedItem: vi.fn(),
  copySharedCollection: vi.fn(),
  describeSharedCollection: vi.fn(),
}));

vi.mock('@/lib/usage', () => ({ getUserUsage: vi.fn() }));

import { saveSharedCollection, saveSharedItem } from './save';
import { auth } from '@/auth';
import { copySharedCollection, copySharedItem, describeSharedCollection } from '@/lib/db/save';
import { getUserUsage } from '@/lib/usage';
import { SAVE_COLLECTION_ITEM_LIMIT } from '@/lib/constants/limits';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockCopySharedItem = vi.mocked(copySharedItem);
const mockCopySharedCollection = vi.mocked(copySharedCollection);
const mockDescribeSharedCollection = vi.mocked(describeSharedCollection);
const mockGetUserUsage = vi.mocked(getUserUsage);

const freeUsage = {
  itemCount: 10,
  collectionCount: 1,
  canCreateItem: true,
  canCreateCollection: true,
  maxItems: 50,
  maxCollections: 3,
};

const proUsage = { ...freeUsage, itemCount: 500, maxItems: Infinity, maxCollections: Infinity };

function signIn(isPro = false) {
  mockAuth.mockResolvedValue({ user: { id: 'viewer', isPro }, expires: new Date().toISOString() });
}

function silenceErrors() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}

describe('saveSharedItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserUsage.mockResolvedValue(freeUsage);
    mockCopySharedItem.mockResolvedValue({ status: 'saved', itemId: 'copy-1', typeName: 'snippet' });
  });

  it('returns Unauthorized without a session', async () => {
    mockAuth.mockResolvedValue(null);

    expect(await saveSharedItem({ shortId: 'abc12345' })).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockCopySharedItem).not.toHaveBeenCalled();
  });

  it('rejects a malformed short id and lowercases a valid one', async () => {
    signIn();

    const bad = await saveSharedItem({ shortId: 'nope' });
    expect(bad.success).toBe(false);
    expect(bad.error).toBe('Validation failed');
    expect(mockCopySharedItem).not.toHaveBeenCalled();

    await saveSharedItem({ shortId: ' ABC12345 ' });
    expect(mockCopySharedItem).toHaveBeenCalledWith('viewer', 'abc12345', true);
  });

  it('passes the cap result through and reports the limit with the upgrade message', async () => {
    signIn();
    mockGetUserUsage.mockResolvedValue({ ...freeUsage, canCreateItem: false });
    mockCopySharedItem.mockResolvedValue({ status: 'limit' });

    const result = await saveSharedItem({ shortId: 'abc12345' });

    expect(mockCopySharedItem).toHaveBeenCalledWith('viewer', 'abc12345', false);
    expect(result).toEqual({
      success: false,
      error: 'You have reached the free tier limit of 50 items. Upgrade to Pro for unlimited items.',
    });
  });

  it('maps the copy statuses to messages', async () => {
    signIn();

    mockCopySharedItem.mockResolvedValueOnce({ status: 'not-found' });
    expect((await saveSharedItem({ shortId: 'abc12345' })).error).toBe('This item is no longer shared');

    mockCopySharedItem.mockResolvedValueOnce({ status: 'own' });
    expect((await saveSharedItem({ shortId: 'abc12345' })).error).toBe('This is already in your stash');

    mockCopySharedItem.mockResolvedValueOnce({ status: 'unsupported' });
    expect((await saveSharedItem({ shortId: 'abc12345' })).error).toBe('Files cannot be saved yet');
  });

  it('returns the copy on success', async () => {
    signIn(true);
    mockGetUserUsage.mockResolvedValue(proUsage);
    mockCopySharedItem.mockResolvedValue({ status: 'saved', itemId: 'copy-1', typeName: 'command' });

    expect(await saveSharedItem({ shortId: 'abc12345' })).toEqual({
      success: true,
      data: { itemId: 'copy-1', typeName: 'command' },
    });
  });

  it('reports a failure in the usage read or the copy without leaking the error', async () => {
    signIn();
    const spy = silenceErrors();

    mockGetUserUsage.mockRejectedValueOnce(new Error('db down'));
    expect(await saveSharedItem({ shortId: 'abc12345' })).toEqual({ success: false, error: 'Failed to save item' });

    mockCopySharedItem.mockRejectedValueOnce(new Error('db down'));
    expect(await saveSharedItem({ shortId: 'abc12345' })).toEqual({ success: false, error: 'Failed to save item' });

    spy.mockRestore();
  });
});

describe('saveSharedCollection', () => {
  const input = { handle: 'brad', slug: 'react-hooks' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserUsage.mockResolvedValue(freeUsage);
    mockDescribeSharedCollection.mockResolvedValue({ ownerId: 'owner', copyable: 5 });
    mockCopySharedCollection.mockResolvedValue({ status: 'saved', collectionId: 'col-new', copied: 5, skipped: 0 });
  });

  it('returns Unauthorized without a session', async () => {
    mockAuth.mockResolvedValue(null);

    expect(await saveSharedCollection(input)).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockDescribeSharedCollection).not.toHaveBeenCalled();
  });

  it('rejects segments that could not be a handle or slug and lowercases valid ones', async () => {
    signIn();

    const bad = await saveSharedCollection({ handle: 'brad', slug: 'has space' });
    expect(bad.success).toBe(false);
    expect(bad.error).toBe('Validation failed');

    await saveSharedCollection({ handle: 'Brad', slug: 'React-Hooks' });
    expect(mockDescribeSharedCollection).toHaveBeenCalledWith('brad', 'react-hooks');
    expect(mockCopySharedCollection).toHaveBeenCalledWith('viewer', 'brad', 'react-hooks');
  });

  it('answers a dead link, the owner, and an empty collection before reading usage', async () => {
    signIn();

    mockDescribeSharedCollection.mockResolvedValueOnce(null);
    expect((await saveSharedCollection(input)).error).toBe('This collection is no longer shared');

    mockDescribeSharedCollection.mockResolvedValueOnce({ ownerId: 'viewer', copyable: 5 });
    expect((await saveSharedCollection(input)).error).toBe('This is already in your stash');

    mockDescribeSharedCollection.mockResolvedValueOnce({ ownerId: 'owner', copyable: 0 });
    expect((await saveSharedCollection(input)).error).toBe('This collection has nothing that can be saved yet');

    expect(mockGetUserUsage).not.toHaveBeenCalled();
    expect(mockCopySharedCollection).not.toHaveBeenCalled();
  });

  it('refuses a collection larger than the save limit for everyone', async () => {
    signIn(true);
    mockGetUserUsage.mockResolvedValue(proUsage);
    mockDescribeSharedCollection.mockResolvedValue({ ownerId: 'owner', copyable: SAVE_COLLECTION_ITEM_LIMIT + 1 });

    const result = await saveSharedCollection(input);

    expect(result.error).toBe(`Collections with more than ${SAVE_COLLECTION_ITEM_LIMIT} items cannot be saved yet`);
    expect(mockCopySharedCollection).not.toHaveBeenCalled();
  });

  it('refuses when the free collection cap is reached', async () => {
    signIn();
    mockGetUserUsage.mockResolvedValue({ ...freeUsage, canCreateCollection: false });

    const result = await saveSharedCollection(input);

    expect(result.error).toBe(
      'You have reached the free tier limit of 3 collections. Upgrade to Pro for unlimited collections.'
    );
    expect(mockCopySharedCollection).not.toHaveBeenCalled();
  });

  it('refuses when the copies would pass the free item cap and says how many slots remain', async () => {
    signIn();
    mockGetUserUsage.mockResolvedValue({ ...freeUsage, itemCount: 48 });

    const result = await saveSharedCollection(input);

    expect(result.error).toBe(
      'Saving this collection needs 5 item slots and your free plan has 2 left. Upgrade to Pro for unlimited items.'
    );
    expect(mockCopySharedCollection).not.toHaveBeenCalled();
  });

  it('never applies the slot check to a Pro account', async () => {
    signIn(true);
    mockGetUserUsage.mockResolvedValue(proUsage);
    mockDescribeSharedCollection.mockResolvedValue({ ownerId: 'owner', copyable: SAVE_COLLECTION_ITEM_LIMIT });

    const result = await saveSharedCollection(input);

    expect(result.success).toBe(true);
    expect(mockCopySharedCollection).toHaveBeenCalled();
  });

  it('maps the copy statuses to messages when the source changed under the save', async () => {
    signIn();

    mockCopySharedCollection.mockResolvedValueOnce({ status: 'not-found' });
    expect((await saveSharedCollection(input)).error).toBe('This collection is no longer shared');

    mockCopySharedCollection.mockResolvedValueOnce({ status: 'own' });
    expect((await saveSharedCollection(input)).error).toBe('This is already in your stash');

    mockCopySharedCollection.mockResolvedValueOnce({ status: 'empty' });
    expect((await saveSharedCollection(input)).error).toBe('This collection has nothing that can be saved yet');
  });

  it('returns the new collection with the copied and skipped counts', async () => {
    signIn();
    mockCopySharedCollection.mockResolvedValue({ status: 'saved', collectionId: 'col-new', copied: 4, skipped: 1 });

    expect(await saveSharedCollection(input)).toEqual({
      success: true,
      data: { collectionId: 'col-new', copied: 4, skipped: 1 },
    });
  });

  it('reports a failure in the usage read or the copy without leaking the error', async () => {
    signIn();
    const spy = silenceErrors();

    mockGetUserUsage.mockRejectedValueOnce(new Error('db down'));
    expect(await saveSharedCollection(input)).toEqual({ success: false, error: 'Failed to save collection' });

    mockCopySharedCollection.mockRejectedValueOnce(new Error('db down'));
    expect(await saveSharedCollection(input)).toEqual({ success: false, error: 'Failed to save collection' });

    spy.mockRestore();
  });
});
