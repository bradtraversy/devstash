import { prisma } from '@/lib/prisma'

export const MAX_ITEMS = 50
export const MAX_COLLECTIONS = 3

interface UserUsage {
  itemCount: number
  collectionCount: number
  canCreateItem: boolean
  canCreateCollection: boolean
  maxItems: number
  maxCollections: number
}

export async function getUserUsage(
  userId: string,
  isPro: boolean
): Promise<UserUsage> {
  const [itemCount, collectionCount] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
  ])

  return {
    itemCount,
    collectionCount,
    canCreateItem: isPro || itemCount < MAX_ITEMS,
    canCreateCollection: isPro || collectionCount < MAX_COLLECTIONS,
    maxItems: isPro ? Infinity : MAX_ITEMS,
    maxCollections: isPro ? Infinity : MAX_COLLECTIONS,
  }
}

export async function canCreateItem(
  userId: string,
  isPro: boolean
): Promise<boolean> {
  if (isPro) return true
  const count = await prisma.item.count({ where: { userId } })
  return count < MAX_ITEMS
}

export async function canCreateCollection(
  userId: string,
  isPro: boolean
): Promise<boolean> {
  if (isPro) return true
  const count = await prisma.collection.count({ where: { userId } })
  return count < MAX_COLLECTIONS
}
