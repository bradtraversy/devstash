# Shared Page and Sidebar

## Overview

Third of the four features from the app shell prototype. A new `/shared` page lists every item and collection the user has shared, with the link, Copy link, and Stop sharing on each, so the user can see and manage everything that is public in one place. The sidebar gains Home, Shared, and Favorites above the types (Brad chose the by-type sidebar on 2026-10-03), and the top-bar Favorites star goes, since Favorites now has a sidebar entry.

Branch: `feature/shared-page` off `main`, one implementation commit, then a pull request.

## Requirements

### Data

- `getSharedItems(userId)` in `src/lib/db/items.ts`: the user's items whose visibility is not private, as `ItemWithType`, newest update first.
- `getSharedCollections(userId)` in `src/lib/db/collections.ts`: id, name, slug, short id, visibility, and item count for the user's collections that are not private, newest update first.
- The page reads the owner's handle with `getUserHandle` to show a collection's readable path.

### `/shared` page (`src/app/shared/page.tsx`)

- Server rendered inside `DashboardLayout`, redirecting to sign-in without a session, like `/favorites`.
- Header "Shared" with one line: anyone with one of these links can open it, and public ones can show up in search engines.
- Items section with a count and the Rows / Code cards switch. It uses `ItemList` in the chosen layout. Each row shows the readable short link (`devstash.io/s/{shortId}`) where other lists show the description, and has a Stop sharing button after the usual actions.
- Collections section with a count: one row per collection with a folder icon, the name, the readable path (`/{handle}/{slug}`), the item count, the visibility pill, Copy link (the `/s/{shortId}` short link the collection page copies), and Stop sharing. The row opens `/collections/{id}`.
- Stop sharing calls `setItemVisibility` or `setCollectionVisibility` with `PRIVATE`, then toasts "Stopped sharing. Share it again to bring the same link back." (short ids never change) and refreshes. Errors toast the action's message, and the button shows a pending state.
- Empty state when nothing is shared: "Nothing shared yet" with a line pointing at Share on any row, and a link to the dashboard.
- `shared` joins `RESERVED_HANDLES` so a future profile at `/{handle}` cannot collide with the route.

### Sidebar

- `PrimaryNav` (`src/components/layout/primary-nav.tsx`): Home (`/dashboard`), Shared (`/shared`), Favorites (`/favorites`) with icons and the active state the type links use. It works in the collapsed desktop sidebar (icons only, with titles) and in the mobile drawer (closes it on click).
- Rendered above Types in the desktop sidebar and in `SidebarNav` for the mobile drawer, with a separator after it.
- The top-bar Favorites star is removed.

### Row detail

- `ItemRow`, `ItemCodeCard`, and `ItemList` take an optional `detail` of `description` (the default) or `link`. With `link`, the row shows the readable short link in the description slot (from md up), and the card shows it under the title.

## Testing

- `getSharedItems` and `getSharedCollections` filter by owner and exclude private, order newest first, and map the result.
- The reserved-handles test covers the new route.
- `npm run verify`, an independent review, and a browser check of `/shared` with shared items and collections, Stop sharing on both, the empty state, the sidebar at desktop (expanded and collapsed) and in the mobile drawer.

## Out of scope

Home and the dashboard are the next feature.
