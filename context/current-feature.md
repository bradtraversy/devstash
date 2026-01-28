# Current Feature

Code Quality Quick Wins - Address low-risk issues from codebase audit including N+1 query fix, code deduplication, and missing UI states.

## Status

In Progress

## Goals

1. **Fix N+1 Query in Collections** - Refactor `getRecentCollections` and `getSidebarCollections` to limit nested item fetching using Prisma's `take` on relations (no raw SQL)
2. **Add Database Indexes** - Add indexes on `isPinned`, `isFavorite`, and `updatedAt` fields for common query patterns
3. **Create Shared ICON_MAP** - Move duplicate icon mapping from sidebar.tsx, mobile-sidebar.tsx, and collection-card.tsx to `/src/lib/constants/item-types.ts`
4. **Create Shared Date Utility** - Move `formatDate` function from item-card.tsx to `/src/lib/utils/date.ts`
5. **Add Loading State** - Create `/src/app/dashboard/loading.tsx` with skeleton UI
6. **Add Error Boundary** - Create `/src/app/dashboard/error.tsx` for graceful error handling
7. **Add Query Limit Validation** - Cap limit parameters in database functions to prevent abuse
8. **Fix Unsafe Icon Type Assertion** - Add fallback icon when icon name not found in ICON_MAP

## Notes

- These are all low-risk changes identified from the codebase audit
- Authentication is a separate feature and will be implemented later
- Stick to Prisma conventions - no raw SQL queries
- Keep mock-data.ts for reference/testing purposes

## History

- **Initial Setup** - Next.js 16, Tailwind CSS v4, TypeScript configured (Completed)
- **Dashboard UI Phase 1** - ShadCN UI initialization, dashboard route at /dashboard, main layout with dark mode, top bar with search and buttons, sidebar and main placeholders (Completed)
- **Dashboard UI Phase 2** - Collapsible sidebar with item type navigation, favorite and recent collections, user avatar area, mobile drawer, and responsive behavior (Completed)
- **Dashboard UI Phase 3** - Main content area with stats cards, collections section, pinned items, and recent items list (Completed)
- **Prisma + Neon PostgreSQL** - Prisma 7 ORM with Neon PostgreSQL, full schema with User, NextAuth, Item, ItemType, Collection, Tag models, indexes, cascade deletes, seed file for system item types, initial migration (Completed)
- **Seed Data** - Demo user (demo@devstash.io), 5 collections (React Patterns, AI Workflows, DevOps, Terminal Commands, Design Resources), 17 items (snippets, prompts, commands, links) with bcryptjs password hashing (Completed)
- **Dashboard Collections** - Real database data for collections section, dynamic border colors from most-used item type, type icons display, server component data fetching with Prisma (Completed)
- **Dashboard Items** - Real database data for pinned and recent items, item type icons/colors, tags display, server component data fetching with Prisma (Completed)
- **Stats & Sidebar** - Real database data for stats cards and sidebar, item types with counts and custom ordering, favorite/recent collections with colored indicators, "View all collections" link (Completed)
- **Pro Badge Sidebar** - PRO badge on Files and Images item types in desktop and mobile sidebars using ShadCN Badge component (Completed)
