# Markdown Export

## Overview

A third export on the settings Data card: one markdown file holding every item the user owns. Collections come first, each as a section with its items in display order, then the items that belong to no collection grouped by type. Snippets and commands are fenced code blocks, notes and prompts are inlined markdown, links, images, and files are one line each, the same rendering the public collection page and its raw view already use. Free for everyone, like the JSON export. No schema change, no migration, no new dependency, no new environment variable.

Branch: `feature/markdown-export` off `main`, one implementation commit, then a pull request. The gist import that follows is its own feature.

## Requirements

### Route

- `GET /api/export?format=md` joins `json` and `zip` in the existing route. It requires a session like the others and has no Pro gate. It calls `getUserMarkdownExport(userId)` (not `getUserExportData`) and returns the document from `stashToMarkdown` with `Content-Type: text/markdown; charset=utf-8` and `Content-Disposition: attachment; filename="devstash-export-{date}.md"`, the same date string the other formats use. Unknown formats still return 400.

### Data

- `src/lib/db/export.ts` gains `getUserMarkdownExport(userId): Promise<MarkdownExport>` with
  - `exportedAt: Date`
  - `itemCount: number`, the user's total number of items (an item in two collections counts once)
  - `collections: MarkdownExportCollection[]`, every collection of the user ordered by name, each with `name`, `description`, and `items` read through the join in `COLLECTION_ITEM_ORDER`, no `take`, with the same `item: { userId }` filter on the join that `getItemsByCollection` uses
  - `uncollected: MarkdownExportItem[]`, the user's items with no collection membership (`collections: { none: {} }`), sorted by the app's item type order (`ITEM_TYPE_ORDER` in `src/lib/db/items.ts`, exported for this; unknown types after the known ones) then `createdAt` ascending with `id` as the tiebreak, so a bulk import that shares one timestamp exports in a stable order
  - each `MarkdownExportItem` carries `id`, `title`, `description`, `content`, `url`, `language`, `fileUrl`, `fileName`, `fileSize`, `itemType: { name }`, and `tags: string[]` (tag names in the order Prisma returns them)
- Three queries run in parallel: collections with their join rows and items, uncollected items, and the item count. Nothing in the user's data is filtered by visibility or Pro status.

### Rendering

- `src/lib/public/markdown.ts` exports `MarkdownItem`, the minimal item shape the renderer needs (`title`, `description`, `content`, `url`, `language`, `fileUrl`, `fileName`, `fileSize`, `itemType: { name }`, optional `tags`), and `itemToMarkdown(item, level)` which returns the item's section: a heading of `level` hashes with the title, the description when present, `Tags: a, b` when `tags` is present and not empty, then the body by type exactly as today (titled fence with a language for snippets, `bash` for commands, inlined content for notes and prompts and unknown types, `[title](url)` for links, `![title](fileUrl)` for images, `fileName (size)` for files). `PublicItem` satisfies `MarkdownItem` without change. `collectionToMarkdown` builds its item sections through `itemToMarkdown(item, 2)` and its output stays byte for byte the same; the existing tests prove it.
- `src/lib/markdown-export.ts` exports `stashToMarkdown(data: MarkdownExport): string`, a pure function:
  - `# DevStash export`, a blank line, then `Exported {formatLongDate(exportedAt)}. {itemCount} items, {collections.length} collections.` (the words stay plural, `1 items` is accepted)
  - one `## {collection.name}` section per collection in the given order, the description when present, then `itemToMarkdown(item, 3)` per item in the given order; a collection with no items has only its heading and description
  - then the uncollected items grouped by `itemType.name` in first-seen order (the query sorts them), each group under `## {Type} not in a collection` where the type label is the name with its first letter uppercased and an `s` appended (`Snippets`, `Commands`, `Notes`), items through `itemToMarkdown(item, 3)`
  - an item in two collections appears under both; an item in none appears once under its type
  - sections are separated by one blank line and the document ends with one newline; an account with nothing has only the title and the exported line

### Settings UI

- `DataSettings` gets an `Export Markdown` button between `Export JSON` and `Export ZIP`, same outline style and `Download` icon, no badge, calling the existing `handleExport` with `'md'`. The two loading booleans become one `exporting: ExportFormat | null` so every button disables while any export runs and shows its own spinner. The card description becomes `Export your data as JSON, Markdown, or a ZIP with files, or import from a previous export.`
- Nothing else on the settings page changes.

### Verification

- Unit tests (Vitest, node):
  - `src/lib/public/markdown.test.ts`: existing `collectionToMarkdown` tests unchanged; add `itemToMarkdown` at level 3 and the tags line present only with non-empty tags.
  - `src/lib/markdown-export.test.ts`: full fixture to expected document (title, exported line, two collections with descriptions and items at level 3, an item under both its collections, uncollected snippets and notes grouped with the `not in a collection` headings); empty export; a collection with no items; unknown type label; one trailing newline.
  - `src/lib/db/export.test.ts` (new): `getUserMarkdownExport` mocks `prisma.collection.findMany`, `prisma.item.findMany`, and `prisma.item.count`; asserts the user filter on every query, collections ordered by name, join rows ordered by `COLLECTION_ITEM_ORDER` with no `take`, the `none` membership filter on uncollected items, type order then `createdAt` in the result, tags mapped to names, and `itemCount` from the count.
  - `src/app/api/export/route.test.ts`: `format=md` returns 200 on the free tier with the content type, the filename, and the renderer's document; `getUserExportData` is not called for it; 401 without a session.
- `npm run verify` passes.
- Browser check with a dev server Brad starts: on `/settings`, click `Export Markdown`, open the downloaded file and see the collections in order with items in position order, fenced code for snippets and commands, and the uncollected sections at the end.

## Out Of Scope

- A per-collection markdown download on the owner's collection page (the public `.md` view covers shared collections).
- File download links in the markdown (the ZIP export carries the files).
- Markdown inside the ZIP export, or a ZIP of one file per collection.
- Any change to the JSON or ZIP formats, the import, or the Pro gate on ZIP.
- Gist import (next feature).

## Notes

- The renderer is shared with the public page on purpose: a collection exported here reads the same as its raw public view, minus the `by` and `Source` lines and plus the tags.
- Headings are the raw titles; a title that starts with `#` or contains markdown renders as markdown, the same as the public view. Accepted.
- Large accounts produce a large file built in memory, the same as the JSON export. Accepted for now.
