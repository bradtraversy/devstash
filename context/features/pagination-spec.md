# Pagination

## Overview

Add pagination for items and collections listings with numbered page links.

## Requirements

- Add pagination to /items/[type] and /collections/[id] pages
- Pagination controls at bottom with page numbers and prev/next links
- Disable (grey out) prev/next when not available
- Use constants: ITEMS_PER_PAGE = 21, COLLECTIONS_PER_PAGE = 21
- Dashboard limits: DASHBOARD_COLLECTIONS_LIMIT = 6, DASHBOARD_RECENT_ITEMS_LIMIT = 10
- Do not fetch all resources at once. Only fetch the amount that a page requires
