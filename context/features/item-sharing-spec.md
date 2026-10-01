# Item Sharing

## Overview

Any item can be shared by link, not only a whole collection. An item gains a visibility setting (private, unlisted, public), a permanent short id, and a public page at `/s/{shortId}` rendered by the same block components the public collection page uses. Three entry points create the habit: a Share button in the top bar that opens a paste-and-share dialog and hands back a link, a Share button in the item drawer that publishes an existing item and copies its link in one click, and Copy link on the cards of items and collections that are already shared. The public page carries a raw text URL so commands can be piped into a shell, page metadata with noindex for unlisted items, and revalidation from every owner write that can change it.

This reverses the product spec's "no per-item visibility" non-goal (recorded in `Projects/Live/DevStash/SPEC.md` in the vault, 2026-09-30). Everything else in that spec stands: private by default, links are forever, copy first, server first, items are blocks.

One migration, no new dependency, no new environment variable. The homepage, generated Open Graph images, a public profile page, and the free-tier cap are separate features that follow this one.

Branch: `feature/item-sharing` off `main` (already created), one implementation commit, then a pull request.

## Requirements

### Data model

- `Item` gains `visibility CollectionVisibility @default(PRIVATE)`, `shortId String @unique`, and `publishedAt DateTime?`. The enum is reused as is; the Prisma enum and the `CollectionVisibility` TypeScript type keep their names, renaming is churn for nothing. `publishedAt` is stamped the first time an item leaves private and never cleared.
- One migration, `item_sharing`, adds the three columns, backfills `shortId` for every existing item with the same lateral-join loop the phase 1 migration used for collections (random 8 characters over `[a-z0-9]` per row, regenerating duplicates until none remain), then sets `NOT NULL` and creates the unique index. The loop's duplicate condition also treats an id already present in `collections."shortId"` as a duplicate, so no item short id shadows a collection short id at backfill time. The migration is applied locally with `prisma migrate dev` on the Docker restore and verified against an empty database with the CI drift check; production runs `prisma migrate deploy` after the merge.
- Short ids for new items come from `generateShortId()`. Every code path that inserts an item sets one: `createItem` in `src/lib/db/items.ts`, the import transaction in `src/actions/import.ts`, and `prisma/seed.ts`. `createItem` runs its transaction with the same one-retry-on-unique-violation wrapper `createCollection` uses, and checks `collection.findUnique({ where: { shortId } })` inside the transaction before inserting, regenerating on a hit, so `/s/{shortId}` always resolves one thing. Import generates one id per item without the cross-table check; a collision there fails the import with its normal error, which at these volumes is a theoretical case.
- `src/lib/constants/visibility.ts`: the private option's description becomes `Only you can see this` so `VISIBILITY_OPTIONS` reads correctly for items and collections; the other two descriptions already do.

### Public routes

- `src/app/s/[shortId]/route.ts` becomes `src/app/s/[shortId]/page.tsx` (the same segment cannot hold both). The page reads no session, renders outside `DashboardLayout`, exports `generateStaticParams` returning `[]` like the collection page, and shares one lookup between `generateMetadata` and the page through `cache`.
  - The id is validated against `SHORT_ID_PATTERN` after lowercasing; a malformed id is `notFound()` before any query. An id that is not already lowercase gets `permanentRedirect` to the lowercase path before any lookup, so a cached case variant depends on the URL alone.
  - `resolveShortLink(shortId)` in `src/lib/db/public.ts` runs the collection and item lookups in parallel and returns `{ kind: 'collection', handle, slug }`, `{ kind: 'item', item }`, or null. A collection resolves before an item when both match (the backfill and the create path make that unreachable in practice).
  - A collection result calls `redirect()` to `publicCollectionPath(handle, slug)`. This is a 307 where the route handler sent a 302; browsers treat both the same for GET, and the product spec's R031 is updated to say so. An item result renders `PublicItemView`. Null is `notFound()`.
  - `src/app/s/[shortId]/not-found.tsx` renders `Nothing here` with `This link is private or does not exist` and a link to `/`.
  - The redirect for a collection is now cached in the full route cache, so `/s/{shortId}` joins the collection's revalidation paths (see Revalidation).
