# Current Feature: Add Pro Badge to Sidebar

Add a pro badge to the Files and Images item types in the sidebar.

## Status

In Progress

## Goals

- Add PRO badge next to Files item type in sidebar
- Add PRO badge next to Images item type in sidebar
- Use ShadCN UI Badge component
- Keep badge clean and subtle
- Display "PRO" in uppercase

## Notes

- Files and Images are Pro-only features per project spec
- Badge should be visually subtle to not distract from the item type

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
