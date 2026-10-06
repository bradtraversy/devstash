# Rows Cleanup

## Overview

Item rows carry nine things: type icon, title, description, pin and favorite marks, a type or language label, the visibility pill, the date, Copy, and Share. Brad asked for cleaner rows (2026-10-06). Three changes take out what repeats or adds least, without touching code cards or the file list.

Branch: `feature/rows-cleanup` off `main`, one implementation commit, then a pull request.

## Requirements

- No date on item rows. Lists are already ordered, and the drawer shows created and updated dates.
- The label column becomes a small mono file-name chip for snippets only (`.ts`, `.py`, `.yml`, `Dockerfile`, with `.tsx` or `.jsx` when the code contains JSX), titled with the language name; links, images, files, notes, prompts, and commands rely on their colored type icon (Brad, 2026-10-06).
- Shared snippet pages (the block header and the line under the title) and the homepage sample use the same file name, with the language name as screen reader text and title (Brad, 2026-10-06).
- The Private pill on rows shows just the lock icon, keeping its column width, title, and screen reader label; shared pills (Unlisted, Public, Via collection) keep their text.

## Testing

- `languageFileName` (every editor language, JSX detection without generics tripping it) and `snippetFileChip`.
- `npm run verify`, an independent review, and a browser check of Home, a type page, and a collection page at desktop and phone widths.
