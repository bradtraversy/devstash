# Item Rows and Layout Switch

## Overview

First of the four features from the app shell prototype (`prototypes/app-shell/`, `context/features/app-shell-prototype-spec.md`). Item lists become dense rows that show at a glance what is shared, with one-click Share on a private row and Copy link on a shared one. A Rows and Code cards switch above each list lets the user pick a layout; rows are the default and the choice sticks across lists.

Branch: `feature/item-rows` off `main`, one implementation commit, then a pull request.

## Requirements

### Where it applies

- `/items/[type]` for snippets, prompts, commands, notes, and links. Files keep `FileListRow` and images keep the thumbnail grid, with no switch on those pages.
- `/favorites`, the items section. Sorting stays as it is.
- `/collections/[id]`, keeping move up and move down on every row and card.
- The dashboard keeps `ItemCard` for pinned and recent items until the Home feature replaces that page.

### Row (`src/components/items/item-row.tsx`)

- One `li` per item: a tinted square with the type icon, the title, the description on one line (md and up), pinned and favorite marks (sm and up), the language label for snippets and commands or the type name otherwise (lg and up), a visibility pill, and the relative updated date (md and up).
- The main area is a button that opens the drawer. Actions sit beside it: Copy content for items with content or a URL (sm and up), then Share on a private item or Copy link on a shared one, then an optional trailing slot.
- Files get no Share, matching the drawer, which does not share files.
- Share and Copy link show their label from sm up and are icon only below, with the label kept for screen readers. Share stays neutral until its row is hovered or focused, then turns blue, so a long list is not a wall of blue.

### Visibility pill (`src/components/items/visibility-pill.tsx`)

- Private: a lock in muted text. Unlisted (link icon) and Public (globe): blue text on a blue tint. Fixed width from sm up so the column lines up, icon only below sm with the label kept for screen readers. The title attribute carries the option's description from `VISIBILITY_OPTIONS`.

### One-click share (`src/hooks/use-item-share.ts`)

- On a private item: `setItemVisibility({ id, visibility: 'UNLISTED' })`, then copy the short link with "Shared with a link. Link copied.", then `router.refresh()`. Errors toast the action's message. The button shows a pending state and ignores clicks while the write runs.
- On a shared item: copy the short link with "Link copied".
- The link is `origin + publicShortPath(shortId)`, the same link the drawer copies.

### Code card (`src/components/items/item-code-card.tsx`)

- Header button with the type icon, title, and marks, opening the drawer.
- A preview box (also opens the drawer on click, not a tab stop): the first 7 lines of a snippet or command highlighted with the public pages' Shiki theme, the first 7 lines of a prompt or note as wrapped text, the URL and description of a link. It fades out at the bottom.
- Footer: language or type label, relative date, visibility pill, Copy content, Share or Copy link, trailing slot.

### Code previews (`src/lib/item-previews.ts`)

- `getCodePreviews(items)` returns a map from item id to highlighted token lines for snippets and commands only, using `previewLines(content, 7, 120)` then `highlightLines` with the item's language. Pages call it only when the layout is cards, so the row layout never loads the highlighter.

### Layout switch

- `src/lib/list-layout.ts` (client safe): `LIST_LAYOUTS`, `ListLayout`, `LIST_LAYOUT_COOKIE` (`devstash-list-layout`), `DEFAULT_LIST_LAYOUT` (`rows`), and `parseListLayout(value)` that returns the default for anything unknown.
- `src/components/items/list-layout-switch.tsx`: two icon buttons (Rows, Code cards) in a group with `aria-pressed`. Choosing one sets the cookie for a year (path `/`, SameSite Lax) and refreshes the route; the pressed state updates right away.
- Pages read the cookie with `cookies()` and `parseListLayout`.
- Placement: in the items page header beside the New button, in the favorites items section header beside the sort select, and above the list on the collection page.

### Shared list (`src/components/items/item-list.tsx`)

- Client component taking items, layout, previews, and an optional `trailing(item, index)` render function. Rows render inside one bordered list; cards render in a grid (one column, two from sm, three from xl).

### Data

- `ItemWithType` gains `language` so rows and cards can label and highlight code.

### Cleanup

- `FavoriteItemRow` and `CollectionItemRow` are replaced by `ItemRow`; the move buttons move into `CollectionMoveButtons`, with the same disabled rules and refresh behavior.

## Testing

- `parseListLayout` accepts both layouts and falls back for missing and unknown values.
- `getCodePreviews` highlights only snippets and commands, passes the language, caps at 7 lines, and skips items with no content.
- `npm run verify`, an independent review, and a browser check of the three pages in both layouts at desktop and phone widths, including Share on a private row and Copy link on a shared one.

## Out of scope

The drawer, the sidebar, the Shared page, and Home are the next three features.
