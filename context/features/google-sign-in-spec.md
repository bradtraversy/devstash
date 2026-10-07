# Google Sign-In

## Overview

DevStash signs people in with GitHub or an email and password. Brad decided on 2026-10-06 to add Google sign-in first and then close email and password registration, so new users always have more than GitHub. In the local production restore about 74% of users are on Gmail (279 GitHub and 231 password users), so Google has to land in the account they already have instead of failing with OAuthAccountNotLinked.

Branch: `feature/google-sign-in` off `main`, one commit, then a pull request.

## Requirements

- A Google provider (`next-auth/providers/google`, reading `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`) in `auth.ts` and `auth.config.ts`, with `allowDangerousEmailAccountLinking` so Google joins an existing account with the same email.
- Google is trusted only for verified emails: the `signIn` callback rejects a Google profile whose `email_verified` is not true, redirecting to `/sign-in?error=OAuthEmailUnverified`.
- After Google links to an account whose email was never verified, that account's email is marked verified and its password is cleared (`events.linkAccount`). A password nobody proved ownership of could belong to someone who registered with another person's address; Google proves the address, so that password must stop working. New Google users get `emailVerified` set the same way. Accounts with a verified email keep their password.
- GitHub only supplies verified emails from now on: the GitHub provider's userinfo request keeps the public profile email (GitHub only allows verified ones there), otherwise picks the primary verified email, then any verified email, and never an unverified one. A new GitHub sign-in with no verified email is rejected with `/sign-in?error=OAuthEmailUnverified`; existing GitHub users still sign in, because Auth.js finds them by GitHub account ID before it looks at email. This closes the path where a GitHub account carrying someone else's unverified address creates the DevStash account Google later links into. The 361 GitHub accounts created before this keep linking: GitHub has required email verification at sign-up for years and public emails are always verified, so the remaining risk is an old, never-verified GitHub account that signed up here before the address's owner did.
- GitHub keeps refusing to link by email (no change); only Google links.
- `SKIP_EMAIL_VERIFICATION` works only outside production (`skipsEmailVerification`), so a verified email on a production account always means its owner proved it; the linking rule above depends on that. The production restore shows the flag has been off there (61 unverified password signups through 2026-09-09).
- Google only marks the account it is linking or signing in to, when that account's email is the address Google returned; a signed-in user linking a Google account with another address leaves both untouched.
- "Continue with Google" with the Google G mark below "Continue with GitHub" on sign-in and register, same outline style, both before the "or" divider. `GitHubAuthSection` becomes `OAuthSection` (`oauth-section.tsx`); a `signInWithGoogle` server action sits beside `signInWithGitHub` and honours the same safe `redirectTo`.
- Sign-in error copy: OAuthAccountNotLinked says "This email already has a DevStash account. Sign in the way you did before." (the old copy said "registered with a password", wrong for a Google account trying GitHub), and OAuthEmailUnverified says "That account has no verified email address. Verify it with the provider, or sign in another way." Messages come from a small `oauthErrorMessage` helper.
- The profile page says how the account signs in ("Signs in with GitHub or Google", "Signs in with Google or email and password", and so on) from the linked providers and whether a password is set, instead of guessing GitHub from the avatar.
- Privacy page: Google added to account details and the services table, last-updated date bumped. Getting started doc, README features and environment table, and `.env.example` mention Google.

## Out of scope

- Closing email and password registration (next feature).
- Linking GitHub by email, or linking providers from settings.
- Case-insensitive email matching (4 users have mixed-case emails; Google returns lowercase, so one of them signing in with Google gets a new account, as GitHub would today).

## Testing

- Unit tests for the GitHub email picker and profile request, the `signIn` decision (Google verified and unverified, a returning account with a different email, GitHub with and without an email, credentials untouched), the link handler (new Google user verified, a signed-in account with another email and other providers left alone), the development-only verification skip, the sign-in method wording, and the error messages.
- `npm run verify`, an independent security review of the linking rules, and a browser check: both buttons on sign-in and register at desktop and phone widths, the Google redirect starting with the right client and callback, and Brad completing a Google sign-in on the dev server into an existing account.
