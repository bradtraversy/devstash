export const PAGE_SIZES = [25, 50, 100] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 25;

/** Read on the server so every item list renders the chosen size on the first request. */
export const PAGE_SIZE_COOKIE = 'devstash-page-size';

const PAGE_SIZE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// A page number beyond any real list, so a huge value never reaches the query as an out-of-range offset.
export const MAX_PAGE = 10000;

export function parsePageSize(value: string | null | undefined): PageSize {
  const size = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(size) ? (size as PageSize) : DEFAULT_PAGE_SIZE;
}

export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = parseInt(raw ?? '1', 10);
  return Number.isFinite(page) && page > 1 ? Math.min(page, MAX_PAGE) : 1;
}

/** Browser only: remembers the page size for a year on every list. */
export function storePageSize(size: PageSize): void {
  document.cookie = `${PAGE_SIZE_COOKIE}=${size}; path=/; max-age=${PAGE_SIZE_COOKIE_MAX_AGE}; samesite=lax`;
}
