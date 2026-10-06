# Docs

## Overview

DevStash has no documentation, and the API, CLI, and MCP planned next will need a home for theirs. This feature adds a small public docs section at `/docs` written as markdown files and rendered by the note renderer (code fences with language and Copy, heading anchors), so the docs dogfood note pages and add no packages. It also tells people in the app that a whole markdown doc or gist becomes one page: the Home paste box hint and the homepage features grid mention it. Docs come before the API work (Brad, 2026-10-05); markdown files over MDX (Brad, 2026-10-06).

Branch: `feature/docs` off `main`, one implementation commit, then a pull request.

## Requirements

### Content

- Six pages as markdown files in `src/content/docs/`, each starting at `##` (the page title is the h1): Getting started, Sharing and links, Notes as pages, Collections, AI helpers, Import and export.
- `src/lib/docs.ts` holds the ordered manifest (slug, title, description) and reads a page's markdown. Links between pages use `/docs/{slug}`.
- The copy describes the app as it is with Pro switched off: no Pro, billing, or file and image items. Keyboard shortcuts (Cmd or Ctrl+K, Cmd or Ctrl+Enter, with Shift to share) sit in Getting started.

### Routes

- `/docs`: an index with the intro and one card per page.
- `/docs/{slug}`: the page title, its description, the rendered markdown, and previous and next links. Statically generated from the manifest; an unknown slug gets a docs 404 with a link back to `/docs` (with `dynamicParams = false` Next fell through to the `[handle]/[slug]` route and showed "Collection not found").
- A shared layout with the homepage Navbar and Footer and a docs nav listing every page, the current one marked (`aria-current`); the nav sits above the content on phones.
- Metadata per page: title, description, canonical path, and Open Graph from the site defaults.
- `docs` joins `RESERVED_HANDLES` so no handle can collide with the route. Brad checks production for an existing `docs` handle before merge.

### Entry points

- Homepage Navbar (desktop and mobile menu): a Docs link.
- Footer: Documentation points at `/docs`.
- Signed-in user menu: a Docs item.
- Home paste box idle hint mentions that a whole gist becomes one page.
- Homepage features grid: "Every kind of snippet" becomes a card that also says a pasted gist becomes one page with Copy on every block.

## Testing

- `src/lib/docs.ts`: manifest slugs are unique and kebab-case, every page has a markdown file that does not start with an h1, and every `/docs/...` link inside the docs points at a page in the manifest.
- The reserved-handles test covers the new route.
- `npm run verify`, an independent review of code and copy, and a browser check of the index, a page with code fences and anchors, the nav on desktop and phone widths, the entry points, and a 404 for an unknown slug.

## Out of scope

- API, CLI, and MCP docs (they arrive with those features), search inside the docs, a sitemap, and a Page label for long notes.
