export const LIST_LAYOUTS = ['rows', 'cards'] as const;

export type ListLayout = (typeof LIST_LAYOUTS)[number];

export const DEFAULT_LIST_LAYOUT: ListLayout = 'rows';

/** Read on the server so the first render already has the chosen layout. */
export const LIST_LAYOUT_COOKIE = 'devstash-list-layout';

const LIST_LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseListLayout(value: string | null | undefined): ListLayout {
  return (LIST_LAYOUTS as readonly string[]).includes(value ?? '')
    ? (value as ListLayout)
    : DEFAULT_LIST_LAYOUT;
}

/** Browser only: remembers the layout for a year on every page. */
export function storeListLayout(layout: ListLayout): void {
  document.cookie = `${LIST_LAYOUT_COOKIE}=${layout}; path=/; max-age=${LIST_LAYOUT_COOKIE_MAX_AGE}; samesite=lax`;
}
