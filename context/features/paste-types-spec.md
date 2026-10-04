# Paste Box Types

## Overview

Follow-up to Home. The paste box only told links, commands, and code apart, so a pasted markdown note or AI prompt was saved as an untitled snippet. It now detects notes and prompts as well, and shows a type switch under the box so the user can change the guess before saving (Brad, 2026-10-04: "auto detect but the option to change").

Branch: `feature/paste-types` off `main`, one implementation commit, then a pull request.

## Requirements

### Detection (`src/lib/paste.ts`)

- `detectPasteType(text)` returns `link`, `command`, `note`, `prompt`, or `snippet` (null when blank):
  - link: one http or https URL that `new URL` accepts, as before;
  - command: every non-empty line apart from `#` comments is a `$ ` line or a command line by the existing rules, so a pasted run of commands (with its comments) is one command;
  - prose: measured with code fences, inline code, checkboxes, markdown links, placeholders, and worded parentheses taken out, it has under 5% code characters, at least four words (CJK counted by characters), at least 60% plain words, and sentences or markdown (or 80% plain words when no language matched). Shell scripts (a `#!` line or a bash guess), YAML, JSON, and Dockerfiles are never prose;
  - prose is a prompt when its first plain line (headings and list items skipped) opens like a request (you are, act as, can you, could you, your task, and similar), starts with an instruction verb followed by an object (review this, write a, given the following, turn these), or the text has a placeholder (`{{name}}`, `[insert ...]`, `[paste ...]`, `<paste ...>`, but not a markdown link); otherwise a note;
  - everything else: a snippet.
- `pasteAs(text, type)` returns the fields for any type the user picks: notes and prompts keep the text and take their title from the first line with markdown markers removed; commands drop the `$ ` prompt from every line; snippets keep the language guess and declaration title; a link only when `canBeLink(text)`.
- `guessPaste(text)` is `pasteAs(text, detectPasteType(text))`.

### Switch (`QuickCapture`)

- Once there is text, a row of type chips (Snippet, Command, Note, Prompt, Link, with the type icons) shows under the box with the current type pressed in its type color. Picking one overrides the detection until the box is cleared or saved. Link is unavailable (aria-disabled, with the reason in its title) unless the text is one web URL; the samples clear any pick, and a picked Link falls back to the detected type when the text stops being a URL.
- The hint reads "Looks like a {type}, titled ..." for a detection and "Saving as a {type}, titled ..." for a pick.
- Placeholder, hint, and the new-user line mention notes; a prompt sample joins the samples.

## Testing

- Detection of markdown notes (headings, lists, checkboxes), prompts (openings and placeholders), prose that starts with command or declaration words, multi-line commands, code, SQL, and YAML lists; `pasteAs` for every type and refused links; `canBeLink`.
- `npm run verify`, an independent review, and a browser check: paste a note, a prompt, code, and a URL, switch types, save one of each, at desktop and phone width.
