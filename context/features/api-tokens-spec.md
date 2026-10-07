# API Tokens

## Overview

Nothing outside the browser can act as a DevStash user today. Sign-in is a NextAuth session cookie, and writes go through server actions, which only the web app can call and whose ids change on every build. This feature adds personal API tokens and a small versioned JSON API at `/api/v1`, the base for the remote MCP server that follows (Brad, 2026-10-04). The CLI is on hold and there is no trash, so deletes through the API are permanent like deletes in the app (Brad, 2026-10-07).

Every endpoint wraps the queries and checks the server actions already use. The bodies of the create, delete, and visibility actions move into shared functions that both the actions and the API call, so no rule exists twice.

Branch: `feature/api-tokens` off `main`, one commit, then a pull request.

## Requirements

### Data model

- New `ApiToken` model (`api_tokens`): `id`, `name` (1 to 50 characters), `tokenHash` (unique, SHA-256 hex of the full token), `lastFour` (for display), `lastUsedAt` (nullable), `createdAt`, `userId` with `onDelete: Cascade` and an index. One migration that only adds the table.
- No expiry and no scopes: every token has full access to its owner's items until revoked. Revoking deletes the row. Account deletion removes tokens through the cascade, so a deleted account's token fails on the next request.
- At most 10 tokens per user, checked inside the create transaction.

### Tokens

- Format `ds_` followed by 32 random bytes in base64url (46 characters). The prefix makes a leaked token easy to recognise and scan for.
- `src/lib/api/tokens.ts`: `generateApiToken()` returns the token, its hash, and its last four characters; `hashApiToken(token)`; `parseBearerToken(header)` returns the token only for `Bearer ds_` plus exactly 43 base64url characters, else null.
- The plain token is returned once, by the create action, and never stored, logged, or sent again.
- `lastUsedAt` is written with one `updateMany` where it is null or older than 10 minutes, so busy clients cost one write per 10 minutes. A failed write is logged and never fails the request.

### Authentication

- `authenticateApiRequest(request)` in `src/lib/api/auth.ts` parses the `Authorization` header, hashes the token, and finds it with its user's `id` and `isPro` in one query. It returns the user or a 401 response.
- The 401 is identical for a missing header, a malformed token, an unknown token, and a revoked token: `{ "error": "Invalid or missing API token" }` with `WWW-Authenticate: Bearer`.
- Tokens are accepted only in the header, never in the query string. `/api/v1` ignores the session cookie entirely, so there is no CSRF surface, and it sends no CORS headers.
- `isPro` comes from the database row, not a JWT.

### Rate limits

- New `api` limit: 120 requests per minute per user. New `apiCreate` limit: 100 item creates per hour per user, which also slows scripted spam of public pages. Both keyed by user id and fail open (the 1,000-item ceiling still holds).
- Order in every handler: authenticate, rate limit, then parse the body. A 429 carries `Retry-After`.

### Shared write functions

- `src/lib/item-writes.ts` holds what runs after authentication: `createItemForUser(user, input)` (the file and image gate, the item limit, the link URL rule, the owned file reference rule, the create query, revalidation), `deleteItemForUser(userId, itemId)` (public path lookup, the delete query with R2 cleanup, revalidation), and `setItemVisibilityForUser(userId, itemId, visibility)`. Each returns `ActionResult`.
- The `createItem`, `deleteItem`, and `setItemVisibility` server actions keep their signatures and become session check plus one call. Their existing tests stay green.

### Endpoints

All responses are JSON with `Cache-Control: no-store`. Errors are `{ "error": string, "fieldErrors"?: Record<string, string[]> }` with 400 for invalid JSON or validation, 401, 403 for the item limit, 404, 429, and 500 with a generic message. An `{id}` is an item id or its 8-character short id, so a pasted short link works. Another user's item is a 404, never a 403.

Items come back in one shape, built from `ItemDetail` by `toApiItem`: `id`, `shortId`, `type`, `title`, `description`, `content`, `url`, `language`, `tags`, `collections` (`id`, `name`), `visibility` (`private`, `unlisted`, `public`), `link` (the full `/s/{shortId}` URL from `siteOrigin()`, or null while private), `isFavorite`, `isPinned`, `fileName`, `fileSize`, `createdAt`, `updatedAt`. The R2 file URL never appears.

- `POST /api/v1/items` creates an item and returns 201 `{ item }`.
  - Body: `content`, `url`, `type` (`snippet`, `prompt`, `command`, `note`, `link`), `title`, `language`, `description`, `tags`, `collectionIds`, `visibility` (default `private`). Unknown keys are rejected.
  - Needs `content` or `url`. Without `type`, the type is detected like the Home paste box (`detectPasteType`); the title, language, and content then come from `pasteAs` for that type (so a command loses its `$ ` prompts), and any field the caller sends wins over the guess.
  - `file` and `image` are refused with 400: files need an upload, which the API does not do.
  - `language` must be one of the editor's `LANGUAGES` values. Limits: title 200, description 2,000, content 500,000 characters; up to 20 tags of 50 characters; up to 20 collection ids, which must be the caller's own.
  - A shared visibility stamps `publishedAt` and gives the owner a handle, the same as the app.
