# Homepage Page Sample

## Overview

Notes as pages is the newest thing DevStash does that a gist cannot, and the homepage only mentions it in a feature card. This adds a third sample to the "What people see when you share" section: a short note rendered as a shared page through the real `ItemBlock`, so visitors see a header and Copy on every code block and a link on every heading (Brad, 2026-10-06).

Branch: `feature/homepage-page-sample` off `main`, one implementation commit, then a pull request.

## Requirements

- `SAMPLE_NOTE` in `src/components/homepage/samples.ts`: a fictional "Ship checklist" note by @sam with two `#####` sections, each with a short line and one code block (bash, then yaml), so its headings sit below the frame's `h4` title in the page outline.
- Below the snippet and collection frames, its own `h3` heading "Whole gists, one page" and a line saying a markdown doc or gist pasted as a note becomes one page with Copy on every code block and a link on every heading, then a `NotePage` frame at a readable width (Brad asked for the heading, 2026-10-06).
- The sample's code blocks copy for real and its heading links jump to the heading on the homepage.

## Testing

- `npm run verify` (the homepage stays static), an independent review, and a browser check at desktop and phone widths.
