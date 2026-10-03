import { prisma } from '@/lib/prisma'
import { maxCollections, maxItems } from '@/lib/constants/limits'
import { isProUser } from '@/lib/plans'

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
  const unlimited = isProUser(isPro)

  return {
    itemCount,
    collectionCount,
    canCreateItem: unlimited || itemCount < maxItems(),
    canCreateCollection: unlimited || collectionCount < maxCollections(),
    maxItems: unlimited ? Infinity : maxItems(),
    maxCollections: unlimited ? Infinity : maxCollections(),
  }
}

export async function canCreateItem(
  userId: string,
  isPro: boolean
): Promise<boolean> {
  if (isProUser(isPro)) return true
  const count = await prisma.item.count({ where: { userId } })
  return count < maxItems()
}

export async function canCreateCollection(
  userId: string,
  isPro: boolean
): Promise<boolean> {
  if (isProUser(isPro)) return true
  const count = await prisma.collection.count({ where: { userId } })
  return count < maxCollections()
}
