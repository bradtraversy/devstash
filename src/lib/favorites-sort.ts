export const FAVORITE_ITEM_SORTS = ['date-desc', 'date-asc', 'name-asc', 'name-desc', 'type'] as const;

export type FavoriteItemSort = (typeof FAVORITE_ITEM_SORTS)[number];

export const DEFAULT_FAVORITE_SORT: FavoriteItemSort = 'date-desc';

export const FAVORITE_SORT_OPTIONS: { value: FavoriteItemSort; label: string }[] = [
  { value: 'date-desc', label: 'Newest' },
  { value: 'date-asc', label: 'Oldest' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'type', label: 'Type' },
];

export function parseFavoriteSort(value: string | string[] | undefined): FavoriteItemSort {
  const raw = Array.isArray(value) ? value[0] : value;
  return (FAVORITE_ITEM_SORTS as readonly string[]).includes(raw ?? '')
    ? (raw as FavoriteItemSort)
    : DEFAULT_FAVORITE_SORT;
}

/** The Favorites URL for a sort, leaving out the default so the plain path stays canonical. */
export function favoritesPath(sort: FavoriteItemSort): string {
  return sort === DEFAULT_FAVORITE_SORT ? '/favorites' : `/favorites?sort=${sort}`;
}
