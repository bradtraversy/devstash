# Current Feature

## Status

Not Started

## Goals

<!-- Add feature goals here -->

## Notes

<!-- Add notes and constraints here -->

## History

- **Collection Management Actions** - Edit/delete/favorite buttons on /collections/[id] page, 3-dot dropdown on collection cards, EditCollectionDialog and DeleteCollectionDialog modals, updateCollection/deleteCollection server actions and db queries, items NOT deleted when collection deleted, 17 new unit tests (Completed)

- **Collections Pages** - /collections page listing all collections, /collections/[id] detail page showing items grouped by type, getUserById utility, getAllCollections/getCollectionById/getItemsByCollection queries, collection cards link to detail pages, 5 unit tests (Completed)

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
- **Code Quality Quick Wins** - N+1 query fix using Prisma _count and take, database indexes for common queries, shared ICON_MAP with fallback, shared date utility, dashboard loading/error states, query limit validation (Completed)
- **Auth Setup Phase 1** - NextAuth v5 with GitHub OAuth, split auth config for edge compatibility, Prisma adapter with JWT strategy, /dashboard route protection via proxy, Session type with user.id (Completed)
- **Auth Setup Phase 2** - Credentials provider with email/password, bcrypt validation, /api/auth/register endpoint with validation (Completed)
- **Auth Setup Phase 3** - Custom sign-in and register pages, reusable UserAvatar component with image/initials fallback, sidebar user dropdown with profile link and sign out, Sonner toast notifications, dashboard uses authenticated session (Completed)
- **Email Verification** - Resend SDK integration, verification tokens on registration, verification emails, /api/auth/verify endpoint, /verify-email page, sign-in blocking for unverified users, resend functionality, edge case handling (Completed)
- **Email Verification Toggle** - SKIP_EMAIL_VERIFICATION env variable to bypass email verification during development, auto-verify on registration, skip sign-in check when enabled (Completed)
- **Forgot Password** - Forgot password link on sign-in, /forgot-password and /reset-password pages, API endpoints for token generation and password reset, password reset emails via Resend, reuses VerificationToken model with prefix, 1-hour token expiry, edge case handling (Completed)
- **Profile Page** - Profile page at /profile with user info, usage stats with item type breakdown, change password for email users, delete account with confirmation dialog, API endpoints for password change and account deletion (Completed)
- **Rate Limiting for Auth** - Upstash Redis rate limiting on auth endpoints, reusable rate-limit utility with sliding window algorithm, protects login/register/forgot-password/reset-password/resend-verification with configurable limits, 429 responses with Retry-After header, fail-open design (Completed)
- **Items List View** - Dynamic route /items/[type] for type-filtered item lists, getItemsByType query with pinned-first sorting, responsive two-column grid using existing ItemCard, type validation with 404, empty state (Completed)
- **Vitest Setup** - Vitest for unit testing server actions and utilities (not components), co-located test files, sample date utility tests, updated workflow and coding standards docs (Completed)
- **Items List Three-Column Layout** - Changed items grid from 2 to 3 columns on lg breakpoint, responsive 1/2/3 column layout (Completed)
- **Item Drawer** - Right-side slide-in drawer using shadcn Sheet, opens on ItemCard click, fetches full item detail via /api/items/[id] with auth, displays type icon/badges, action bar (Favorite/Pin/Copy/Edit/Delete), content with line numbers, tags, collections, dates, loading skeleton, ItemDrawerProvider context in DashboardLayout, getItemById query with ownership check, unit tests (Completed)
- **Item Drawer Edit Mode** - Inline edit mode via Edit button, Save/Cancel action bar, editable Title/Description/Tags for all types, Content/Language for text types, URL for links, updateItem server action with Zod validation, updateItem query with tag disconnect/connect-or-create, toast notifications, router.refresh() after save (Completed)
- **Item Delete** - Delete functionality via trash button in item drawer, DeleteItemDialog with shadcn AlertDialog confirmation, deleteItem server action with Zod validation, deleteItem query with ownership check, toast on success, drawer close and page refresh, unit tests (Completed)
- **Code Editor** - Monaco Editor component for snippets/commands with macOS window styling (red/yellow/green dots), copy button, language label, readonly/edit modes, fluid height (max 400px), integrated into ItemDrawer and NewItemDialog, type-specific "New {Type}" buttons on items list pages with pre-selected type (Completed)
- **GitHub OAuth Redirect Fix** - Switch from client-side signIn to server-side Server Action pattern, signInWithGitHub action in src/actions/auth.ts using redirectTo instead of callbackUrl, form action in sign-in page for reliable redirect (Completed)
- **Item Create** - New Item modal dialog from top bar with shadcn Dialog, type selector (snippet/prompt/command/note/link), dynamic fields based on type, createItem server action with Zod validation, createItem query with tag connectOrCreate, unit tests (Completed)
- **Markdown Editor** - MarkdownEditor component with Write/Preview tabs, react-markdown with remark-gfm for GitHub Flavored Markdown, @tailwindcss/typography plugin with prose styling, integrated into NewItemDialog and ItemDrawer for notes/prompts, macOS window styling in readonly mode, custom scrollbar styling (Completed)
- **File & Image Upload** - Cloudflare R2 integration with upload/delete utilities, /api/upload and /api/download routes, FileUpload component with drag-and-drop and progress indicator, NewItemDialog file/image types with PRO badges, ItemDrawer image preview and file info with download button, R2 file cleanup on item deletion, 25 unit tests for R2 utilities (Completed)
- **Image Gallery View** - ImageThumbnailCard component with 16:9 aspect ratio thumbnails using aspect-video, object-cover for image filling, 5% scale hover zoom effect with 300ms transition, fileUrl added to ItemWithType interface, conditionally renders for image type on items page (Completed)
- **File List View** - FileListRow component with file extension icons, single-column list layout for /items/files (Google Drive style), each row shows file icon/title/name/size/date/download button, row hover highlight, click opens ItemDrawer, download via /api/download, mobile responsive stacking, ItemWithType extended with fileName/fileSize (Completed)
- **Quick Copy Button** - Copy icon on item cards that appears on hover, copies content for text items or URL for links, green checkmark feedback (Completed)
- **Security & Performance Audit Fixes** - Bcrypt rounds standardized to 12, debounced markdown editor resize, URL protocol validation (http/https only), next/image for R2 images with remote patterns config, upload rate limiting (10/hour per user) (Completed)
- **Code Deduplication Refactor** - useClipboard hook for 3 components, toItemWithType/toItemDetail transforms in items.ts, parseZodErrors/safeUrlSchema in validation.ts, EditorHeader shared component, countItemTypes/getDominantColor in collections.ts, formatLongDate utility (~255 lines eliminated) (Completed)
- **Collection Create** - New Collection button in top bar, NewCollectionDialog modal with name/description fields, createCollection server action with Zod validation, createCollection db query, 8 unit tests, toast notifications, router.refresh() for UI updates (Completed)
- **Item Collections Assignment** - CollectionPicker component with multi-select using shadcn Popover + Command, getUserCollections query and server action, createItem/updateItem with collection connections, integrated in NewItemDialog and ItemDrawer edit mode, 6 new tests (Completed)
