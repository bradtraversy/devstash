# Darker Brand Buttons

## Problem

The homepage buttons used a blue-700 to blue-600 to blue-400 gradient whose light end dropped white text under WCAG AA (about 2.6:1 at the right edge), and Brad found it too light (2026-10-06). The auth pages' `brand` Button variant was a separate blue-700 to blue-600 gradient, so the site had two primary button styles.

## Fix

- The `brand` variant in `src/components/ui/button.tsx` becomes a blue-800 to blue-600 gradient: darker, still a gradient, and white text stays at 5.26:1 or better across the width. Blue-900 to blue-700 was tried and its low-chroma left end looked gray on full-width buttons (Brad, 2026-10-06).
- The homepage Navbar (desktop and mobile Get Started), Hero and CTA Start sharing free, and the Pricing Pro button use `variant="brand"` instead of inline gradient classes.
- The ShareDemo Share button and the Pricing Most popular badge, which are spans, take the same blue-800 to blue-600 gradient.
- The "Share it." headline text gradients are unchanged.

## Testing

- Browser check of the homepage and the sign-in page.
- `npm run verify`.
