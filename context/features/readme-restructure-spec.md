# README Restructure

## Overview

The README still describes the course-era app (Pro tier, file uploads, "unified hub" message) and mentions the `course-final` tag only in passing. Students land on `main`, which keeps changing. The README is restructured so the first thing anyone sees is a clear notice to switch to the `course-final` tag for the course files, with a screenshot of where that is on GitHub, and the rest describes DevStash as it is now: stash it, share it.

Branch: `chore/readme-restructure` off `main`, one commit, then a pull request. Docs only.

## Requirements

- Header: the new tagline "Stash it. Share it." under the title, badges kept.
- Course notice directly under the header, as a GitHub `[!IMPORTANT]` alert: the repo is under active development and has changed since the course; switch to the `course-final` tag for the course files; how on GitHub (branch menu, Tags, `course-final`), with git (`git clone --branch course-final`), or the Course version release ZIP; links to the course site and the course resources repo. Followed by `course-tag.png` (Brad's screenshot of the GitHub tag menu, cropped to the menu) at the repo root next to `screen.png`.
- "What DevStash is" in a short paragraph around sharing and the private stash.
- Features rewritten in three groups (sharing, your stash, under the hood) matching the code today: short links with `/raw` and `.png`, public collection pages with `.md`, preview cards, Save to your stash, AI helpers free, Markdown and JSON export, Pro billing and file/image uploads built but switched off with `NEXT_PUBLIC_PRO_ENABLED`.
- Tech stack, prerequisites (Node 20.19+, PostgreSQL through Docker or Neon), environment variables (adds `NEXT_PUBLIC_PRO_ENABLED`, `DIRECT_DATABASE_URL`, `AUTH_URL`, notes which are optional), database setup with an optional Docker command, scripts (adds `verify`), quality gate, and project structure brought up to date (public pages, `lib/og`, `lib/public`, `lib/plans.ts`).

## Verification

- Every route, script, and variable named in the README exists in the code or `.env.example`.
- The README renders on GitHub (alert, image, tables) in the pull request view.
