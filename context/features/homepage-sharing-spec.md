# Homepage Sharing

## Overview

The homepage moves from "stop losing your developer knowledge" to sharing first: **Stash it. Share it.** The page shows what a shared snippet actually looks like rather than describing it: the link formats, the public page, the image, and the preview card a link unfurls into. The private stash stays as the base, explained further down the page. Examples render the real public components with sample data, so they always match the app.

Decided with Brad on 2026-10-03: headline "Stash it. Share it.", the AI section folds into the features grid, the hero is a demo animation now (a working paste-to-share box is the next feature), and the examples use the real components plus a link to a live collection.

Branch: `feature/homepage-sharing` off `main`, one implementation commit, then a pull request. No migration, no new environment variable, no new dependency.

## Requirements

### Page order

`src/app/page.tsx` (stays a static server component): `Navbar`, `HeroSection`, `ShareFormatsSection`, `SharedViewSection`, `PreviewsSection`, `FeaturesSection`, `PricingSection`, `CTASection`, `Footer`. `AISection` leaves the page.

### Sample data

- `src/components/homepage/samples.ts` exports the content every example shares, so the blocks, the URL rows, and the generated images all show the same snippet:
  - `SAMPLE_ITEM`: a `PublicSharedItem`, the TypeScript snippet `useDebounce hook` (about 14 lines), handle `sam`, short id `k3j9x2ab`, `PUBLIC`.
  - `SAMPLE_COLLECTION`: a `PublicCollection`, `Docker Essentials` by `sam` at slug `docker-essentials`, three items in order: a command (run Postgres locally), a YAML snippet (`docker-compose.yml`), and a note (cleanup checklist).
  - `LIVE_EXAMPLE_PATH = '/traversymedia/devops'`, Brad's real public collection, for the "See a real one" link.
- The sample handle and ids are fictional and never resolve; nothing on the page links to them.

### Hero

- Headline `Stash it.` with `Share it.` in the existing blue gradient. Subhead: keep your snippets, commands, and prompts in one private stash, and share any of them with a short link, a raw URL for curl, and a clean image.
- Buttons: `Start sharing free` to `/register`, `See how it works` to `#sharing`.
- `ShareDemo` (client) replaces the chaos animation and dashboard preview: a window frame that loops through three steps about every eight seconds. A snippet appears in a paste box, a `Share` press turns into the `devstash.io/s/k3j9x2ab` link with a `Link copied` check, then the snippet image slides in. Under `prefers-reduced-motion` it shows the final step without motion, including when the setting changes mid-loop, and it stops on the finished frame after three loops (WCAG 2.2.2). Timers are cleared on unmount. The hero text is not wrapped in `ScrollFadeIn`, so the headline renders without JavaScript.

### One link, every format (`id="sharing"`)

- `ShareFormatsSection`: the short link laid out by part (origin muted, `/s/` dim, the id bright, the suffix in an accent color), then one row or card per format with a small preview:
  - `devstash.io/s/k3j9x2ab`: the page, highlighted and copyable on any device.
  - `devstash.io/s/k3j9x2ab/raw`: plain text for curl and scripts, with a terminal line `curl -s https://devstash.io/s/k3j9x2ab/raw` and its output (the scheme matters: plain http answers with a redirect).
  - `devstash.io/s/k3j9x2ab.png`: the whole snippet as an image for posts, slides, and docs, with a thumbnail of the sample image.
  - `devstash.io/sam/docker-essentials` and `.md`: a collection as one ordered page, and the same collection as markdown.
- The paths come from the existing builders in `src/lib/public/paths.ts` with the display origin `devstash.io`, so the format list cannot drift from the routes.

### The shared view

- `SharedViewSection` (server): two browser frames, each with its URL in the address bar.
  - A shared snippet page: the meta line (`@sam · TypeScript · Updated ...`), the real `ItemBlock` in `standalone` mode for `SAMPLE_ITEM` (Shiki highlighting and the working copy button), and the `Raw`, `Image`, and `Download` row as static text.
  - A shared collection page: the collection title, description, and meta line, then the real `ItemBlock` for each sample item with its position.
- The Save button in these frames is static markup (no action), because the sample targets do not exist.
- A `See a real one` link to `LIVE_EXAMPLE_PATH`.

