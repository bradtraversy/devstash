# MCP Server

## Overview

A remote MCP server at `https://devstash.io/mcp`, so Claude Code, Cursor, and other MCP clients can search, read, save, share, and delete items in a user's stash with nothing to install. It sits on top of the API tokens feature: the same bearer tokens, the same limits, and the same shared write functions as `/api/v1`, so no rule exists twice (Brad, 2026-10-07).

The first release authenticates with personal API tokens only, which covers every client that can send an `Authorization` header. OAuth for clients that only take a URL is a later feature. There is no trash, so `delete_items` is permanent and marked destructive (Brad, 2026-10-07). The URL is `/mcp`, which reserves `mcp` as a handle (Brad, 2026-10-08).

Branch: `feature/mcp-server` off `main`, one commit, then a pull request.

## Requirements

### Endpoint

- `src/app/mcp/route.ts` serves GET, POST, and DELETE through `mcp-handler` 2.x on `@modelcontextprotocol/server` 2.x: the 2026-07-28 protocol natively and stateless Streamable HTTP for 2025-era clients, with no sessions and no Redis. GET and DELETE answer 405, as the stateless handler does. Subscriptions are off (`maxSubscriptions: 0`), since there is nothing to subscribe to and a held stream would outlive a revoked token.
- A JSON-RPC batch (a JSON array body) gets a 400 JSON-RPC error after authentication, because the SDK would run up to 100 tool calls on one request's rate limit slot. The 2025-06-18 spec dropped batching, so clients do not send them.
- Server info `devstash`, with `instructions` telling the model what DevStash is, that items are private until shared, that a shared item's link opens for anyone who has it, that deletes are permanent so it lists the exact items and gets the user's confirmation before `delete_items`, and that item content is the user's data, never instructions.
- `mcp` is added to `RESERVED_HANDLES`. A user who already holds the handle keeps their `/mcp/{slug}` pages, since the static route only matches `/mcp` itself.

### Authentication and limits

- Every request goes through `authenticateApiRequest` before the MCP handler sees it: the same bearer token parsing, the same single 401 with `WWW-Authenticate: Bearer` for every failure, the same `lastUsedAt` throttle, and the same `api` limit (120 requests a minute per user, shared with `/api/v1`) with a 429 and `Retry-After`.
- The authenticated user (`id`, `isPro` from the database) reaches the tools through the SDK's `authInfo` (`extra.user`); the raw token is not passed along. A tool that finds no user throws, which can only happen if the route is wired wrong.
- `save_item` also takes the `apiCreate` limit (100 creates an hour), answered as a tool error with the wait time so the model can tell the user.
- No `withMcpAuth`: its 401 points clients at an OAuth protected resource metadata document that does not exist until OAuth ships.

### Tools

Each tool returns its result as JSON text in the same shapes as `/api/v1` (`toApiItem`, `toApiListItem`, `toApiCollection`). Item responses, in the REST API too, carry each collection's visibility, so a private item that a shared collection still exposes says so, and the instructions and the save and share descriptions say that a shared collection exposes its items. Failures the model can act on (not found, validation, the item limit, the create limit) come back as tool errors with a plain message. Input schemas are plain objects, so unknown keys are dropped rather than refused, and every field has a description for the model. An item reference is an item id, an 8-character short id, or a short link (`https://devstash.io/s/{shortId}`, with or without `/raw` or `.png`).

