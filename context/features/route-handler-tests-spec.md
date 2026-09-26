# Route Handler Tests

## Overview

Add Vitest coverage for the API route handlers and the three lib modules that the 2026-09-24 audit hardened by hand and by probe but never locked with tests. No production code changes.

## Requirements

- One test file next to each covered route handler, using the existing pattern: `vi.mock()` for `@/auth`, `@/lib/prisma`, `@/lib/rate-limit`, `@/lib/tokens`, `@/lib/email`, `@/lib/r2`, and `bcryptjs`, then call the exported handler with a `Request` and assert status and JSON.
- Direct unit tests for `src/lib/validation.ts`, `src/lib/tokens.ts`, and `src/lib/action-utils.ts`.
- `npm run verify` passes, including typecheck of the new test files.

## Routes In Scope

| Route | What the tests lock |
|-------|---------------------|
| `POST /api/auth/register` | rate limit runs before the body is read, required fields, password match and length, duplicate email, verification skipped only when `SKIP_EMAIL_VERIFICATION=true`, 201 shape, 500 on error |
| `GET /api/auth/verify` | missing, unknown, and expired tokens, expired token deleted, unknown user 404, already verified short-circuits, token deleted after use |
| `POST /api/auth/resend-verification` | email required, rate limit keyed by email, enumeration-safe response for unknown users, already verified, sends and returns success |
| `POST /api/auth/forgot-password` | rate limit before body, email required, same message for unknown user, OAuth-only user, and real user, token generated only for password users |
| `POST /api/auth/reset-password` | rate limit before body, token and password validation, unknown and expired tokens, expired token deleted, unknown user 404, password hashed and token deleted after use |
| `POST /api/auth/change-password` | 401 without session, required fields, length, OAuth-only account, wrong current password, success path hashes and updates |
| `DELETE /api/auth/delete-account` | 401 without session, no subscription deletes directly, active subscription cancelled first, already cancelled or missing subscription does not block, other Stripe errors return 502 and do not delete |
| `POST /api/upload` | 401, 403 for free users, rate limit keyed by user id, missing file, bad item type, `validateFile` rejection, success shape with the caller's user id passed to `uploadToR2` |
| `GET /api/download/[...path]` | 401, storage not configured 500, `ownedDownloadKey` rejection 403, R2 miss 404, success headers with timestamp prefix stripped from the filename |
| `GET /api/export` | 401, invalid format 400, ZIP for free user 403, JSON headers and body, ZIP only fetches owned file URLs |
| `GET /api/items/[id]` | 401, 404 when `getItemById` returns null, success passes the session user id |

## Out Of Scope

- The three Stripe routes (`checkout`, `portal`, `webhooks/stripe`). Stripe is not a product concern and may be removed.
- `api/auth/[...nextauth]`, which only re-exports the NextAuth handlers.
- Component tests and end-to-end tests.

## Notes

- Keep `bcryptjs` mocked in route tests; a real cost-12 hash is slow and is not what the route test is checking.
- Use `vi.mock('@/lib/rate-limit', async (importOriginal) => ...)` to replace `checkRateLimit` only, so the real `rateLimitResponse` shape is what the tests assert.
- Silence `console.error` with a spy in the tests that exercise the 500 paths.
