# Collection Share Notice

## Overview

Sharing a collection shows every item in it on the shared page, including items that are private on their own; items are private by default, so hiding them would empty most shared collections. The Privacy page, Terms, and docs say so since PR #43, but the app did not warn at the moment of sharing. This feature adds that warning (Brad, 2026-10-06).

Branch: `feature/collection-share-notice` off `main`, one implementation commit, then a pull request.

## Requirements

- `countPrivateCollectionItems(collectionId, userId)` in `src/lib/db/collections.ts` counts the owner's items in the collection whose own visibility is private.
- `collectionShareNotice(itemCount, privateItemCount, visibility)` in `src/lib/constants/visibility.ts` says plainly that sharing exposes every item (Brad, 2026-10-06): while private, "Sharing this collection makes all N of its items visible to anyone with the link, including P set to Private." (the private part only when P > 0); once shared, "This collection is shared, so all N of its items are visible to anyone with the link, including P set to Private." only when P > 0; nothing for an empty collection. Item visibility itself is not changed; whether sharing a collection should switch its items to shared is an open question.
- The collection page passes the count to `VisibilityControl`, which shows the notice in amber with a warning icon under the visibility row and updates it when the visibility changes.
- The collection card's one-click Share toast says anyone with the link can view the collection and every item in it.

## Testing

- Unit tests for the count query (owner and private filter) and the notice wording (none, singular, plural, private and shared states).
- `npm run verify`, an independent review, and a browser check of a collection with two private items before and after switching it to Unlisted.
