import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  getUserUsage,
  canCreateItem,
  canCreateCollection,
} from './usage'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    item: {
      count: vi.fn(),
    },
    collection: {
      count: vi.fn(),
    },
  },
}))

const mockItemCount = vi.mocked(prisma.item.count)
const mockCollectionCount = vi.mocked(prisma.collection.count)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUserUsage', () => {
  it('returns correct counts and canCreate booleans', async () => {
    mockItemCount.mockResolvedValue(10)
    mockCollectionCount.mockResolvedValue(1)

    const usage = await getUserUsage('user-1', false)

    expect(usage.itemCount).toBe(10)
    expect(usage.collectionCount).toBe(1)
    expect(usage.canCreateItem).toBe(true)
    expect(usage.canCreateCollection).toBe(true)
  })

  it('sets canCreateItem to false at exactly 50 items', async () => {
    mockItemCount.mockResolvedValue(50)
    mockCollectionCount.mockResolvedValue(0)

    const usage = await getUserUsage('user-1', false)

    expect(usage.canCreateItem).toBe(false)
    expect(usage.itemCount).toBe(50)
  })

  it('sets canCreateCollection to false at exactly 3 collections', async () => {
    mockItemCount.mockResolvedValue(0)
    mockCollectionCount.mockResolvedValue(3)

    const usage = await getUserUsage('user-1', false)

    expect(usage.canCreateCollection).toBe(false)
    expect(usage.collectionCount).toBe(3)
  })
})

describe('canCreateItem', () => {
  it('returns true when under limit', async () => {
    mockItemCount.mockResolvedValue(49)

    const result = await canCreateItem('user-1', false)

    expect(result).toBe(true)
  })

  it('returns false when at limit (50 items)', async () => {
    mockItemCount.mockResolvedValue(50)

    const result = await canCreateItem('user-1', false)

    expect(result).toBe(false)
  })

  it('returns true for Pro users regardless of count', async () => {
    const result = await canCreateItem('user-1', true)

    expect(result).toBe(true)
    expect(mockItemCount).not.toHaveBeenCalled()
  })
})

describe('canCreateCollection', () => {
  it('returns true when under limit', async () => {
    mockCollectionCount.mockResolvedValue(2)

    const result = await canCreateCollection('user-1', false)

    expect(result).toBe(true)
  })

  it('returns false when at limit (3 collections)', async () => {
    mockCollectionCount.mockResolvedValue(3)

    const result = await canCreateCollection('user-1', false)

    expect(result).toBe(false)
  })

  it('returns true for Pro users regardless of count', async () => {
    const result = await canCreateCollection('user-1', true)

    expect(result).toBe(true)
    expect(mockCollectionCount).not.toHaveBeenCalled()
  })
})
