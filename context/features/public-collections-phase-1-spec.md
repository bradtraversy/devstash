# Public Collections Phase 1: Schema and Ordering

## Overview

First of five phases that let a collection be published as one ordered page of its items (product spec: `Projects/Live/DevStash/SPEC.md` in the vault, requirements R010 to R016 and R090 to R093). Phase 1 adds the columns, the join ordering, the slug history table, and the backfills, and makes every code path that writes the item-collection join preserve positions. It ships no visible feature: private stays the default, no route changes, no UI. The owner's collection page starts listing items in position order, which for existing data equals the order items were added.

Branch: `feature/public-collections`, long-lived, one commit per phase, no push until the feature is proven locally. This spec covers phase 1 only.

## Requirements

### Data model (R010 to R014)

| Model | Change |
|-------|--------|
| `Collection` | `visibility` enum `PRIVATE`, `UNLISTED`, `PUBLIC`, default `PRIVATE`; `slug` required, unique per user; `shortId` required, globally unique, immutable, 8 characters from `[a-z0-9]`; `publishedAt` nullable |
| `User` | `handle` nullable, unique, lowercase |
| `ItemCollection` | `position` required integer, 0-based; index on `(collectionId, position)` |
| `CollectionSlugHistory` | new table: `id`, `userId`, `oldSlug`, `collectionId` (cascade on collection delete), `createdAt`; unique on `(userId, oldSlug)`; index on `collectionId`. Phase 1 creates it; phase 2 writes it |
| `ItemType` | partial unique index on `name` where `userId` is null, closing audit finding T5-9 (duplicate system types) |

Handles and slugs match `^[a-z0-9][a-z0-9-]{0,62}$`.

Reserved handles: every top-level segment under `src/app` including route groups (`api`, `collections`, `dashboard`, `favorites`, `items`, `profile`, `settings`, `upgrade`, `sign-in`, `register`, `forgot-password`, `reset-password`, `verify-email`) plus `s`, `search`, `new`, `edit`, `login`, `logout`, `auth`, `admin`, `static`, `public`, `_next`. Reserved slugs: `raw`, `new`, `edit`.

### Migration (R092)

One Prisma migration, `public_collections_phase_1`, with the backfill SQL committed in the migration file, in this order:

1. Add the enum and the new columns as nullable, plus the history table and the item type partial index.
2. Backfill `shortId` with a correlated per-row expression (an uncorrelated subquery evaluates once and gives every row the same id).
3. Backfill `slug` from `name`: lowercase, runs of anything outside `[a-z0-9]` become one hyphen, hyphens trimmed from both ends, cut to 63 characters, `collection` when empty or reserved. Deduplicate per user in a `DO` block that walks collections in `createdAt, id` order and appends `-2`, `-3`, and so on until the slug is free. Literal collisions (a collection already named `foo-2`) are handled by the same loop.
4. Backfill `handle` from the email local part with the same slugify, `user` when empty or reserved, deduplicated across all users in `createdAt, id` order the same way.
5. Backfill `position` as `row_number() over (partition by collectionId order by addedAt, itemId) - 1`. The `itemId` tiebreak makes the result deterministic when two rows share an `addedAt`.
6. Set `slug`, `shortId`, and `position` to `NOT NULL`, then add the unique constraints and the `(collectionId, position)` index. Adding them after the backfill is the proof that the backfill produced unique values.

`prisma migrate dev` runs it against the Docker restore of production. Production applies it through the existing `prisma migrate deploy` on the production build only after the whole feature merges (R093).

### Code (R015, R016)

- `src/lib/slugs.ts`: `slugify`, `isValidSlug`, `RESERVED_HANDLES`, `RESERVED_SLUGS`, and a `uniqueSlug(base, taken)` helper that appends the numeric suffix. The migration's SQL slugify and this function must agree, and a test pins the same inputs to the same outputs for both.
- `src/lib/short-id.ts`: `generateShortId()` using `node:crypto` (`randomInt` per character over the 36-character alphabet). No new dependency; `nanoid` is only a transitive package here.
- `createCollection`: computes the slug from the name with the per-user uniqueness loop and generates the short id, retrying once on a `P2002` for `shortId`.
- `updateCollection`: unchanged. Renaming does not change the slug; slug editing with history is phase 2 (R044).
- `createItem`: runs inside a transaction and inserts each join row at `max(position) + 1` for that collection.
- `updateItem`: the existing membership diff appends new rows at `max(position) + 1`; removed rows leave gaps. Positions are ordered, not contiguous; phase 2's reorder swaps two rows.
- `importData`: appends in file order, so items imported into one collection keep their export order.
- `prisma/seed.ts`: `createMany` rows carry explicit positions; the demo collections and user get a slug, short id, and handle through the same helpers.
- `getItemsByCollection`: queries the join ordered by `position` ascending and includes the item, replacing the pinned-then-updated order. Pagination keeps its skip and take. The page's split into regular, image, and file sections is unchanged; each section shows its items in position order.
- `deleteCollection`: unchanged. Cascades remove join and history rows; the short id is never reissued (R016).

### Verification

- Unit tests: `slugs.test.ts` (format, reserved names, suffixing, and a test that reads `src/app` and fails when a top-level segment is missing from `RESERVED_HANDLES`), `short-id.test.ts` (length, alphabet, no repeats across 10,000 draws), and extensions of the existing `items.test.ts`, `collections.test.ts`, and `import.test.ts` for position assignment, append-at-end, and the new ordering.
- Migration invariants, run as SQL against the Docker restore after `migrate dev`: no null `slug`, `shortId`, `position`, or `handle`; `shortId` values all match `^[a-z0-9]{8}$`; every slug and handle matches the regex and avoids the reserved lists; positions within every collection run `0..n-1` with no gaps; the seven system item types are intact; row counts unchanged (691 users, 655 items, 111 collections, 305 join rows on the 2026-09-25 restore).
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` returns 0 after the migration, which is what CI runs. The partial index on `item_types` is raw SQL that `schema.prisma` cannot express; if the diff reports it as drift, the index moves to its own follow-up and the finding stays open.
- `npm run verify` passes.

## Out Of Scope

- Everything visible: the visibility control, copy link, reorder buttons, handle in settings, the public route, the short link redirect, quick add, and public assets (phases 2 to 5).
- Slug editing and history writes (phase 2).
- Per-user tags (audit T2-13 and T5-12). The 2026-09-24 plan put them in this migration to avoid an extra production migration while the Neon account was locked. That constraint is gone, and the change touches tag writes in `items.ts` and `import.ts`, export, search, AI tag normalization, and a backfill that splits 216 shared tag rows per user. It is its own feature with its own migration, scheduled after public collections.
- Drag to reorder, tombstones for deleted short ids, a course level above collections.

## Notes

- Handles derived from email local parts become visible only when that user publishes, and phase 2 makes them editable before that can happen.
- The migration must not be applied to production from a laptop. `vercel.json` runs `prisma migrate deploy` on production builds only, and preview builds skip it, so opening a preview for this branch does not migrate production.
- Collision counts on real data (duplicate local parts, per-user slug ties, `addedAt` ties) are measured against the Docker restore before writing the backfill, so the suffix loop and the tiebreak are tested against the cases that actually exist.
