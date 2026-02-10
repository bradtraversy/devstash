'use server';

import { auth } from '@/auth';
import {
  getSearchableItems,
  type SearchableItem,
} from '@/lib/db/items';
import {
  getSearchableCollections,
  type SearchableCollection,
} from '@/lib/db/collections';

export interface SearchData {
  items: SearchableItem[];
  collections: SearchableCollection[];
}

interface SearchDataResult {
  success: boolean;
  data?: SearchData;
  error?: string;
}

export async function getSearchData(): Promise<SearchDataResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const [items, collections] = await Promise.all([
      getSearchableItems(session.user.id),
      getSearchableCollections(session.user.id),
    ]);

    return {
      success: true,
      data: { items, collections },
    };
  } catch {
    return { success: false, error: 'Failed to fetch search data' };
  }
}
