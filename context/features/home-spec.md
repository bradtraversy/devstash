# Home

## Overview

Last of the four features from the app shell prototype. The dashboard (`/dashboard`, labelled Home in the sidebar) stops being four stat cards, a collections grid, pinned items, and recent items, and becomes the place to put something in your stash or share it: a paste box first, then one list of everything with filters. A new user sees an invitation and samples instead of empty sections. The top-bar Share and New buttons stay (Brad, 2026-10-03: keep both for now).

Branch: `feature/home` off `main`, one implementation commit, then a pull request.

## Requirements

### Paste box (`src/components/dashboard/quick-capture.tsx`)

- A monospace textarea ("Paste code, a command, or a link") with two buttons: Save, and Save and share.
- `guessPaste(text)` in `src/lib/paste.ts` decides what the paste is, and a line under the box says so as the user types ("Looks like a TypeScript snippet, saved as useDebounce"):
  - one line that is an http or https URL: a link, titled by host and path;
  - one line that starts with `$ ` or a command word: a command, the leading `$ ` dropped, titled by the command itself. Tool names (git, npm, docker, curl, and others) always count; words that are also English (make, find, cat, go, kill, cd) count only in a line of four words or fewer or next to a flag, path, pipe, or file name, so "make sure to run the tests" stays a note;
  - anything else: a snippet, with `guessLanguage` for the language and a title from the first declaration at the start of a line followed by a code-shaped token (`const x =`, `function x(`, `class X {`, `def x(`, `type X =`), or `defaultShareTitle`.
  - A URL that `new URL` rejects or that is not http or https is not a link.
  - Titles are cut to 80 characters.
- Save calls `createItem` with the guess, private. Save and share does the same as unlisted, starts the clipboard write inside the click with `copyWhenReady`, and shows a result row under the box: the readable link, Copy link, Image (text items, the owner image route), Details (opens the drawer), and dismiss.
- Ctrl or Cmd+Enter saves; with Shift it saves and shares. An empty box shows "Paste something first" under the box instead of saving. Field and limit errors from the action are toasted. After a save the box clears and the page refreshes.

### List

- "Your stash" with "{n} items, {m} shared", filter chips (All, Shared, Pinned with counts) as links to `/dashboard?show=shared` and `?show=pinned`, and the Rows / Code cards switch.
- `getHomeItems(userId, filter, page, limit)` in `src/lib/db/items.ts`: the user's items (shared: not private; pinned: pinned), pinned first then newest update, paginated with `ITEMS_PER_PAGE`. `getHomeCounts(userId)` returns the total, shared, and pinned counts. `parseHomeFilter` in `src/lib/home.ts` reads `show`, defaulting to all.
- `ItemList` in the chosen layout, and `Pagination` that keeps the filter. A page past the end redirects to the filter's first page, and the page number is capped so an absurd value never reaches the query.
- A filter with no items says so ("Nothing pinned yet. Pin an item from its details.", "Nothing shared yet. Use Share on any row.").

### New user

- With no items at all: a heading "Start your stash" with one line (paste code, a command, or a link; keep it to yourself, or share it with a link anyone can open), the paste box, and three sample buttons (a snippet, a command, a link) that fill the box. No list.

### Removed

- `StatsCards`, `CollectionsSection`, `PinnedItems`, `RecentItems`, and the dashboard `ItemCard`, with `getDashboardStats`, `getPinnedItems`, `getRecentItems`, `getRecentCollections`, the `validateLimit` helpers they used, and `DASHBOARD_COLLECTIONS_LIMIT` and `DASHBOARD_RECENT_ITEMS_LIMIT`. `CollectionCard` stays for `/collections`. The loading skeleton matches the new layout.

## Testing

- `guessPaste`: links, commands with and without `$`, multi-line text that starts with a command word, snippets with a declared name, language guessing, plain text, empty input, long titles.
- `parseHomeFilter`, `getHomeItems` (filters, order, pagination), and `getHomeCounts`.
- `npm run verify`, an independent review, and a browser check: Save, Save and share with the result row, a link, a command, the filters with pagination, the new-user state with a fresh account, at desktop and phone widths.

## Out of scope

Removing the top-bar Share dialog, gist import, a public profile.
