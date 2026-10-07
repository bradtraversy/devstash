The DevStash API lets scripts and AI tools read, save, share, and delete items in your stash. It speaks JSON over HTTPS at `https://devstash.io/api/v1`.

## Create a token

Go to **Settings**, then **API tokens**, and click **Create token**. Name it after where you will use it, then copy it: the token is shown once and DevStash keeps only a one-way hash of it.

Anyone with a token can read, create, share, and delete your items, so keep it out of code you commit. Revoke a token on the same page and anything using it stops working right away. You can have up to 10 tokens.

Send the token in the `Authorization` header with every request:

```bash
curl -H "Authorization: Bearer ds_your_token" https://devstash.io/api/v1/items
```

## Save an item

`POST /api/v1/items` saves an item and returns it.

```bash
curl -X POST https://devstash.io/api/v1/items \
  -H "Authorization: Bearer ds_your_token" \
  -H "Content-Type: application/json" \
  -d '{"content": "docker compose up -d", "visibility": "unlisted"}'
```

Send `content`, or `url` for a link. Leave out `type` and DevStash works it out the same way the Home paste box does, along with the title and the language. Anything you send yourself wins over the guess.

| Field | Notes |
| --- | --- |
| `content` | The text of a snippet, command, note, or prompt, up to 500,000 characters |
| `url` | An http or https URL, for links only |
| `type` | `snippet`, `command`, `note`, `prompt`, or `link` |
| `title` | Up to 200 characters |
| `language` | For snippets and commands, such as `typescript` or `bash` |
| `description` | Up to 2,000 characters |
| `tags` | Up to 20 tags |
| `collectionIds` | Up to 20 of your collection ids |
| `visibility` | `private` (the default), `unlisted`, or `public` |

Files and images need an upload, so the API cannot create them. Commands lose any leading `$ ` prompts, the same as in the paste box.

The response holds the saved item. When it is shared, `link` is its short link:

```json
{
  "item": {
    "id": "cmg8x2k4p0001",
    "shortId": "k3v9q2xd",
    "type": "command",
    "title": "docker compose up -d",
    "content": "docker compose up -d",
    "visibility": "unlisted",
    "link": "https://devstash.io/s/k3v9q2xd"
  }
}
```

## Search and list

`GET /api/v1/items` lists your items, newest update first. Add `q` to search titles, descriptions, content, URLs, and tags, and `type` to keep one type.

```bash
curl -H "Authorization: Bearer ds_your_token" \
  "https://devstash.io/api/v1/items?q=docker&type=command"
```

Results come 20 at a time; use `limit` (up to 100) and `page` for more. Each result has a `preview` of its first 200 characters in place of the full content, and the response includes `page`, `totalPages`, and `totalCount`.

## Get one item

`GET /api/v1/items/{id}` returns the whole item. The `{id}` can be the item's id or its short id, so the end of a short link works too.

## Share or unshare

`PATCH /api/v1/items/{id}` with a new `visibility` shares an item or makes it private again, and returns the item with its `link`. Visibility is the only thing the API can change on an existing item for now.

```bash
curl -X PATCH https://devstash.io/api/v1/items/k3v9q2xd \
  -H "Authorization: Bearer ds_your_token" \
  -H "Content-Type: application/json" \
  -d '{"visibility": "public"}'
```

## Delete

Deleting through the API is permanent, the same as deleting in the app. There is no trash.

`DELETE /api/v1/items/{id}` deletes one item and returns its id and title.

`POST /api/v1/items/delete` deletes up to 100 at once. It returns what it deleted and which ids it could not find:

```bash
curl -X POST https://devstash.io/api/v1/items/delete \
  -H "Authorization: Bearer ds_your_token" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["k3v9q2xd", "p8m2w7ra"]}'
```

## Collections

`GET /api/v1/collections` lists your collections with their ids, item counts, visibility, and link, so you can pass the ids to `collectionIds` when you save.

## Limits and errors

Each account can make 120 requests a minute through the API, and 100 of them an hour can be saves (a save that fails validation still counts). Errors come back as JSON with an `error` message, and validation errors add `fieldErrors` keyed by field.

| Status | Meaning |
| --- | --- |
| `400` | The body or a parameter is not valid |
| `401` | The token is missing, wrong, or revoked |
| `403` | You have reached your item limit |
| `404` | No item of yours has that id |
| `429` | Too many requests; `Retry-After` says how many seconds to wait |
