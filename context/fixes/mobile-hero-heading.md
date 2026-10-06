# Mobile Hero Heading

## Problem

The homepage hero heading ("Stash it. Share it.") was fixed at 38px below the sm breakpoint while desktop reaches 70px, so on phones the four-line paragraph under it outweighed it (Brad, 2026-10-06). Tablets got only 46px at 768px from the 6vw middle of the clamp.

## Fix

The h1 in `src/components/homepage/HeroSection.tsx` uses one fluid size, `clamp(2.75rem, 13vw, 4.4rem)`, and drops the `max-sm:text-[2.4rem]` override: about 49px on a 375px phone, 44px at 320px, and the full 70px from about 540px wide up, so desktop is unchanged.

## Testing

- Browser check at 320px, 375px, 768px, and desktop width.
- `npm run verify`.