### Previews and Save

- `PreviewsSection`: a Slack-style message whose unfurl is the sample item's real link preview card, captioned "Every link gets a preview card in Slack, X, Discord, and iMessage". Beside it, Save to your stash: a short line ("See something useful? Keep your own copy") with a static Save button and a `Saved to your stash` toast mock.

### Sample images

- `scripts/render-homepage-images.tsx` renders `SAMPLE_ITEM` through the real renderers (`ItemCard` with `itemPreview`, and `SnippetImage` with `itemImage`) into `public/homepage/sample-card.png` (1200x630) and `public/homepage/sample-image.png`. Run with `npx tsx --tsconfig tsconfig.json scripts/render-homepage-images.tsx`; the PNGs are committed and served through `next/image`.

### Features (`id="features"`)

- Six cards: Private by default (your stash until you share), Instant search (Cmd+K across everything), Collections (organized privately, or published as one page), Every type (snippets, prompts, commands, notes, links; files and images on Pro), AI helpers with a Pro badge (auto-tag, explain code, optimize prompts), Export anytime (markdown and JSON free, ZIP with files on Pro; the `PRO_FEATURES` line "Data export (JSON/ZIP)" was wrong about JSON and becomes "ZIP export with your files"). Search copy says title or content only, because the palette does not match tags or type.
- `AISection.tsx` is deleted.

### Pricing, CTA, navigation, metadata

- `FREE_FEATURES` in `src/lib/constants/pricing.ts` gains `Share links, images, and public collections` (included). The homepage `PricingSection` kept its own identical copies of both lists; it now imports the constants so the line shows on the homepage and the settings upgrade card alike. The rest of pricing is unchanged.
- CTA: heading "Your next snippet deserves a link", button `Start sharing free`. The footer tagline drops "developer knowledge hub" for the stash-and-share line.
- Navbar (desktop and mobile): `Sharing` (`/#sharing`), `Features`, `Pricing`.
- Root metadata: title `DevStash - Stash it. Share it.`, description "Save snippets, commands, and prompts in one place and share any of them with a short link, a raw URL, and a clean image." The site-wide `opengraph-image.tsx` tagline becomes `Stash it. Share it.`

### Removed

- `ChaosAnimation.tsx`, `DashboardPreview.tsx`, and `AISection.tsx` in `src/components/homepage/`, and the `pulse-arrow` keyframes in `globals.css` if nothing else uses them. Approving this spec is the approval for these deletions.

### Design

- Keep the current palette (`#0a0a0f` background, `#e4e4ef` text, `#8888a4` muted, the blue gradient) and the type colors; frames and code use the app's own tokens so the examples look like the product. Load the `frontend-design` skill before building the sections.
- Responsive at 375px with no horizontal scroll: frames stack, the URL parts wrap, long code scrolls inside its block.
- `ScrollFadeIn` for section entrances, as now.
- The app loads Geist through `next/font` but no CSS uses it, so everything renders in system fonts (pre-existing). Only the big URL in the formats section is set in Geist Mono; the examples keep the app's fonts so they match it.

## Verification

- `npm run verify` passes; `/` stays static (`○`) in the build output with the Shiki-rendered blocks.
- No new unit tests are required for the components (the standards test utilities, not components); a URL-parts helper, if one is extracted, gets a test.
- The two sample PNGs are regenerated by the script and viewed.
- Browser check on a dev server Brad starts: desktop and 375px, reduced motion, the copy button in the sample block, `#sharing` and `#features` anchors, `See a real one`, register links, and the mobile menu.

## Out Of Scope

- The working paste-to-share box through sign-up (next feature).
- The sharing-first dashboard pass, the public profile at `/{handle}`, gist import, the CLI.
- Pricing changes beyond the sharing line; new routes; analytics events.

## Notes

- The sample images are static files rather than a route because a route at the top level would take a handle from the `/{handle}/{slug}` namespace, and an inline data URI would add a few hundred kilobytes to the page HTML. The script keeps them reproducible when the card look changes.
- `LIVE_EXAMPLE_PATH` depends on Brad's DevOps collection staying public; change the constant if it moves.
