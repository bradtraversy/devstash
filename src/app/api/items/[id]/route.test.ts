import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { Session } from 'next-auth'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

vi.mock('@/lib/db/items', () => ({ getItemById: vi.fn() }))

import { auth } from '@/auth'
import { getItemById, type ItemDetail } from '@/lib/db/items'
import { GET } from './route'

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>
const mockGetItemById = vi.mocked(getItemById)

const NOW = new Date('2026-09-26T12:00:00Z')
const session: Session = { user: { id: 'user-1', isPro: false }, expires: '2099-01-01T00:00:00.000Z' }

const item: ItemDetail = {
  id: 'item-1',
  title: 'useAuth Hook',
  description: null,
  content: 'export function useAuth() {}',
  url: null,
  language: 'typescript',
  contentType: 'TEXT',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  isFavorite: false,
  isPinned: false,
  itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
  tags: ['react'],
  collections: [{ id: 'col-1', name: 'React Patterns' }],
  createdAt: NOW,
  updatedAt: NOW,
}

function get(id = 'item-1') {
  return GET(new Request(`http://localhost/api/items/${id}`), { params: Promise.resolve({ id }) })
}

describe('GET /api/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(session)
  })

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await get()

    expect(res.status).toBe(401)
    expect(mockGetItemById).not.toHaveBeenCalled()
  })

  it('returns 404 when the item is missing or belongs to someone else', async () => {
    mockGetItemById.mockResolvedValue(null)

    const res = await get('item-2')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Item not found' })
    expect(mockGetItemById).toHaveBeenCalledWith('user-1', 'item-2')
  })

  it('returns the item scoped to the session user', async () => {
    mockGetItemById.mockResolvedValue(item)

    const res = await get()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: JSON.parse(JSON.stringify(item)) })
    expect(mockGetItemById).toHaveBeenCalledWith('user-1', 'item-1')
  })

  it('returns 500 when the query throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetItemById.mockRejectedValue(new Error('db down'))

    const res = await get()

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'An error occurred while fetching the item' })
    errorSpy.mockRestore()
  })
})