- `src/app/s/[shortId]/raw/route.ts` (`GET`): validates and lowercases the id the same way, `301` to the lowercase raw path for a case variant, then resolves. A collection responds `301` to `publicRawPath(handle, slug)`. A text item (snippet, command, note, prompt) responds with its content as `text/plain; charset=utf-8`; a command's content goes through `commandCopyText` so `curl -s .../raw | sh` runs the lines the copy button copies. Link, image, and file items are `notFound()`. Not cached, like the collection raw route.
- `src/lib/db/public.ts` gains `getPublicItem(shortId)` returning `PublicSharedItem` (`PublicItem` plus `shortId`, `visibility`, `publishedAt`, `updatedAt`, and the owner `handle`), null when the item is missing, private, or the owner has no handle. The visibility filter is inside the query; nothing in this module takes a user id from a request. `resolveShortId` stays for collections and `resolveShortLink` composes it with `getPublicItem`.
- `src/lib/public/paths.ts` gains `publicShortPath(shortId)` (`/s/{shortId}`) and `publicShortRawPath(shortId)` (`/s/{shortId}/raw`).

### Rendering

- `src/components/public/public-item-view.tsx` (server component): the same shell as the collection view (`max-w-3xl`, dark background), a top line in mono muted text with `@{handle}`, the type label (`languageLabel` for snippets, `Terminal` for commands, otherwise the capitalised type name), and `Updated {formatLongDate(updatedAt)}`; then one `ItemBlock` in standalone mode; then, for text items, a small row with a `Raw` link to `publicShortRawPath` (`FileText` icon, same styling as the collection header's Markdown link); then the footer `Published with DevStash` linking to `/`, followed by `Share your own` linking to `/`.
- `ItemBlock` gains an optional `standalone` prop (default false). When true the title renders as `h1` instead of `h2` and the `#b{n}` anchor link is omitted; `position` is not required in that mode. Everything else (type icon, label, description, copy button, body by type) is unchanged, so a snippet shared on its own reads exactly as it does inside a collection page.
- Image items render inline through `ImageBlock` when `isRenderableImage`; file items render the `FileBlock` card with no download, as on collection pages (public file access stays in phase 5). Because a file page without a download would confuse the recipient, the Share controls are not offered for `file` items until phase 5; every other type can be shared.

### Metadata

- `src/lib/public/metadata.ts` gains `publicItemMetadata(item, canonicalPath)`, pure: `title` `{title} by @{handle} | DevStash`, `description` from the item description truncated at 200 characters like collections, otherwise `{Label} {type} by @{handle} on DevStash` where the label is `languageLabel(language)` for snippets with a language (`JavaScript snippet by @brad on DevStash`) and the bare capitalised type otherwise (`Command by @brad on DevStash`); `alternates.canonical`, `openGraph` (`type: 'article'`, title, description, url, siteName), `twitter.card: 'summary_large_image'`, and `robots: { index: false, follow: false }` when visibility is `UNLISTED`. The static site-wide Open Graph image applies through the root file-based metadata as it does for collections.

### Revalidation

- `publicPathsForItem(itemId)` also returns `publicShortPath(item.shortId)` when the item itself is non-private, alongside the collection paths it already returns. `createItem`, `updateItem`, and `deleteItem` already call it before and after their writes, so item pages are cleared without further changes to those actions.
- `publicPathsForUser(userId)` also returns `publicShortPath` for every non-private item of the user, so a handle change (`updateHandle`) and account deletion clear item pages.
- `publicPathsForCollections` and the collection half of `publicPathsForUser` also return `publicShortPath(collection.shortId)` for each non-private collection (`PATH_SELECT` adds `shortId`), because the short link redirect is cached now.
- `setItemVisibility` (new action) revalidates the union of the item's paths before and after the write through `revalidateAfterWrite`, exactly as `setCollectionVisibility` does: the before path may now need to 404, the after path may hold a cached 404 from before publishing.
- `toggleItemFavorite`, `toggleItemPin`, and the search and AI actions change nothing on a public page and stay as they are.

### Server

- `src/lib/db/items.ts`:
  - `ItemWithType` and `ItemDetail` gain `visibility: CollectionVisibility` and `shortId: string`; `toItemWithType` and `toItemDetail` map them; `createItem` returns them.
  - `CreateItemData` gains `visibility?: CollectionVisibility` (default `PRIVATE`). Inside the transaction, when the visibility is not private, `createItem` stamps `publishedAt` and calls `ensureUserHandle(tx, userId)` so a first share from the dialog also creates the handle, the same rule as a first collection publish.
  - `setItemVisibility(itemId, userId, visibility): Promise<VisibilityUpdate | null>`, the item twin of `setCollectionVisibility`: one transaction that proves ownership, updates `visibility`, stamps `publishedAt` on the first departure from private, ensures the handle when leaving private, and returns `{ visibility, publishedAt, handle }`; the unique-violation retry for two concurrent first publishes generating the same handle is shared with the collection version through a small helper in `src/lib/db/users.ts` rather than copied.
- `src/actions/items.ts`:
  - `createItemSchema` gains `visibility: z.enum(COLLECTION_VISIBILITIES).optional().default('PRIVATE')`. The Pro type check, the free-tier item cap, and the file namespace check are unchanged; a share from the dialog counts as one item like any other.
  - `setItemVisibility({ id, visibility })` with `validateId` and the enum, `getAuthedSession`, the query above, `Item not found` when the query returns null, `Failed to update visibility` on error, and the revalidation described above. `ActionResult<VisibilityUpdate>`.
- `src/hooks/use-clipboard.ts`: `copy(text, message?)` with the message defaulting to the current `Copied to clipboard`, so link copies can say `Link copied` without a second hook.

### Share dialog

- `src/components/items/share-dialog-provider.tsx`: a context (`useShareDialog()` returning `openShareDialog`) mounted in `DashboardLayout` above the top bar and the palette, owning the dialog's open state and rendering `ShareSnippetDialog` once, remounted with a fresh form on every opening. The top bar, the mobile `+` menu, and the command palette all open it through the context.
- Top bar: a `Share` button (`Share2` icon, outline, desktop only) placed before `New Collection`; the mobile `+` dropdown gains `Share snippet` above `New Item`. The command palette gets an `Actions` group above `Items` with one entry, `Share a snippet` (`Share2` icon), which closes the palette and opens the dialog; the strict filter matches it on `share` and `snippet`.
- `src/components/items/share-snippet-dialog.tsx`, title `Share a snippet`, description `Paste code, get a link. It is saved to your stash as an unlisted item.`:
  - A Code / Command toggle (two toggle buttons, Code selected by default).
  - A `Textarea` for the content: monospace, 12 rows, autofocus, placeholder `Paste your code here`. A plain textarea, not Monaco, so the dialog opens instantly; highlighting shows on the public page.
  - For Code, a Language `Select` over `LANGUAGES` (the same list the item dialog uses). Its value is the user's choice once they pick one; until then it follows `guessLanguage(content)` as the content changes, falling back to `plaintext`. For Command there is no language field; the item is created with `language: null` and renders through the command block.
  - A `Title` input, optional, whose placeholder shows the default that will be used: `defaultShareTitle(kind, language)`, which is `{languageLabel(language)} snippet` for Code with a real language, `Snippet` for plain text, and `Command` for Command.
  - `Create link`, disabled while the content is blank or a request is running. It calls `createItem` with `typeName` `snippet` or `command`, the title (trimmed, or the default), the content, the language, no tags, no collections, and `visibility: 'UNLISTED'`. Validation and cap errors surface as toasts the way the item dialog shows them.
  - On success the dialog swaps to a result state: the link `${origin}/s/${shortId}` in a read-only input, a `Copy` button, an `Open` link (`target="_blank"`), and `Done`. The link is copied immediately with the toast `Link copied`. `router.refresh()` runs so the new item appears in lists. Closing or reopening the dialog resets it to the empty form.
- `src/lib/languages.ts` gains `guessLanguage(content): string | null` and `defaultShareTitle(kind, language)`. `guessLanguage` is an ordered list of high-confidence rules over the first 2000 characters and returns an id from `LANGUAGES` or null: a shebang naming `bash`, `sh`, `zsh`, `python`, or `node`; `<?php`; `<!DOCTYPE html` or `<html`; `package main` or `func` with `:=` for Go; `fn main()`, `let mut`, or `println!` for Rust; `#include <` with `std::` for C++ and without for C; `using System;` for C#; `public static void main` or `System.out` for Java; a `def name(...):` line or `from x import y` for Python; `interface Name {`, `: string`, `: number`, or `import type` for TypeScript; `import React`, `require(`, `console.log(`, `=> {`, or a `function name(` line for JavaScript; `SELECT ... FROM` or `CREATE TABLE` for SQL; a document that starts with `{` or `[` and parses as JSON; a first line `FROM ` followed by a `RUN ` line for Dockerfile; `query {`, `mutation {`, or `type Name {` with a `!` for GraphQL; a `$var:` or `@mixin` for SCSS, otherwise a `selector { prop: value; }` shape for CSS; a leading `---` line or three `key: value` lines with no braces or semicolons for YAML; lines starting with `$ ` for bash. Prose, an empty string, and anything unmatched return null. Ordered so the specific rules win (TypeScript before JavaScript, SCSS before CSS, Go and Rust before the JavaScript rules).

### Item drawer

- Read-mode action bar: a `Share` button between `Pin` and `Copy` (`Link2` icon), hidden for `file` items. When the item is private it calls `setItemVisibility({ id, visibility: 'UNLISTED' })`, updates the drawer's item state from the result, copies the link with the toast `Link copied. Anyone with it can view this item.`, and calls `router.refresh()`. When the item is already shared it only copies the link with `Link copied`. The button is emerald (`#10b981`) when the item is shared and muted otherwise, the way `Pin` turns blue.
- Below the type and language badges, in read mode and only when the item is shared: one row with a compact visibility `Select` (`w-32`, `VISIBILITY_OPTIONS`) and the short link as a truncated mono link (`target="_blank"`, `rel="noreferrer"`). Changing the select calls `setItemVisibility`, reverts on failure with the error toast, toasts `Item is now {label}` on success, and refreshes. Choosing Private removes the row and returns the Share button to muted.
- Edit mode is unchanged. The existing collection badges with their visibility marks stay; an item can be visible through its own link and through a public collection at the same time, and the drawer shows both.

### Cards and lists

- `src/components/items/visibility-mark.tsx`: a small shared component that renders `Link2` for `UNLISTED` (title `Unlisted, anyone with the link can view`), `Globe` for `PUBLIC` (title `Public`), and nothing for `PRIVATE`, in `text-muted-foreground` at the size the card's star and pin use.
- `ItemCard`: the mark in the title row after the pin; for shared items a second hover button, `Copy link` (`Link2` icon), to the left of the existing copy button, copying `${origin}/s/${shortId}` through `useClipboard` with `Link copied`. `FavoriteItemRow`, `FileListRow`, and `ImageThumbnailCard` show the mark only, in their title rows.
- `CollectionWithTypes` gains `visibility` and `shortId` (selected in `getRecentCollections` and `getAllCollections`), and `CollectionCard` shows the mark next to the favorite star. Its dropdown gains one entry: `Copy link` (`Link2`) when the collection is shared, or `Share` (`Share2`) when it is private, which calls `setCollectionVisibility({ id, visibility: 'UNLISTED' })`, copies the link with `Link copied. Anyone with it can view this collection.`, and refreshes. The collection page's `VisibilityControl` is unchanged.

### Verification

- Unit tests (Vitest, node):
  - `src/lib/languages.test.ts`: one positive case per `guessLanguage` rule, the ordering cases (TypeScript over JavaScript, SCSS over CSS, Go over JavaScript), prose and empty input return null, every returned id is in `LANGUAGES`; `defaultShareTitle` for a language, plain text, and command.
  - `src/lib/db/public.test.ts`: `getPublicItem` carries the visibility filter and the handle select, returns null for private, unknown, and handleless owners, and maps the shared item shape; `resolveShortLink` prefers the collection, returns the item, returns null; the path lookups now include `/s/{shortId}` for non-private items and collections and skip private ones.
  - `src/lib/public/metadata.test.ts`: `publicItemMetadata` title, description fallback with and without a language, canonical, Open Graph, and noindex only for unlisted.
  - `src/lib/public/paths.test.ts` (or the existing paths coverage): the two new path builders.
  - `src/app/s/[shortId]/raw/route.test.ts` (replacing `route.test.ts`): malformed id 404 without a query, case variant 301, collection 301 to its raw path, snippet body and content type, command body through `commandCopyText`, link and file 404.
  - `src/app/s/[shortId]/page.test.tsx` with `next/navigation` and the view mocked: malformed id 404 and case variant redirect before any query, collection redirect to its readable URL, item rendered, unknown 404, and `generateMetadata` empty for collections and unknown ids. The Vitest include widens to `src/**/*.test.{ts,tsx}` for it.
  - `src/actions/items.test.ts`: `setItemVisibility` auth, validation, not found, success, and the before-and-after revalidation union; `createItem` passes `visibility` through and defaults to private.
  - `src/lib/db/items.test.ts` if present, otherwise the action tests with the query mocked: `createItem` sets a short id, stamps `publishedAt` and ensures the handle only when not private, and retries once on a unique violation; `setItemVisibility` stamps `publishedAt` once, ensures the handle when leaving private, and returns null for another user's item.
  - `src/actions/collections.test.ts` and `src/actions/import.test.ts`: existing expectations updated for the short id on imported items and the `/s/` paths in revalidation.
  - `src/hooks/use-clipboard` needs no test; it is a component hook.
- `npm run verify` passes, and `prisma migrate diff` against the migrated schema is clean (the CI drift check).
- Scripted check on the Docker restore after `prisma migrate dev`: every item has an 8-character lowercase alphanumeric short id, no two items share one, no item short id equals a collection short id, every item is private with a null `publishedAt`.
- Browser check with a dev server Brad starts, signed in as Brad's account on the Docker restore: open Share from the top bar, paste a JavaScript function, see the language guess land on JavaScript, create the link and land on the result state with the link copied; open the link in a private window and see the highlighted snippet with the copy button, `@handle`, and the Raw link, and fetch the raw URL with curl; open the same item in the drawer, see the emerald Share button and the visibility row, switch to Public then Private and confirm the public URL 404s; share an existing command from the drawer and confirm the raw URL strips the `$ ` prompts; see the marks and Copy link on the item cards and a collection card; share a private collection from its card menu; open `/s/{collectionShortId}` and confirm it still lands on the collection page; view source on the item page and see the noindex meta, the canonical link, and the Open Graph tags. Then with a production build (`npm run build && npm run start`), load an item page twice, edit its title in the dashboard, reload and see the change, then set it private and see the 404.

## Out Of Scope

- Generated Open Graph images per item and collection, a `Save to your stash` button for signed-in viewers, and the free-tier cap removal (next feature).
- A public profile page at `/{handle}` listing shared items and collections (after that).
- The homepage repositioning and the paste-to-share flow through sign-in (after the profile page).
- Public file downloads and the Share controls on `file` items (phase 5).
- A readable slug for items; `/s/{shortId}` is the canonical item URL.
- Visibility or short ids in the JSON export and import; imported items are always private and get fresh ids.
- Any change to the collection page's `VisibilityControl`, the handle settings card, search, or the AI helpers.

## Notes

- `/s/{shortId}` serving items directly while redirecting collections is deliberate: one short link shape for everything, opaque ids for the paste-and-share case the way gists and pastes work, readable lesson URLs kept for collections.
- The dialog uses a plain textarea instead of the Monaco editor so it opens instantly from any page; judgement call, easy to swap later.
- Sharing an item ensures the owner has a handle even though the item URL does not contain it; the public page shows `@{handle}` and the coming profile page needs it.
- An item shared on its own and also placed in a private collection stays visible through its link; the drawer's collection badges and the visibility row make both facts visible before editing.
- The free-tier cap still counts every shared snippet as an item. Removing it is scoped with the Open Graph work so the cap does not bite in the share loop for long.
