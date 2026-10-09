# API and MCP Update Item

## Overview

Add partial item editing to `PATCH /api/v1/items/{id}` and expose the same capability through an `update_item` MCP tool. The API accepts an item ID or short ID. MCP also accepts a shared link. Omitted fields stay unchanged.

Branch: `feature/mcp-update-item` off `main`, one commit, then a pull request.

## Requirements

- Add `update_item` to the MCP server with write annotations. It is not read only or destructive, and repeated calls with the same input are idempotent.
- Accept `id` plus at least one of `title`, `description`, `content`, `url`, `language`, `tags`, or `collectionIds`.
- Resolve `id` as a full item ID, an 8-character short ID, or a DevStash short link.
- Omitted fields preserve their current values. `null` clears nullable scalar fields. Empty arrays clear tags or collection membership.
- Keep the item type and visibility unchanged. `share_item` remains the visibility tool.
- Enforce the API limits for editable fields: title 200 characters, description 2,000, content 500,000, URL 2,048, 20 tags of 50 characters, and 20 collections.
- Reject an empty title, an unknown language, an unsafe URL, a request with no edit fields, and collection IDs the user does not own.
- Enforce item shape after merging the partial input with the current item: links take one HTTP or HTTPS URL and no content; text items take content and no URL; only snippets and commands take a language.
- Allow metadata-only edits for file and image items. Their uploaded file fields cannot be changed through MCP.
- Return the updated item metadata, collections with visibility, and the current share link. The caller can use `get_item` for full content.
- Use the existing bearer-token authentication and shared API rate limit. Do not apply the create-only rate limit.

## API Route

- Expand `PATCH /api/v1/items/{id}` to accept the same partial edit fields as `update_item` and return `{ item }` with full content.
- Preserve the existing visibility-only PATCH body and behavior.
- Accept either a visibility change or item field edits in one request. Reject a body that mixes visibility with other edits so one PATCH cannot partially apply two separate write paths.
- Keep strict JSON validation and reject unknown keys.
- Resolve the route parameter as a full item ID or short ID, matching the existing API convention.
- Use the same shared update writer, type-aware merge validation, ownership checks, error status mapping, and public-path revalidation as MCP.

## Shared Write Path

- Move the authenticated update body into `updateItemForUser` in `src/lib/item-writes.ts`.
- Keep the browser server action signature and behavior unchanged by delegating to the shared writer after its existing validation.
- Reuse the existing database update and collection ownership checks.
- Look up public paths before the write and revalidate the affected item, collection, image, raw, and profile paths after it.
- Return the same not-found result for missing items and items owned by another user.

## Documentation

- Add `update_item` to the MCP documentation and README capability copy.
- Document partial item edits and the visibility-or-fields PATCH rule in the API documentation.
- Do not rewrite the completed MCP server spec, which correctly recorded editing as out of scope for its first release.

## Testing

- Tool registration exposes seven tools with correct annotations.
- Update by full ID, short ID, and short link.
- A title-only update preserves omitted fields.
- `null`, empty arrays, and omission have distinct clear, empty, and preserve behavior.
- Reject invalid field limits, invalid item shape, a request with no edit fields, and unknown collections.
- Missing or foreign items return not found without a write.
- Shared public paths revalidate before and after an edit.
- Existing browser update tests remain green through the shared writer.
- API route tests cover partial edits, preserve and clear semantics, invalid shape, visibility compatibility, mixed-body rejection, not found, and short-ID references.
- Run `npm run verify`.
- Run a scripted MCP update followed by `get_item` against a throwaway local account when a dev server is available.

## Out of Scope

- Changing item type. MCP visibility changes stay in `share_item`.
- Replacing uploaded files or images.
- Optimistic concurrency or revision checks. Updates remain last-writer-wins, matching the browser.
