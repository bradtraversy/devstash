# Public Collections Phase 3: Public Page

## Overview

Third of five phases (product spec: `Projects/Live/DevStash/SPEC.md` in the vault, requirements R020 to R038 plus R021 revalidation). Phases 1 and 2 gave collections a visibility setting, a slug, a short id, ordered items, and the owner controls. Phase 3 makes the copied links resolve: a server-rendered public page at `/{handle}/{slug}` for unlisted and public collections, the short link redirect at `/s/{shortId}`, redirects from old slugs, a raw markdown view, Shiki rendering for code, a copy button on every block, noindex for unlisted, Open Graph tags, and cache revalidation from every owner write that can change a visible page. This is the proof point of the feature. No schema change and no migration.

Branch: `feature/public-collections`, long-lived, one commit per phase, no push until the feature is proven locally. Stay on the branch; do not derive a new one from the feature name. This spec covers phase 3 only.

## Requirements

### Public routes (R030, R031, R032, R037)

- `src/app/[handle]/[slug]/page.tsx` renders a collection whose owner's handle is `{handle}`, whose slug is `{slug}`, and whose visibility is not `PRIVATE`. Anything else is `notFound()`: unknown handle, unknown slug, private collection, or an owner without a handle. Both segments are lowercased before lookup; a segment that fails `SLUG_PATTERN` is a 404 before any query runs. The page reads no session, imports nothing from `@/auth`, and renders outside `DashboardLayout` (root layout only, which already sets the dark class, the fonts, and the toaster).
- A request whose segments are not already lowercase gets `permanentRedirect` to the lowercase path before any query runs, so the cached response for a case variant depends on the URL alone and never needs revalidating. A slug found in `CollectionSlugHistory` for that owner redirects to the canonical `/{handle}/{slug}`; a history row whose collection is private is a 404, so the redirect never confirms a private collection exists. A live slug always wins over history (R013).
- `src/app/s/[shortId]/route.ts` (`GET`): lowercases the id, rejects anything not matching `^[a-z0-9]{8}$` with 404, looks up the collection by `shortId` with its owner's handle, returns 404 when it is missing, private, or the owner has no handle, and otherwise responds `302` with `Location` built from `request.url`'s origin plus `/{handle}/{slug}`. No session, no environment variable.
- `src/app/[handle]/[slug]/not-found.tsx` renders a small page: "This collection is private or does not exist" with a link to `/`.
- `src/lib/db/public.ts` holds every query the public routes use. `getPublicCollection(handle, slug)` returns the collection (id, name, description, slug, shortId, visibility, publishedAt, updatedAt, owner handle) and its items through the join in `COLLECTION_ITEM_ORDER`, `take: PUBLIC_PAGE_ITEM_LIMIT` (200, new constant in `src/lib/constants/pagination.ts`), plus the total join count so the page can say when it is truncated. `resolveShortId(shortId)` and `resolveSlugHistory(handle, oldSlug)` return `{ handle, slug }` for a non-private collection or null. No function in this module takes a user id from the request; the visibility filter is inside every query.
- Reserved names are already in place: `s` is in `RESERVED_HANDLES`, `raw` is in `RESERVED_SLUGS`, and the `slugs.test.ts` route scan skips `[handle]`. No change to `src/proxy.ts`; its matcher stays `/dashboard/:path*`, so the auth wrapper never runs on public routes.

### Rendering (R020, R022, R023, R024, R033, R038)

