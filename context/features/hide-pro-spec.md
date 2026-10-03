# Hide Pro

## Overview

DevStash goes free for now. Pro moves behind one switch that is off: no billing UI, no upgrade prompts, no file or image items, and the AI helpers open to everyone. The code stays so Pro can come back by setting one environment variable. With nothing to upgrade to, the 50-item and 3-collection caps become an abuse ceiling of 1,000 items and 100 collections.

Decided with Brad on 2026-10-03: disable files and images and take out the Pro UI, keep it hidden for later; AI helpers free for everyone (about a tenth of a cent per call on `gpt-5-nano`, with the existing 20-per-hour rate limit); a high ceiling instead of the free caps.

Branch: `feature/hide-pro` off `main`, one implementation commit, then a pull request. No migration, no new dependency. One optional environment variable.

## Requirements

### The switch

- `src/lib/plans.ts`:
  - `isProEnabled()`: `process.env.NEXT_PUBLIC_PRO_ENABLED === 'true'`. Unset means off, so production needs no change. `NEXT_PUBLIC_` because client components read it; it is read at call time so tests can stub it.
  - `isProUser(isPro)`: Pro is on and the user is Pro.
  - `hasAiAccess(isPro)`: Pro is off (AI is free) or the user is Pro.
  - `hasFileAccess(isPro)`: same as `isProUser`; file and image items exist only while Pro is on.
- `.env.example` documents `NEXT_PUBLIC_PRO_ENABLED` (off when unset).

### Limits

- `src/lib/constants/limits.ts` becomes functions: `maxItems()` and `maxCollections()` return 50 and 3 while Pro is on, and 1,000 and 100 while it is off; `itemLimitError()` and `collectionLimitError()` keep the upgrade wording while Pro is on and say "You have reached the limit of 1,000 items. Delete some to add more." (and the collection equivalent) while it is off.
- `src/lib/usage.ts`, `createItem`, `createCollection`, `importData`, and the save actions read the functions; the unlimited bypass applies to `isProUser`, so a stale `isPro` flag does nothing while Pro is off.

### Server gates

- AI: `requirePro` passes when `hasAiAccess`.
- `createItem`: file and image types need `hasFileAccess`; while Pro is off the error is "File and image items are not available right now."
- `importData`: file and image items are filtered unless `hasFileAccess`.
- `/api/upload`: 403 "File uploads are not available right now." before any database read while Pro is off; the Pro check stays for when it is on.
- `/api/export?format=zip`: allowed only for `isProUser`. JSON and markdown stay free.
- `/api/stripe/checkout`: 404 while Pro is off. The portal and the webhook stay as they are so any existing subscription can still be managed and kept in sync.

### Pages and UI

- `/upgrade`: `notFound()` while Pro is off.
- Settings: the Billing card is hidden and the ZIP export button is hidden while Pro is off.
- Top bar: the Upgrade button shows only while Pro is on.
- New Item dialog: the file and image types are left out while Pro is off (while it is on they show with the PRO badge, as before); the AI buttons follow `hasAiAccess`.
- Item drawer, code editor, markdown editor, `ProAiButton`: AI controls follow `hasAiAccess` (no crown or upgrade tooltip while Pro is off).
- Sidebar (desktop and mobile): the `PRO` badges show only while Pro is on; while it is off the Files and Images rows show only when the user already has items of that type.
- `/items/files` and `/items/images`: while Pro is off the page lists the user's existing items (read only, no New button) instead of redirecting to `/upgrade`. Existing file and image items stay viewable and downloadable; nothing is deleted from R2.
- Homepage: the Pricing section and the Pricing links (navbar and footer) are hidden while Pro is off; the features grid drops the Pro badge and the file, image, and ZIP mentions; the CTA line reads as free.

## Verification

- Unit tests: `plans` (off by default, on with the variable, each helper); limits (both modes and messages); `usage`; `requirePro`; `createItem` file gate and limit in both modes; `importData` filtering and limits; upload, export, and checkout routes while off; the existing Pro-on tests run with the variable stubbed on.
- `npm run verify` passes.
- Browser check on Brad's dev server with a throwaway verified user created in the local database (signed out and deleted afterwards): no Pro or Upgrade UI anywhere, no file or image types in New Item, AI buttons work without a crown, settings without Billing or ZIP, `/upgrade` 404, homepage without Pricing.

## Out Of Scope

- Removing Stripe, the webhook, or the `isPro` column.
- Deleting or migrating existing file and image items.
- A support or sponsor link, an OpenAI budget cap (Brad sets that in the OpenAI dashboard), and AI reasoning-effort tuning.

## Notes

- Before this ships, Brad confirms in the Stripe dashboard that there are no active subscriptions, because the billing card (and its Manage billing button) disappears.
- To bring Pro back: set `NEXT_PUBLIC_PRO_ENABLED=true` in the environment and redeploy (a `NEXT_PUBLIC_` value is inlined at build time).
