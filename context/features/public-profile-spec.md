# Public Profile

## Overview

A public page at `/{handle}` listing everything a user has set to Public: their public collections as cards, then their public items as code cards, each linking to its own page. Unlisted things never appear. Milestone 16 in the product spec, after the API and MCP work.

Decisions (Brad, 2026-10-09): the profile shows the handle only, no name or avatar, since GitHub and Google names and pictures have never been public; items appear as gist-style code cards; the feature goes through merge on green CI.

Branch: `feature/public-profile` off `main`, one implementation commit, then a pull request.

## Requirements

### Who has a profile

- `/{handle}` renders only when the user has at least one Public item or Public collection. Otherwise it is a 404, the same as an unknown handle. Every account has a handle generated from its email local part, so a page for every handle would let anyone check whether an address has an account.
- Unlisted and private items and collections never appear, and do not count. Private items inside a public collection count toward that collection's item count only, as on the collection page.

### Data (`src/lib/db/public.ts`)

- `getPublicProfile(handle)`: the user by handle, then in parallel their Public collections (id, name, description, slug, item count), the count of Public collections, their Public items (id, short id, title, description, content, url, language, item type), and the count of Public items. Returns null for an unknown handle or when both counts are 0.
- Collections and items are ordered by `publishedAt` descending (nulls last) with `id` as the tiebreaker, capped at `PUBLIC_PROFILE_COLLECTION_LIMIT` and `PUBLIC_PROFILE_ITEM_LIMIT` (100 each) in `src/lib/constants/pagination.ts`. `publishedAt` only changes through visibility writes, which revalidate the profile; `updatedAt` also moves on pin and favorite toggles, which do not, and would let a private action reorder a public page. The page stays one cached page with no `?page` query, since reading search params would make every public profile render per request; past the cap it says "Showing the 100 most recently shared items" like the collection page does past its own cap.
- `hasPublicProfile(userId)` in `src/lib/db/users.ts` for the owner's link.

### Route (`src/app/[handle]/page.tsx`)

- Same shape as `[handle]/[slug]`: `generateStaticParams` returns `[]` so each profile renders on first request and stays cached until an owner write revalidates it; no session read; `normalizePublicSegment` before any query; a permanent redirect for non-canonical casing; `notFound()` when `getPublicProfile` returns null; `cache()` shares the query between `generateMetadata` and the page.
- `src/app/[handle]/not-found.tsx`: "Not found" with "There is no public profile or page at this address." and a link to DevStash. The wording stays generic because this route now catches every unknown single-segment URL. The collection route keeps its own not-found.
- Metadata from `publicProfileMetadata` in `src/lib/public/metadata.ts`: title `@{handle} | DevStash`, a description from the counts ("2 collections and 5 items shared by @brad on DevStash"), canonical `/{handle}`, Open Graph type `profile`, and the site-wide Open Graph image named explicitly, since a page that sets `openGraph` replaces the inherited image. Indexable, since only public things appear.
- `opengraph-image`, `twitter-image`, `icon`, and `apple-icon` join `RESERVED_HANDLES`, since metadata route files at those extensionless paths would win over a profile; the reserved-handles test now reads those files too.

### Page (`src/components/public/public-profile-view.tsx`)

- Wider than the collection page (`max-w-6xl`). Header: a monogram tile with the handle's first letter, `@{handle}` as the h1, and a mono line with the public counts.
- Collections section (when any): a grid of cards (1, 2, 3 columns) with a folder icon, the name, the description clamped to two lines, and the item count, each a link to `/{handle}/{slug}`.
- Items section (when any): a grid of `PublicItemCard` (1, 2, 3 columns), each a link to `/s/{shortId}`: type icon tile, title, a preview box with the first 7 lines highlighted for snippets and commands through `getCodePreviews` (plain first lines for notes and prompts, the URL and description for links, the file name for files), and the kind label (the file label for snippets, Terminal for commands, the type name otherwise).
- The card preview moves out of `ItemCodeCard` into a shared `CardPreview` in `item-row-parts.tsx`, and `TypeIconTile` takes only the item type, so the owner card and the public card render the same preview.
- Footer "Published with DevStash" like the other public pages.

### Revalidation

- `publicProfilePath(handle)` in `src/lib/public/paths.ts`.
- The path lookups in `src/lib/db/public.ts` add the owner's profile path: `toPaths` for every shared collection row and the item paths for every shared item (`publicPathsForItem` and `publicPathsForUser` now read the owner's handle). Every owner write already revalidates the union of the paths from before and after, so visibility changes, edits, deletes, collection membership changes, handle changes, and account deletion all clear the profile. Including it for unlisted rows over-revalidates harmlessly.

### Links to the profile

- On the public collection and item pages, `@{handle}` links to the profile when that page is Public (the profile then exists); on Unlisted pages it stays plain text.
- The Shared page header says Public ones are also listed on your profile, and shows a "View profile" link to `/{handle}` when `hasPublicProfile` is true.

### Wording

- The Public visibility description (`src/lib/constants/visibility.ts`) says it is listed on your profile.
- `src/content/docs/sharing.md`: the Public row of the visibility table and a short "Your profile" section.
- `src/content/legal/privacy.md`: public items and collections are also listed on your profile at `devstash.io/{handle}`; last-updated date in `src/lib/legal.ts` moves to October 9, 2026.
- The MCP `share_item` description says public items are listed on the owner's profile.
- README sharing features gain the profile.

## Testing

- `getPublicProfile`: null for an unknown handle and for a user with nothing public, Public-only filters on both lists and counts, ordering and caps, mapping.
- The page: an invalid segment 404s without a query, a case variant redirects before any lookup, a missing profile 404s, and metadata is empty for a missing profile.
- `hasPublicProfile`, `publicProfilePath`, `publicProfileMetadata` (counts and pluralization, canonical, type profile).
- Path lookups include the profile path for shared collections, shared items, and `publicPathsForUser`.
- `npm run verify`, an independent review, and a browser check with a throwaway account: profile with public collections and items, the 404 for a user with only unlisted things, the case redirect, the handle link on public and unlisted pages, revalidation after making an item public and back to private, the Shared page link, and phone width.

## Out of scope

Name, avatar, and bio; a profile Open Graph card; pagination past 100; following or search across profiles.
