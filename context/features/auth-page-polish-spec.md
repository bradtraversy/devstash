# Auth Page Polish

## Overview

The sign-in and register pages were the stock shadcn card: email and password first, GitHub second, a light gray submit button where every other primary button on the site is the blue gradient, a dots placeholder that reads as a filled password, and a redundant subtitle. Dev tools with a similar audience (Supabase, Railway, Resend, Cacher) lead with GitHub and drop the card, and the local production restore has 368 GitHub accounts against 329 password accounts, 61 of them never verified. Brad agreed to the polish on 2026-10-06.

Branch: `feature/auth-page-polish` off `main`, one implementation commit, then a pull request.

## Requirements

- GitHub first on sign-in and register: a full-width "Continue with GitHub" button, then an "or" divider, then the email form. `GitHubAuthSection` renders the button before the divider, and the divider label sits on the page background.
- A `brand` Button variant with a blue-700 to blue-600 gradient, used for the primary action on every auth page (Sign in, Create account, Send reset link, Reset password, Request a new link, Sign in to your account). The homepage's to-blue-400 gradient drops white text below 4.5:1 near its light end, which longer full-width labels reach; blue-600 keeps it at 5.26:1 or better.
- No card: an `AuthCard` wrapper drops the border, panel background, and shadow so all five auth pages (sign-in, register, forgot-password, reset-password, verify-email) look the same.
- Sign-in and register lose their subtitles; the heading is enough.
- No dots placeholder on password fields; the new password fields on register and reset say "At least 8 characters".
- Fine print at the bottom: sign-in says "By continuing, you agree to the Terms and Privacy Policy." and register keeps "By creating an account, you agree to the Terms and Privacy Policy.", both below the switch link.
- The auth layout owns the page wrapper and sits the content higher than dead center on tall screens.
- No auth logic changes: same actions, errors, redirects, and callbackUrl handling.

## Testing

- No testable logic changes (components only).
- `npm run verify`, an independent review, and a browser check of all five pages, the error states (wrong password, OAuthAccountNotLinked), and phone width.
