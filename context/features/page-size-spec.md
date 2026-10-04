# Page Size and Pagination

## Overview

Every item list pages the same way: 25 items by default, with 50 and 100 to choose from, remembered like the Rows and Code cards choice (Brad, 2026-10-04: "25 default with the option to show 50, 100"). Home, the type pages, and collection pages already paged at 21; Favorites and Shared loaded every item and now page too.

Branch: `feature/page-size` off `main`, one implementation commit, then a pull request.

## Requirements

- `src/lib/page-size.ts` (client safe): `PAGE_SIZES` (25, 50, 100), `DEFAULT_PAGE_SIZE` (25), `PAGE_SIZE_COOKIE` (`devstash-page-size`), `parsePageSize`, `storePageSize` (a year, path `/`, SameSite Lax), and `parsePageParam`, which reads `?page=`, treats missing, invalid, zero, and negative values as page 1, and caps the page at 10,000 so an absurd value never reaches the query.
- `ListFooter` (`src/components/shared/list-footer.tsx`): the existing `Pagination` plus `PageSizeSelect` ("Show [25] per page"). The select appears once a list holds more than 25 items. Choosing a size stores the cookie and reloads the list from the first page, keeping the other query parameters (filter, sort).
- Home, `/items/[type]`, `/collections/[id]`, `/favorites`, and `/shared` read the size from the cookie and the page with `parsePageParam`, and a page past the end redirects to the list's first page.
- Favorites: `getFavoriteItems(userId, sort, page, limit)` sorts across every page. Newest and Oldest sort in the database with an id tiebreaker; Name A-Z, Name Z-A, and Type compare titles case-insensitively and numerically in JS over the favorites' ids and titles (the database collation may put capitals first), then load only the page. The sort select navigates to `/favorites?sort=...` (`src/lib/favorites-sort.ts`), and the header counts all favorite items. Favorite collections stay unpaged and keep their client sort.
- Shared: `getSharedItems(userId, page, limit)`; shared collections stay unpaged.
- `getHomeItems`, `getFavoriteItems`, and `getSharedItems` share one `paginateItems` helper. `ITEMS_PER_PAGE` goes; `/collections` keeps its own 21-card grid.

## Testing

- `parsePageSize`, `parsePageParam`, `parseFavoriteSort`, `favoritesPath`, and the paginated `getFavoriteItems` and `getSharedItems`.
- `npm run verify`, an independent review, and a browser check with 60 items: the select on Home, switching to 50 and back, paging with a filter, the Favorites sort across pages, Shared paging, a stale page past the end.