- Add `shiki` (4.x) as a dependency. `src/lib/languages.ts` exports `SHIKI_LANGUAGES`, a map from every id in `LANGUAGES` (`src/lib/constants/editor.ts`) except `plaintext` to its Shiki grammar id, and `languageLabel(id)` which returns the `LANGUAGES` label or the raw id. `src/lib/public/highlight.ts` builds one lazily created highlighter with `createHighlighterCore`, the JavaScript regex engine (no WASM), the `dark-plus` theme (matches the Monaco `vs-dark` look the app already uses), and the grammars from `SHIKI_LANGUAGES` loaded through fine-grained imports. `highlightCode(code, languageId)` returns HTML; an unknown, missing, or `plaintext` language renders through Shiki's built-in `text` language so the output shape is the same. Shiki escapes content, so the HTML is safe to inject. Leading whitespace is preserved (`<pre>`); the module never trims content.
- `src/components/public/`: server components for the page shell, the header, and one block component per item type, plus one client component, `copy-button.tsx`, that wraps `useClipboard`. Nothing under this folder imports Monaco, the drawer, or anything from `src/components/layout`.
- Header: collection name, description when present, `by @{handle}` as plain text (no public profile page exists), item count, `Updated {date}` from `updatedAt` using `formatLongDate`, a `Copy as markdown` button that copies the same document the raw view returns (built on the server with `siteOrigin()` for the source line), and a `Markdown` link to `/{handle}/{slug}.md`. Footer: a one-line `Published with DevStash` link to `/`.
- Each block is a `<section id="b{n}">` (1-based display position, R033) with a header (type icon from `ITEM_TYPE_ICONS` in the type color, title, an anchor link to `#b{n}`, a label, and the copy button) and a body by type:
  - snippet: Shiki HTML for `content` with `language`; label is `languageLabel(language)`.
  - command: Shiki HTML with the `bash` grammar; label is `Terminal`.
  - note and prompt: `react-markdown` with `remark-gfm` inside the app's existing `prose prose-invert` styling, raw HTML off (the default). Fenced code inside the markdown renders through the same Shiki block as a snippet (a `pre` override reads the fence language from the `language-` class), with `fenceLanguage` in `src/lib/languages.ts` mapping common fence names such as `js`, `ts`, `sh`, and `yml` onto the editor's ids; inline code keeps the default element.
  - link: a card showing the title and the URL, `target="_blank"`, `rel="noopener noreferrer nofollow ugc"`. A URL that is not `http` or `https` (possible on items written before URL validation) renders as text without an anchor.
  - image: `next/image` from `fileUrl` when the URL starts with `r2PublicUrl()` (the same host the dashboard gallery already renders from, so no new access path); otherwise the file card below. `sizes` set for a single column; `alt` is the title.
  - file: a card with the file icon, title, `fileName`, and `formatFileSize(fileSize)`. No download link and no copy button; public file access is phase 5.
  - Item `description` renders under the block title in muted text when present.
- Copy button text by type: snippet, note, prompt copy `content`; command copies `commandCopyText(content)`, which strips a leading `$ ` from every line (pure function in `src/lib/public/copy.ts`); link copies `url`; image copies `fileUrl`; file has no copy button. The button shows the check icon for two seconds through `useClipboard`.
- When the join count exceeds `PUBLIC_PAGE_ITEM_LIMIT`, a line under the last block says `Showing the first 200 items`. An empty collection shows `This collection has no items yet.`
- Public pages carry no pagination, no sidebar, no sign-in prompt, and no client JavaScript beyond the copy button and the toaster already in the root layout (R037).

### Raw markdown view (R034)