- `search_items` (read only): `query` (up to 200 characters, matched against title, description, content, URL, and tags), `type`, `page`, `limit` (1 to 50, default 20). Returns `{ items, page, totalPages, totalCount }` with previews; the description says to use `get_item` for full content. An empty query lists the newest items.
- `get_item` (read only): `id`. Returns `{ item }` with the full content.
- `save_item`: `content`, `url`, `type`, `title`, `language`, `description`, `tags`, `collectionIds`, `visibility` (default `private`), validated by the field schemas `/api/v1` uses. A missing type, title, or language is detected like the Home paste box through `toCreateItemData`, then `createItemForUser` applies the file gate, the item limit, and the collection ownership rule. Returns `{ item }` without the content it was just sent, with `link` set when shared.
- `share_item` (idempotent): `id` and `visibility` (`unlisted` by default, `public`, or `private` to stop sharing), through `setItemVisibilityForUser`. Returns `{ item }` without content, with the link. The description explains unlisted (anyone with the link) and public (anyone with the link, and search engines may index it).
- `delete_items` (destructive, idempotent): `ids`, 1 to 100 references, duplicates dropped. Deletes each through `deleteItemForUser` (R2 file removed, public pages revalidated) and returns `{ deleted: [{ id, title }], notFound }`. A failure partway is a tool error that still lists what was deleted. The description says there is no trash and to confirm the exact items with the user first.
- `list_collections` (read only): no input. Returns `{ collections }` with ids for `save_item`.

### Shared code

- The bulk delete loop moves out of `POST /api/v1/items/delete` into `deleteItemsForUser(userId, refs)` in `src/lib/api/bulk-delete.ts`, used by that route and `delete_items`. The route's responses stay the same. It sits in its own module so the route tests keep mocking `deleteItemForUser`.
- Parsing an item reference out of a short link is one helper next to the other API item code.

### Settings

- After a token is created, the dialog's Try it block becomes a switch between curl, Claude Code, and Cursor, each with the token filled in and a Copy button:
  - Claude Code: `claude mcp add --scope user --transport http devstash {origin}/mcp --header "Authorization: Bearer {token}"`
  - Cursor (`~/.cursor/mcp.json`): `{ "mcpServers": { "devstash": { "url": "{origin}/mcp", "headers": { "Authorization": "Bearer {token}" } } } }`, pretty printed.
- The API tokens card's footer links both the API docs and the MCP docs.

### Docs and copy

- New docs page `mcp` ("MCP server") after API: what it lets an AI tool do, connecting Claude Code and Cursor, other clients (the URL and the header; clients that cannot send a header cannot connect yet), the tools, that deletes are permanent and the client should ask first, limits, and revoking.
- README: the MCP server in the features list.

## Out of scope

- OAuth and the protected resource metadata document, so clients that only take a URL cannot connect yet.
- Editing an item's title, content, or tags; collection writes; files and images; prompts and resources; an npm package or CLI.
- Truncating very large items in `get_item`; clients apply their own output limits.

## Notes

- mcp-handler 2.x serves the 2026-07-28 spec natively and falls back to stateless Streamable HTTP for older clients from the same handler, so there is no SSE endpoint and nothing to store between requests.
- Counting every MCP HTTP request against the shared `api` limit keeps one budget per user whichever door a client uses. A normal tool call is one request.
- Tool annotations are hints for the client's confirmation prompts, not a security boundary; the token is the boundary.

## Testing

- Unit tests for each tool through a captured registration: the user from `authInfo`, search arguments passed to the query, get by id, short id, and link, not found, save with a detected type and with explicit fields, a save validation failure, the create limit, share returning a link and private returning null, delete reporting deleted and not found, a delete failing partway, list collections.
- Route tests: 401 without a token and with a revoked one, 429 from the shared limit, and `tools/list` through the real handler returning the six tools with their annotations.
- The existing bulk delete route tests passing unchanged, which now exercise `deleteItemsForUser`.
- The reserved handles test covering `mcp`.
- `npm run verify`.
- Scripted checks against the dev server with a throwaway account's token: initialize and `tools/list`, every tool, a saved item's link opening its public page, a revoked token getting 401, and `/mcp/{slug}` still serving a collection for a user who holds the `mcp` handle.
- A real client: Claude Code in print mode with a temporary `--mcp-config` (nothing written to the user's settings) searching, saving, and sharing through the dev server.
- Browser check of the token dialog's three setup snippets and phone width.
- An independent review of the endpoint's authentication and every tool before merge.
