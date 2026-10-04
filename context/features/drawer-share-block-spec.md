# Drawer Share Block

## Overview

Second of the four features from the app shell prototype. Today the drawer splits sharing across two places: the visibility select, public link, and Card link appear in the header only after an item is shared, while Share and the Image menu sit in a six-button action bar. This feature puts all of it in one block at the top of the drawer and trims the action bar.

Branch: `feature/drawer-share-block` off `main`, one implementation commit, then a pull request.

## Requirements

### Share block (`src/components/items/drawer-share-block.tsx`)

- Shown in read mode for every item except files (the drawer already refuses to share files), hidden while editing. A file that is somehow already shared gets only the visibility control, so it can still be made private.
- A three-way visibility control (Private, Unlisted, Public) as a group of buttons with `aria-pressed`, the shared states in blue. Choosing one calls the drawer's existing `applyVisibility` and toasts "Item is now {label}", as the select did. Disabled while a write runs.
- The selected option's description from `VISIBILITY_OPTIONS` on one line under the control.
- Private: a primary "Share with a link" button that makes the item unlisted and copies the link in one click.
- Unlisted or Public: a link box with the readable link (no protocol, opens the public page in a new tab) and a primary "Copy link" button, then a row with Open page, Raw (text items only, `/s/{shortId}/raw`), and Card (`/s/{shortId}/og`, the preview Slack and X show).
- The Image menu (Open image, Download PNG, Copy image through the owner route) moves into the block for text items and works whatever the visibility, as it does today.

### Copy after the share write

- `copyWhenReady` moves out of `use-item-share.ts` into `src/lib/clipboard.ts` so the drawer and the rows share it. The drawer's Share starts the clipboard write inside the click with a promise that resolves to the link once the visibility write succeeds, so Safari copies. If the write fails nothing is copied; if only the copy fails the toast says the item is shared and points at Copy link.

### Action bar

- Favorite, Pin, Copy, Download for files, Edit, then Delete on the right, the order main already uses. Share and the Image menu leave the bar.

### Header

- The visibility row leaves the header. The language badge shows the language's label (`TypeScript`, not `typescript`).

## Testing

- The drawer is a component, so no unit test; `copyWhenReady` gets a small test for both paths (ClipboardItem with a promise, and the `writeText` fallback) with the clipboard mocked.
- `npm run verify`, an independent review, and a browser check: a private snippet, sharing it from the block, switching to Public and back to Private, a link, an image or note, and a file, at desktop and phone width.

## Out of scope

The sidebar, the Shared page, and Home.
