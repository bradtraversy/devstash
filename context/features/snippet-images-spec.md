# Snippet Images

## Overview

Any text item (snippet, command, note, prompt) can be turned into a PNG of the whole thing in the look of the link preview card: title, kind label, every line highlighted, `@handle` and the short link at the bottom. The image lives at `/s/{shortId}.png` for shared items, cached and revalidated like the page, and at an authenticated owner route for private ones. Visible buttons put it one click away: an Image menu in the drawer (open, download, copy), a card preview plus download and copy in the Share dialog's result, and Image and Download links on the public page. The `/og` card stays as it is: Slack, X, and Discord need the 1200 by 630 shape, so the full image is a second image, not a change to the card.

Snippet images are the first piece of the sharing-first direction (2026-10-02): share gist-like snippets and nice images. No migration, no new environment variable, no new dependency.

Branch: `feature/snippet-images` off `main`, one implementation commit, then a pull request.

## Requirements

### Renderer

- `src/lib/og/constants.ts` gains `IMAGE_MAX_LINES = 500`, `IMAGE_MAX_LINE_CHARS = 170`, `IMAGE_MAX_CHARS = 12_000`, `IMAGE_MIN_WIDTH = 1200`, `IMAGE_MAX_WIDTH = 2400`.
- `src/lib/og/lines.ts`: `previewLines(content, maxLines, maxChars = OG_MAX_LINE_CHARS)` also returns `total`, the line count before the cap, so callers can say how many lines were left out. Lines are cut by monospace cells, not UTF-16 units: `columnWidth` counts CJK, Hangul, fullwidth forms, and emoji as two cells, and a cut never splits a surrogate pair. `linesWithinBudget(lines, budget)` counts how many leading lines fit in a budget of visible (non-whitespace) cells.
- `src/lib/og/preview.ts` gains `itemImage(item)` next to `itemPreview`: same language rule by type (snippet in its language or plain text, command through bash, note and prompt through markdown, nothing for link, image, and file), `previewLines(content, IMAGE_MAX_LINES, IMAGE_MAX_LINE_CHARS)`, then only the lines within `IMAGE_MAX_CHARS` visible cells, every kept line through `highlightLines`, and `hidden = total - kept`.
- `src/lib/og/snippet-image.tsx` (pure JSX, inline styles like `cards.tsx`):
  - `snippetImageSize(lines, hidden)`: width is the longest line's cell count (`columnWidth`) times the mono advance at 22px (13.2) plus the frame's horizontal padding, clamped to `[IMAGE_MIN_WIDTH, IMAGE_MAX_WIDTH]`; height is the frame (48 padding, 56 title row, 20 gap, 24 panel padding, 2 border, 16 gap, 36 footer, 48 padding) plus 33 per line, plus one more row when `hidden > 0`. Both rounded up to integers.
  - `SnippetImage({ item, lines, hidden })`: the card's frame and colors (gradient background, type dot, Geist SemiBold title with ellipsis, kind label, the dark panel, Geist Mono lines at 22px on a 33px line height with `whiteSpace: 'pre'`), no fade, every line, and when `hidden > 0` a last muted row `+ {hidden} more lines`. Footer left `@{handle}`; footer right `devstash.io/s/{shortId}` when the item is shared and `devstash.io` when it is private, so a posted image carries the way back to copyable text and a private one leaks no link.
- `src/lib/og/render.tsx`: `renderOgImage(element, size?)` takes an optional `{ width, height }` and defaults to the card size, with the same fonts and `Cache-Control`; `renderOwnerImage(element, size, filename?)` renders the same way with `Cache-Control: private, no-store` and, when a filename is given, `Content-Disposition: attachment; filename="{filename}"`.

### Routes

