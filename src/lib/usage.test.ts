import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

// These tests cover Pro gating, so the switch is on unless a test turns it off.
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', 'true')
})

afterEach(() => {
  vi.unstubAllEnvs()
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

describe('with Pro off', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '')
  })

  it('allows up to the 1,000-item and 100-collection ceiling', async () => {
    mockItemCount.mockResolvedValue(999)
    mockCollectionCount.mockResolvedValue(100)

    const usage = await getUserUsage('user-1', false)

    expect(usage.canCreateItem).toBe(true)
    expect(usage.canCreateCollection).toBe(false)
    expect(usage.maxItems).toBe(1000)
    expect(usage.maxCollections).toBe(100)
  })

  it('ignores a stale Pro flag and still counts', async () => {
    mockItemCount.mockResolvedValue(1000)

    const result = await canCreateItem('user-1', true)

    expect(result).toBe(false)
    expect(mockItemCount).toHaveBeenCalled()
  })
})
