import { prisma } from '@/lib/prisma';

const DEMO_USER_EMAIL = 'demo@devstash.io';

/**
 * Get the demo user (temporary until auth is implemented)
 */
export async function getDemoUser() {
  return prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });
}

export interface CollectionItemType {
  name: string;
  icon: string;
  color: string;
  count: number;
}

export interface CollectionWithTypes {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  itemTypes: CollectionItemType[];
  dominantColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get recent collections for a user with item type information
 * Returns collections sorted by updatedAt, with aggregated item type data
 */
export async function getRecentCollections(
  userId: string,
  limit: number = 6
): Promise<CollectionWithTypes[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      items: {
        include: {
          item: {
            include: {
              itemType: true,
            },
          },
        },
      },
    },
  });

  return collections.map((collection) => {
    // Count items by type
    const typeCounts = new Map<string, CollectionItemType>();

    for (const itemCollection of collection.items) {
      const itemType = itemCollection.item.itemType;
      const existing = typeCounts.get(itemType.id);

      if (existing) {
        existing.count++;
      } else {
        typeCounts.set(itemType.id, {
          name: itemType.name,
          icon: itemType.icon,
          color: itemType.color,
          count: 1,
        });
      }
    }

    // Convert to array and sort by count (descending)
    const itemTypes = Array.from(typeCounts.values()).sort(
      (a, b) => b.count - a.count
    );

    // Get dominant color from most-used type
    const dominantColor = itemTypes.length > 0 ? itemTypes[0].color : null;

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      isFavorite: collection.isFavorite,
      itemCount: collection.items.length,
      itemTypes,
      dominantColor,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  });
}