- `src/app/s/[shortId]/image/route.tsx`: `dynamic = 'force-static'`, `generateStaticParams` returning `[]`, the same id validation as the og route, `getPublicItem`, `notFound()` for unknown, private, non-text, and case-variant ids, then `renderOgImage(<SnippetImage .../>, snippetImageSize(...))`.
- `next.config.ts` rewrites `/s/:shortId.png` to `/s/:shortId/image` next to the existing `.md` rewrite, so the shareable URL is `devstash.io/s/{shortId}.png`.
- `src/lib/public/paths.ts` gains `publicShortImagePath(shortId)` (`/s/{shortId}/image`) and `publicShortPngPath(shortId)` (`/s/{shortId}.png`, the URL shown to people). `itemPaths` in `src/lib/db/public.ts` adds the image path, so `publicPathsForItem` and `publicPathsForUser` revalidate it with the page and the card.
- `src/app/api/items/[id]/image/route.tsx` (owner, dynamic): `auth()` or 401; `getItemById(userId, id)` or 404 (another user's item is a 404 like the JSON route); non-text types 404; `?download=1` sets the attachment disposition with the filename `{slugify(title) || 'snippet'}.png`; otherwise an inline PNG. Private, no-store. The route exists so a private snippet can be exported without sharing it; it never reads a `shortId` and never changes visibility.
- `src/lib/og/filename.ts` (or inside the route): `imageFilename(title)` through `slugify` with the `snippet` fallback, exported for the drawer and the share dialog so the suggested download name matches.

### Copying an image

- `src/hooks/use-copy-image.ts`: `copyImage(url, message = 'Image copied')` writes `new ClipboardItem({ 'image/png': fetch(url).then((r) => r.blob()) })` inside the click handler (the promise form is what Safari requires), toasts the message on success, `Copying images is not supported in this browser` when `ClipboardItem` is missing, and `Could not copy the image` when the fetch or the write fails.

### Drawer

- Read mode, text types only: an icon-only `Image` entry (`aria-label` and `title` "Image") in the action bar between `Share` and `Copy`, a `DropdownMenu` (icon `ImageIcon`, lucide `Image` aliased because the drawer already imports `next/image`) with three items: `Open image` (new tab at the owner route), `Download PNG` (an anchor to the owner route with `?download=1` and the `download` attribute), `Copy image` (`useCopyImage`). The owner route is used whatever the visibility, so private snippets export too. A labelled button made the bar 579px in the 576px drawer; icon-only it fits on one row, and the bar gets `flex-wrap` so a narrower drawer wraps instead of scrolling sideways.
- The visibility row (shared items) gains a `Card` link after the short link, opening `/s/{shortId}/og` in a new tab with the title `Preview card, what Slack and X show`, so the card is discoverable from the one place that shows the link.

### Share dialog

- The result state shows the card under the link: `<Image unoptimized src={publicShortOgPath(shortId)} width={1200} height={630} alt="Link preview card" />` in a rounded border at full dialog width, with the caption `This is what Slack, X, and Discord show for the link.`
- Two buttons join `Copy` and `Open`: `Download image` (anchor to `/s/{shortId}.png` with the `download` attribute and the slugified filename) and `Copy image` (`useCopyImage` on the png path). `Done` stays last.

### Public page

- `PublicItemView`, text types only: the row that holds `Raw` also gets `Image` (opens `/s/{shortId}.png` in a new tab, `ImageIcon`) and `Download` (same href with the `download` attribute and the slugified filename, `Download` icon). File, image, and link items keep the row as it is.

### Verification

- Unit tests:
  - `lines.test.ts`: `total`, the `maxChars` override, cell-based cuts for wide characters and emoji, `columnWidth`, `linesWithinBudget`, and the existing cases.
  - `snippet-image.test.tsx`: `snippetImageSize` minimum width, widening for long lines, the maximum, exact width at the character cap, exact height (274 plus 33 per row), wide characters counted double, height per line and the extra row when lines are hidden; `SnippetImage` markup contains the title, every line, the `+ n more lines` row only when hidden, the short link footer only when shared.
  - `preview.test.ts`: `itemImage` language by type, all lines passed, `hidden` count, the character budget stopping dense content before the line cap, empty content, nothing for non-text types.
  - `src/app/s/[shortId]/image/route.test.tsx`: `force-static`, 404 for malformed, case-variant, unknown, private, and link items, 200 with the `SnippetImage` element and the computed size.
  - `src/app/api/items/[id]/image/route.test.tsx`: 401 without a session, 404 for a missing or foreign item and for a file item, 200 inline with `private, no-store`, attachment disposition and filename with `?download=1`.
  - `render.test.tsx`: the size override and `renderOwnerImage` headers.
  - `paths.test.ts` and `public.test.ts`: the image path in the builders and the revalidation lookups.
  - `filename` tests: slugified title, fallback.
- `npm run verify` passes.
- Scratch render of a 40-line and a 600-line TypeScript snippet and a long-line command to PNG files, viewed for layout.
- Browser check with a dev server Brad starts: Image menu in the drawer on a private snippet (open, download, copy), the Card link on a shared one, the Share dialog result with the card preview and both image buttons, the public page's Image and Download links, and `/s/{shortId}.png` resolving. The cache behaviour of the public image route is the same configuration as the og route proven on 2026-10-02 and is not re-proven on a production server unless one is running.

## Out Of Scope

- Images of whole collections, and images for link, file, and image items.
- Theme, padding, or window-chrome options; one look for now.
- Wrapping long lines; lines are cut at 170 characters and the image widens up to 2400px.
- Rate limiting the owner route beyond the session requirement.
- Changes to the `/og` card, the Save button, or the public collection page.

## Notes

- The owner route is a route handler, not a server action, because the browser needs a URL for `Open`, `Download`, and the clipboard fetch.
- The footer short link appears only when the item is shared; a private snippet's image must not advertise a URL that 404s or hint that a link exists.
- 500 lines at 33px is 16,500px of panel at up to 2400px wide; the renderer handles it in about 4 seconds and the public route caches the result. The caps are a safety rail, not a product limit, and can move.
- `IMAGE_MAX_CHARS` keeps the PNG under Vercel's 4.5 MB function response limit (docs, checked 2026-10-03). Measured: the image area costs about 1 MB at the maximum size and every visible character 150 to 250 bytes, so 500 lines of mid-density code at full width came to 6.2 MB. 12,000 visible cells puts the worst case near 3.4 MB; a typical 500-line source file (about 11,000 visible characters) still fits whole, and dense code stops earlier with the `+ n more lines` row.
- The full image's panel is not clipped (`Frame` takes `clip={false}`). With `overflow: hidden`, satori's render time grew with lines times height: 80 lines took 33 seconds and 160 lines over two minutes. Without it, 160 lines render in about half a second. Since the image is sized to fit, nothing overflows, so the line cap must keep the widest line inside `IMAGE_MAX_WIDTH`; an unclipped row that is too wide gets its tokens squeezed together.
