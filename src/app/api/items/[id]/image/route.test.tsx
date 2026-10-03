import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { ReactElement } from 'react';
import type { Session } from 'next-auth';
import type { ItemDetail } from '@/lib/db/items';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db/items', () => ({ getItemById: vi.fn() }));
vi.mock('@/lib/db/users', () => ({ getUserHandle: vi.fn(async () => 'brad') }));
vi.mock('@/lib/og/render', () => ({
  renderOwnerImage: vi.fn(async () => new Response('png', { headers: { 'content-type': 'image/png' } })),
}));
vi.mock('@/lib/og/preview', () => ({
  itemImage: vi.fn(async () => ({ lines: [[{ content: 'const a = 1;', color: '#d4d4d4' }]], hidden: 0 })),
}));

import { auth } from '@/auth';
import { getItemById } from '@/lib/db/items';
import { getUserHandle } from '@/lib/db/users';
import { renderOwnerImage } from '@/lib/og/render';
import { SnippetImage, snippetImageSize, type SnippetImageProps } from '@/lib/og/snippet-image';
import { GET } from './route';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockGetItemById = vi.mocked(getItemById);
const mockGetUserHandle = vi.mocked(getUserHandle);
const mockRenderOwnerImage = vi.mocked(renderOwnerImage);

function get(id: string, query = '') {
  return GET(new Request(`https://devstash.io/api/items/${id}/image${query}`), {
    params: Promise.resolve({ id }),
  });
}

const item = {
  id: 'item-1',
  title: 'useAuth Hook',
  description: null,
  content: 'const a = 1;',
  url: null,
  language: 'typescript',
  contentType: 'TEXT',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  isFavorite: false,
  isPinned: false,
  visibility: 'PRIVATE',
  shortId: 'abc12345',
  itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
  tags: [],
  collections: [],
  createdAt: new Date('2026-10-01T12:00:00Z'),
  updatedAt: new Date('2026-10-01T12:00:00Z'),
} as ItemDetail;

describe('GET /api/items/[id]/image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserHandle.mockResolvedValue('brad');
  });

  it('requires a session', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await get('item-1');

    expect(res.status).toBe(401);
    expect(mockGetItemById).not.toHaveBeenCalled();
  });

  it('answers 404 for a missing or foreign item and for a file', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: false }, expires: '' });

    mockGetItemById.mockResolvedValueOnce(null);
    expect((await get('item-1')).status).toBe(404);

    mockGetItemById.mockResolvedValueOnce({ ...item, itemType: { name: 'file', icon: 'File', color: '#6b7280' } });
    expect((await get('item-1')).status).toBe(404);

    expect(mockGetItemById).toHaveBeenCalledWith('user-1', 'item-1');
    expect(mockRenderOwnerImage).not.toHaveBeenCalled();
  });

  it('renders a private item inline with no link in the footer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: false }, expires: '' });
    mockGetItemById.mockResolvedValue(item);

    const res = await get('item-1');

    expect(res.status).toBe(200);
    const [element, size, filename] = mockRenderOwnerImage.mock.calls[0] as [ReactElement<SnippetImageProps>, unknown, unknown];
    expect(element.type).toBe(SnippetImage);
    expect(element.props.item).toEqual({
      title: 'useAuth Hook',
      language: 'typescript',
      itemType: item.itemType,
      shortId: 'abc12345',
      handle: 'brad',
      shared: false,
    });
    expect(size).toEqual(snippetImageSize(element.props.lines, 0));
    expect(filename).toBeUndefined();
  });

  it('marks a shared item, carries a missing handle as null, and names the download', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: false }, expires: '' });
    mockGetItemById.mockResolvedValue({ ...item, visibility: 'UNLISTED' });
    mockGetUserHandle.mockResolvedValue(null);

    await get('item-1', '?download=1');

    const [element, , filename] = mockRenderOwnerImage.mock.calls[0] as [ReactElement<SnippetImageProps>, unknown, unknown];
    expect(element.props.item.shared).toBe(true);
    expect(element.props.item.handle).toBeNull();
    expect(filename).toBe('useauth-hook.png');
  });

  it('reports a render failure as a 500 without leaking the error', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: false }, expires: '' });
    mockGetItemById.mockResolvedValue(item);
    mockRenderOwnerImage.mockRejectedValueOnce(new Error('wasm failed'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await get('item-1');

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'An error occurred while rendering the image' });
    spy.mockRestore();
  });
});