- `src/app/[handle]/[slug]/raw/route.ts` (`GET`) resolves the collection with the same rules as the page (lowercase, `SLUG_PATTERN`, non-private only; an old slug redirects `301` to the canonical raw URL) and returns `text/markdown; charset=utf-8`. Not cached (Next's default for route handlers); it runs the same query per request.
- `src/lib/public/markdown.ts` exports `collectionToMarkdown(collection, canonicalUrl)`, a pure function (the canonical URL comes from `siteOrigin()` in both the raw route and the page's copy button, so the two documents are identical): `# {name}`, the description, `by @{handle}`, `Source: {canonicalUrl}`, then per item `## {title}`, the description when present, and a body by type. Snippet and command bodies are fenced with the language id (`bash` for commands, `text` when unknown) and `title="{title}"` in the fence info with double quotes in the title escaped as `\"`. The fence uses one more backtick than the longest backtick run in the content, minimum three, so content containing fences survives. Note and prompt content is inlined as markdown. Link: `[{title}]({url})`. Image: `![{title}]({fileUrl})`. File: `{fileName} ({size})`. Output ends with one newline.
- `next.config.ts` gains `rewrites()` with `{ source: '/:handle/:slug.md', destination: '/:handle/:slug/raw' }` (afterFiles, the default, so static routes and files still win). The product spec placed this rewrite in `src/proxy.ts`; it lives in `next.config.ts` instead so public requests never enter the NextAuth wrapper and the proxy matcher stays dashboard-only.

### Metadata (R035, R036)

- `src/lib/public/metadata.ts` exports `publicCollectionMetadata(collection, canonicalPath): Metadata`, a pure function the page's `generateMetadata` calls: `title` `{name} by @{handle} | DevStash`, `description` from the collection description or `{count} items by @{handle} on DevStash`, `alternates.canonical`, `openGraph` (`type: 'article'`, title, description, url), `twitter.card: 'summary_large_image'`, and `robots: { index: false, follow: false }` when visibility is `UNLISTED`. Public collections leave `robots` unset (indexable).
- `src/app/opengraph-image.tsx` renders the one static site-wide image (R036) with `ImageResponse` from `next/og`: 1200 by 630, dark background, the DevStash name and tagline. It has no params, so Next builds it once. File-based metadata merges into every route's Open Graph tags, including the homepage, so the public page sets no `images` of its own.
- The root layout sets `metadataBase` from `siteOrigin()` (`NEXT_PUBLIC_APP_URL` with the `http://localhost:3000` fallback the email module already uses), so canonical and Open Graph URLs are absolute. No new environment variable (R090).

### Revalidation (R021)

- Public pages use no dynamic API, so Next caches each rendered path (and each `notFound()` result) in the full route cache until `revalidatePath` clears it. `src/lib/public/revalidate.ts` exports `revalidatePublicPaths(paths: Iterable<string>)`, which dedupes and calls `revalidatePath` once per path.
- `src/lib/db/public.ts` also exports the path lookups the actions use: `publicPathsForCollections(collectionIds)`, `publicPathsForItem(itemId)`, and `publicPathsForUser(userId)`, each returning `/{handle}/{slug}` for the non-private collections involved plus `/{handle}/{oldSlug}` for every slug history row of those collections (empty when none). Retired slugs are cached as redirects, so a collection that goes private, is deleted, or moves handle must clear them too, or a stale redirect would confirm the collection exists. `publicCollectionPath(handle, slug)` in `src/lib/public/paths.ts` builds the string.
- Actions revalidate the union of the paths before and after the write, because the before path may now need to 404 or redirect and the after path may hold a cached 404 from before publishing:
  - `setCollectionVisibility`: before and after for the collection.
  - `createCollection`: after, the owner's path for the new slug whatever the collection's visibility (`publicPathForOwnerSlug`), because taking a retired slug deletes its history row and the cached redirect at that path must go too.
  - `updateCollection`: before and after (name, description, and slug changes all show on the page; a slug change moves the path), plus the owner's path for the new slug when one is sent, for the same reclaimed-slug reason.
  - `moveCollectionItem`: after.
  - `deleteCollection`: before.
  - `updateHandle` (settings): before and after for every non-private collection of the user.
  - `createItem`: after, for the item's collections.
  - `updateItem`: before and after for the item's collections (membership can change).
  - `deleteItem`: before.
  - `importData`: after, for every collection the import touched. Imported collections are created private, so this is normally empty, but items imported into existing collections need it.
  - Account deletion (`DELETE /api/auth/delete-account`): before, for every non-private collection of the user, since the delete cascades through their collections.
  - `toggleItemFavorite`, `toggleItemPin`, `toggleCollectionFavorite`, and `updateEditorPreferences` change nothing on a public page and do not revalidate.
- Revalidation runs after the write succeeds and never changes the action's result. `lookupPublicPaths` wraps every path read so a lookup failure is logged and counts as no paths, and `revalidateAfterWrite(before, lookup)` does the after read and the union. A failed before-lookup does not block the write.

### Owner page

- In `VisibilityControl`, the readable URL under the select becomes a link (`target="_blank"`, `rel="noreferrer"`) so the owner can open the public page directly. No other owner-side change.

### Verification

- Unit tests (Vitest, node): `src/lib/public/copy.test.ts` (`$ ` stripped per line, other lines untouched, empty content); `src/lib/languages.test.ts` (every `LANGUAGES` id except `plaintext` has a grammar id, no extra ids) and `src/lib/public/highlight.test.ts` (every registry grammar loads and highlights a sample, unknown language falls back to text, `<script>` in content is escaped in the output); `src/lib/public/markdown.test.ts` (fixture collection to expected markdown, fence length grows past backtick runs, quotes in titles escaped, command fence is `bash`, file line has no link); `src/lib/public/metadata.test.ts` (noindex only for unlisted, canonical and Open Graph URL, description fallback); `src/lib/db/public.test.ts` (visibility filter and handle match in every query, `take` is the limit, order is `COLLECTION_ITEM_ORDER`, resolvers return null for private, unknown, and handleless owners, path lookups skip private collections); `src/lib/public/revalidate.test.ts` (dedupe, one `revalidatePath` per path, empty list is a no-op); route tests `src/app/s/[shortId]/route.test.ts` (invalid id 404 without a query, unknown 404, private 404, 302 with the canonical `Location` on the request origin, uppercase id accepted) and `src/app/[handle]/[slug]/raw/route.test.ts` (404 cases, 301 for a history slug, content type, body from `collectionToMarkdown`); action tests in `src/actions/*.test.ts` mock `next/cache` and `@/lib/db/public` and assert the before-and-after path union for each action listed above and no revalidation for the toggles.
- `npm run verify` passes.
- Browser check on the Docker restore with a dev server Brad starts: open a published collection at its readable URL and see every block type in position order; copy a snippet, a multi-line command with `$ ` prompts, and a link; follow a `#b{n}` anchor; open `/s/{shortId}` and land on the canonical URL; change the slug and confirm the old URL redirects; open the `.md` URL and see the markdown; set the collection private and confirm the readable URL, the short link, and the raw URL all 404; view source on an unlisted collection and see the noindex meta, the canonical link, and the Open Graph tags. Then, with a production build (`npm run build && npm run start`), load a public page twice, edit an item title in the dashboard, reload the public page and see the change without a restart, then set the collection private and see the 404.

## Out Of Scope

- Quick add (phase 4). Public file downloads and any change to the download route (phase 5). The root page decision (phase 5).
- Generated per-collection Open Graph images, a JSON API, public search or listings, tombstones for deleted collections, per-block copy counts, author name or avatar on the public page, handle history redirects.
- Caching the raw route.
- Per-user tags (their own feature after public collections).

## Notes

- The public page and its 404s are cached per path, so a change of visibility, slug, or handle that is not followed by revalidation leaves a stale page or a stale 404 in production. Every write path that can affect a visible page is listed above; the action tests are the guard.
- Development mode renders every request fresh, so caching and revalidation only show in the production build step of the browser check.
- `permanentRedirect` from a page is a 308 and `NextResponse.redirect(url, 302)` in the short link route is a 302. The product spec's 301 for old slugs applies to the raw route, where the status is set directly; the page uses Next's helper.
- Old-slug redirects are permanent, and a retired slug can be reclaimed by another collection later (phase 2 deletes the history row). Browsers that cached the redirect keep following it until their cache expires. Accepted.
- Shiki grammars load lazily, one grammar the first time a page needs it, and stay in memory for the server instance. The JavaScript regex engine avoids the WASM file in the Vercel function. Production runs the engine in forgiving mode so one incompatible pattern degrades a block instead of failing the page; the highlight test compiles every grammar under the strict engine so an incompatibility fails loudly in CI.
- `react-markdown` 10 renders in server components without hooks; the same component the drawer uses on the client serves the public page on the server.
- `NEXT_PUBLIC_APP_URL` must be set to `https://devstash.io` (with the scheme) in the Vercel production environment for absolute canonical and Open Graph URLs; the root layout now parses it with `new URL`, so a scheme-less value fails every route at startup instead of producing bad links. It is already used by the Stripe and email code, so this is a check at the phase 5 closeout, not a new variable.
