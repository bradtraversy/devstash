# Header GitHub Link

## Overview

DevStash is open source and the repo is linked only from the footer. Brad wants the GitHub icon with a link to the repo in the header (2026-10-06).

Branch: `feature/header-github-link` off `main`, one implementation commit, then a pull request.

## Requirements

- The homepage Navbar, which the auth pages and docs share, shows a GitHub icon link to the repo at every width: before Sign In on desktop, beside the menu button on phones.
- The link opens in a new tab with `rel="noopener noreferrer"`, is named "DevStash on GitHub" for screen readers and as its title, and uses the navbar's muted link color with the light hover.
- `GITHUB_REPO_URL` in `src/lib/constants/links.ts` is shared by the Navbar and the Footer's GitHub link.

## Testing

- No testable logic (one constant and markup).
- `npm run verify` and a browser check of the header at desktop and phone widths.
