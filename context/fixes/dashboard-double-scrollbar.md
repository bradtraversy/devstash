# Dashboard Double Scrollbar

## Problem

After scrolling an item list, the signed-in app grew a second, page-level scrollbar, in production and in development (Brad, 2026-10-06). The app shell is a full-height column whose `main` scrolls on its own, but `main` was not positioned, so absolutely positioned descendants such as the `sr-only` labels on visibility pills and file chips used the viewport as their containing block. They escaped `main`'s overflow clipping and, once the list scrolled, sat below the window and stretched the page (932px window, 1414px page in Brad's Chrome).

## Fix

`main` in `src/components/layout/dashboard-layout.tsx` gets `relative`, so every absolutely positioned descendant is clipped by it and scrolls with the list.

## Also

Scrollbars everywhere become thin and dark (`scrollbar-width: thin`, a faint white thumb on a transparent track, and `color-scheme: dark` on `html`), matching the code editor's, instead of the platform's light gray (Brad, 2026-10-06).

## Testing

- In Brad's Chrome on the dev server: the page stays window height after scrolling the list to the bottom on Home, the type pages, Favorites, Shared, Collections, and Settings.
- `npm run verify`.