- `GET /api/v1/items?q=&type=&page=&limit=` lists or searches and returns `{ items, page, totalPages, totalCount }`.
  - `q` matches title, description, content, URL, or a tag name, case-insensitive. `type` filters by type. `limit` 1 to 100, default 20. Newest update first, id as tiebreaker.
  - List items carry `preview` (the first 200 characters of content, or the URL) in place of `content`, `description`, and `collections`; `GET /api/v1/items/{id}` returns the whole item.
- `GET /api/v1/items/{id}` returns `{ item }`.
- `PATCH /api/v1/items/{id}` with `{ "visibility": "unlisted" }` shares or unshares and returns `{ item }`. Visibility is the only field in v1, and other keys are rejected so clients learn that early.
- `DELETE /api/v1/items/{id}` deletes through the same path as the drawer (R2 file removed, public pages revalidated) and returns `{ deleted: { id, title } }`.
- `POST /api/v1/items/delete` with `{ "ids": [...] }` (1 to 100, ids or short ids, duplicates dropped) deletes each through the same path and returns `{ deleted: [{ id, title }], notFound: [...] }`, so the caller sees exactly what was removed.
- `GET /api/v1/collections` returns `{ collections }` with `id`, `name`, `description`, `itemCount`, `visibility`, and `link` (the short link, or null while private), so a client can find the ids `collectionIds` takes.

### Settings

- An API tokens card on the settings page after Data: "Let scripts and AI tools use your stash. Anyone with a token can read, create, share, and delete your items."
- Rows show the name, `ds_...` with the last four characters, the created date, last used (relative, or Never), and Revoke through `ConfirmDeleteDialog` ("Anything using this token stops working right away").
- Create token opens a dialog with a name field. After creating, the dialog shows the token in a mono box with Copy, "Copy it now. You won't see it again.", and a curl example with the token filled in. Done closes it and refreshes the list.
- With 10 tokens, Create token is disabled and says why. An empty list says "No tokens yet."
- `createApiToken` and `revokeApiToken` server actions in `src/actions/api-tokens.ts` with Zod validation and the ownership check; queries in `src/lib/db/api-tokens.ts`.

### Docs and copy

- New docs page `api` ("API"): creating a token, the header, each endpoint with a curl example, limits, and errors. Added to the docs manifest after Import and export.
- Privacy: account details include API token names, when each was last used, and a one-way hash of each token, never the token itself. Last-updated date moves.
- README: the API in the features list and the docs link.

## Out of scope

- The remote MCP server (next feature), the CLI (on hold), OAuth.
- Token scopes or read-only tokens, expiry, editing an item's other fields, collection writes, file uploads, an OpenAPI document, browser use with CORS, and registering the `ds_` prefix with GitHub secret scanning.

## Notes

- Additions to the SPEC's endpoint list, both needed by the MCP: `PATCH` for visibility (its share tool shares an existing item) and `GET /api/v1/collections` (saving into a collection needs ids).
- Detecting the type when it is omitted lets an MCP "save this" call send only the content and get the same result as the Home paste box.
- No IP limit on failed token checks: 256-bit tokens cannot be guessed, and each failed check is one indexed lookup.
- A changed password leaves tokens working, as on GitHub; revoking is on the settings page.

## Testing

- Unit tests: token generation, hashing, and bearer parsing (wrong prefix, wrong length, query string ignored); `authenticateApiRequest` for each 401 case and a valid token; the `lastUsedAt` throttle; the token actions (plain token returned once and only the hash stored, the 10-token cap, revoking someone else's token fails); `toApiItem` (link null while private, no file URL).
- Route handler tests for every endpoint: 401 without a token, 429 before the body is parsed, 404 for another user's item by id and by short id, create with a detected type and with an explicit type, explicit fields winning over the guess, a link without a URL, file types refused, unknown keys refused, the item limit, sharing on create returning a link, search by tag, bulk delete with some ids not found.
- The existing action tests keep passing after the move into `item-writes.ts`.
- `npm run verify`; the migration applied to the Docker restore and an empty database with the CI drift check clean.
- Scripted curl checks against the dev server with a throwaway account's token: every endpoint, the returned link opening the public page, a revoked token getting 401, and the account's deletion removing its tokens.
- Browser check of the settings card: create, copy, the curl example, revoke, the 10-token state, and phone width.
- An independent security review of the token handling and every handler before merge.
