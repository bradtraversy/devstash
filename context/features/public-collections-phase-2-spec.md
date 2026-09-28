# Public Collections Phase 2: Owner Controls

## Overview

Second of five phases (product spec: `Projects/Live/DevStash/SPEC.md` in the vault, requirements R040 to R046). Phase 1 added the columns and the ordering. Phase 2 gives the owner the controls that use them: a visibility setting and a copy-link button on the collection page, move up and move down on the collection's items, slug editing with history in the edit dialog, and handle editing in settings. The item drawer starts marking which of an item's collections are visible. No schema change and no migration. The public routes themselves are phase 3, so the copied links do not resolve until then.

Branch: `feature/public-collections`, long-lived, one commit per phase, no push until the feature is proven locally. Stay on the branch; do not derive a new one from the feature name. This spec covers phase 2 only.

## Requirements

### Visibility (R040)

- `setCollectionVisibility(collectionId, userId, visibility)` in `src/lib/db/collections.ts` runs in one transaction: ownership check, set `visibility`, set `publishedAt` to now the first time visibility leaves `PRIVATE` (never reset, never overwritten), and make sure the owner has a handle when the collection becomes non-private.
- `ensureUserHandle(client, userId)` in `src/lib/db/users.ts` returns the existing handle or generates one: `handleBase(email)` from `src/lib/slugs.ts` (email local part slugified, `user` when empty or reserved, the same rule as the phase 1 backfill), deduplicated with `uniqueSlug` against handles that start with the base. One retry on a unique violation.
- Server action `setCollectionVisibility({ id, visibility })` in `src/actions/collections.ts` with a Zod enum over the three values. Returns `{ visibility, publishedAt, handle }`.
- `VisibilityControl` client component on `/collections/[id]`: a select with the three options and a one-line description each. Private: only you can see this collection. Unlisted: anyone with the link can view it; it is not listed or indexed. Public: anyone can view it and search engines may index it. Change saves immediately with a toast and `router.refresh()`.

### Copy link (R041)

- When the collection is not private, the same component shows the readable URL (`{origin}/{handle}/{slug}`) as text and a Copy link button that copies the short link `{origin}/s/{shortId}` through the existing `useClipboard` hook. The origin comes from `window.location` after mount; no new environment variable (R090).
- `getCollectionById` returns `slug`, `shortId`, `visibility`, `publishedAt`, and the owner's handle so the page needs no extra query.

### Ordering (R042)

- The collection page lists every item in one column in position order across all types, replacing the three type sections (grid, image gallery, file list). Each row shows the type icon, title, type badge, and relative date like the favorites rows, opens the item drawer on click, and carries move up and move down buttons. The first item on page 1 has move up disabled; the last item on the last page has move down disabled. Pagination is unchanged.
- `moveCollectionItem(collectionId, userId, itemId, direction)` runs in one transaction. First statement: `collection.updateMany` with `where: { id, userId }` touching `updatedAt`, which both proves ownership (count 0 means not owned, without an exception) and takes the row lock that serializes concurrent reorders (the lock the phase 1 review asked for). Then read the collection's join rows in display order (`position, addedAt, itemId`), swap the item with its neighbor in that list, and write `0..n-1` back to every row whose position changed. Ties and gaps left by concurrent adds or removals are repaired on the first reorder; after that a swap touches two rows. A move at the edge is a no-op that still succeeds. Unknown collection or item returns not found.
- Server action `moveCollectionItem({ collectionId, itemId, direction })` with `direction` limited to `up` and `down`.

### Slug editing (R044)

- `updateCollection` accepts an optional `slug`. When it differs from the current slug, in the same transaction: delete any history row for `(userId, newSlug)` because the slug is live again (R013), upsert a history row `(userId, oldSlug) -> collectionId`, then update the collection. An unchanged slug writes no history. The per-user unique constraint catches races; the action maps `P2002` to a field error on `slug`.
- `createCollection` also deletes a matching history row after insert, so a freshly created collection that reuses a retired slug owns it outright.
- Validation lives in `src/lib/validation.ts`: `collectionSlugSchema` and `handleSchema` trim and lowercase, then check `SLUG_PATTERN` and the matching reserved list with plain messages ("Use lowercase letters, numbers, and hyphens", "That name is reserved").
- The edit collection dialog gains a Slug field under Name with the hint that changing it redirects the old URL, and shows the field error inline. Renaming still does not change the slug. The collection cards on `/collections` pass the slug through so the dialog works from there too.

### Handle editing (R045)

- `updateUserHandle(userId, handle)` in `src/lib/db/users.ts`; `getUserWithSettings` returns `handle`.
- Server action `updateHandle({ handle })` in `src/actions/settings.ts` using `handleSchema`; `P2002` becomes a field error "That handle is taken".
- `HandleSettings` card on the settings page: the current handle in an input, a Save button, the line "Your collection links start with {host}/{handle}/. Changing it changes those links; short links keep working." An empty handle before the first publish is shown as a placeholder, not an error.

### Item drawer (R046)

- `getItemById` and `updateItem` select `visibility` on the item's collections; `ItemDetail.collections[]` gains `visibility`. In read mode the collection badge shows a globe icon for public and a link icon for unlisted, with a title, so a user sees an item is visible before editing it. Included here rather than in phase 3 because this is the phase where a collection can stop being private.

### Verification

- Unit tests: `slugs.test.ts` for `handleBase`; `validation.test.ts` for both schemas (trim, lowercase, pattern, reserved); `db/collections.test.ts` for `setCollectionVisibility` (publishedAt set once, handle ensured only when leaving private, ownership), `moveCollectionItem` (lock statement first and on the transaction client, swap, edge no-op, gap and tie repair, not found), `updateCollection` slug change (history upsert, claimed row deleted, unchanged slug writes nothing), and `createCollection` claiming a history slug; `db/users.test.ts` for `ensureUserHandle` and `updateUserHandle`; `actions/collections.test.ts` and `actions/settings.test.ts` for the new actions (auth, validation, not found, `P2002` field errors).
- `npm run verify` passes.
- Browser check on the Docker restore with a dev server Brad starts: change visibility and see `publishedAt` and the handle populated in the database, copy the link, move an item across the page boundary, change a slug and see the history row, change the handle and see the readable URL update.

## Out Of Scope

- The public routes, short link and slug redirects, raw view, and `revalidatePath` calls (phase 3). Links copied in phase 2 return 404 until then.
- Quick add (phase 4). Images and files on public pages (phase 5).
- Drag to reorder. Handle history. Tombstones.
- Locking in `createItem` and `updateItem`. Two concurrent adds can still share a position; the reorder repairs it and the display order tiebreaks on `addedAt, itemId` in the meantime.
- Per-user tags (their own feature after public collections).

## Notes

- Positions are ordered, not contiguous, until the first reorder normalizes them. Nothing reads positions as indexes.
- The normalization writes one update per changed row inside the lock, so the first reorder after a removal near the top of a large collection rewrites most rows (the largest production collection has 112 items, the 95th percentile about 10). Follow-up if collections grow: write the changed positions in one `UPDATE ... FROM (VALUES ...)` statement.
- Touching `updatedAt` on reorder also moves the collection to the top of the recents list, which is the right signal for an edit.
- Visibility is a collection setting only. An item in one private and one public collection is visible through the public one; the drawer badge is the warning.
- The Copy link button is hidden while the collection is private because the short link redirects to a page that returns 404 for private collections.
