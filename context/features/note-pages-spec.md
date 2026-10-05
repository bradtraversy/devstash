# Note Pages

## Overview

A long note should read like a tutorial page, so a whole gist can live in DevStash as one note instead of dozens of items. Notes already render as markdown with Shiki-highlighted fences on their public link, but there is only one Copy button for the whole note, no way to link to a section, and fences in the item drawer are plain unhighlighted text. This feature gives every fenced code block in a note or prompt its own header with the language and a Copy button, gives headings on public pages anchors, and highlights fences in the drawer. It is always on; there is no setting and no new item type (Brad, 2026-10-05). First user: the CI/CD Crash Course gist, imported as one note.

Branch: `feature/note-pages` off `main`, one implementation commit, then a pull request.

## Requirements

### Code fences

- A shared `CodeFence` component wraps every fenced block: a slim header with the language label (`languageLabel`, so a fence with no language reads Plain Text) and the existing `CopyButton`, then the code. It matches the item block header (border, mono text, muted label).
- Copy places the fence's code on the clipboard. Bash fences (`bash`, `sh`, `shell`, `zsh`, `console` and the other aliases that resolve to bash) drop a leading `$ ` from each line, the same rule as command items, through `fenceCopyText` in `src/lib/public/fence.ts`.
- Public pages (`MarkdownBlock`): the fence body stays the server-rendered Shiki block.
- Drawer and dialogs (`MarkdownEditor` preview and read mode): the fence body is highlighted on the client with the same `highlightCode` and theme, loaded with a dynamic import so Shiki only downloads when a note with fences is shown. Until it is ready, and if it fails, the fence shows the plain code.

### Heading anchors (public pages only)

- Headings in a note or prompt on a public page get an `id` and a hover `#` link to it, so a section can be linked (`/s/{shortId}#add-github-actions`). The link is visible on keyboard focus and has an accessible label.
- Ids are GitHub style: lowercase, letters and digits kept, spaces to hyphens, other punctuation dropped, `section` when nothing is left, and `-1`, `-2` suffixes for repeats within the block. Built by `createHeadingIds` in `src/lib/public/headings.ts`, which also reads the plain text of a heading's children.
- On a collection page the ids are prefixed with the block anchor (`b3-add-github-actions`) so two notes on one page cannot collide; a shared item page uses the bare slug.
- Headings get `scroll-mt-6` like the block anchors.

## Testing

- `fenceCopyText`: bash fences drop `$ ` prompts, other languages and plain fences copy unchanged.
- `createHeadingIds`: slug rules, punctuation and unicode, empty headings, repeats, the prefix; heading text from nested inline elements.
- `npm run verify`, an independent review, and a browser check: the CI/CD Crash Course note shared from a local account shows a header and Copy on each fence, working heading anchors, and highlighted fences in the drawer at desktop and phone widths.

## Out of scope

- A Page item type or label, decided after seeing a course page live.
- Fences in the AI Explain output, the drawer's 400px preview height, and a table of contents.
