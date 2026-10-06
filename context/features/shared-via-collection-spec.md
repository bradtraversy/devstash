# Shared Via Collection

## Overview

Sharing a collection shows every item in it, but an item set to Private still reads Private in rows, cards, and the drawer while anyone with the collection's link can see it. Item settings stay as they are (switching them would leave items shared after the collection is unshared); instead the labels tell the truth: a private item in a shared collection shows that it is shared via that collection (Brad, 2026-10-06).

Branch: `feature/shared-via-collection` off `main`, one implementation commit, then a pull request.

## Requirements

- Item list queries (Home, type pages, collection pages, Favorites, Shared) load the item's shared collections (id, name, visibility, by name) through one include; `ItemWithType` gains `sharedVia`.
- `describeSharedVia(collections)` in `src/lib/constants/visibility.ts` returns null when none of the collections is shared, else "Shared via the X collection", "Shared via the X and Y collections", or "Shared via N collections: X, Y, and M more", followed by ", so anyone with its link can see it" (or "their links").
- Rows and code cards: a private item with shared collections gets a blue "Via collection" pill with a folder icon and the description as its title; the compact card pill shows the icon only. Image and file cards show the folder mark with the same title.
- Drawer: under the Private, Unlisted, Public control, a private item in a shared collection shows the description in place of "Only you can see this".
- Files have no share block, so a private file in a shared collection gets the description on its own in the drawer.
- Items shared on their own keep their Unlisted or Public pill.

## Testing

- `describeSharedVia` wording for none, one, two, and many shared collections and private ones ignored; the list queries' include and the `sharedVia` mapping.
- `npm run verify`, an independent review, and a browser check of a private item in a shared collection on its row, card, and drawer, and after the collection goes back to private.
