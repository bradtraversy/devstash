# Close Password Registration

## Overview

With Google sign-in live, new accounts come from GitHub or Google. Brad decided on 2026-10-07 to stop email and password registration and keep email and password sign-in as a quiet option for existing accounts. The local production restore has 329 password accounts; 231 are on Gmail and can now use Google, and 64 verified accounts on other providers with no GitHub have only their password. Brad first asked to remove forgot password too, then agreed to keep it so those accounts can still recover (2026-10-07).

Branch: `feature/close-password-registration` off `main`, one commit, then a pull request.

## Requirements

- `/register` shows "Create an account" with Continue with GitHub and Continue with Google only, the sign-in link, and the Terms and Privacy fine print. No email form, no "or" divider. The component becomes `RegisterCard` (`register-card.tsx`).
- `POST /api/auth/register`, its tests, and the `register` rate limit are removed.
- `/sign-in` leads with the two buttons. Under them a small "Sign in with email and password" link opens the email form (with the "or" divider, Forgot password, and the resend verification prompt as today) and focuses the email field. The form starts open when the URL has `?with=email`, which the verify-email, forgot-password, and reset-password pages use in their sign-in links (`EMAIL_SIGN_IN_PATH`). OAuth error messages still show with the form closed.
- `OAuthSection` renders only the buttons; the sign-in form owns the divider.
- The sign-in form drops the `?registered=true` toast. The verify-email error state points back to sign-in instead of "Try registering again".
- Email verification, resend verification, forgot password, reset password, change password, and `SKIP_EMAIL_VERIFICATION` stay for existing password accounts.
- Copy: the getting started doc says new accounts use GitHub or Google and existing email accounts still sign in with email; Privacy drops "sign-ups" from the rate limit list and describes the stored password as belonging to accounts created with email; README features say the same.

## Out of scope

- Removing password sign-in, or email codes in its place (open question: record which method each sign-in uses first).
- A message on `/register` for people without GitHub or Google.

## Testing

- The rate limit test moves to another IP-keyed limit; the register route tests go with the route.
- `npm run verify`, an independent review, and a browser check of register and sign-in at desktop and phone widths: the closed and opened email form, `?with=email`, a wrong password, the unverified prompt with resend, an OAuth error with the form closed, and the sign-in links from forgot-password, reset-password, and verify-email.
