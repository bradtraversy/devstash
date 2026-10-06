A collection groups items in a fixed order, like the commands for one lesson or the snippets for one project. An item can be in any number of collections.

## Create and fill a collection

- **New Collection** in the top bar creates one with a name and an optional description.
- Add items from the **Collections** field in the New Item form, or from the drawer's Edit mode.
- On the collection's page, the up and down buttons on each row set the order.

Deleting a collection keeps its items; they stay in your stash.

## Publish a collection

Set the visibility on the collection's page to Unlisted or Public (see [Sharing and links](/docs/sharing) for what each means). A shared collection gets two links:

- A readable URL: `devstash.io/{handle}/{slug}`
- A short link: `devstash.io/s/{id}`, which redirects to the readable one

The public page shows every item in order, each with a Copy button and an anchor link (`#b1`, `#b2`, and so on). **Copy as markdown** copies the whole collection, and adding `.md` to the URL serves it as one markdown file:

```bash
curl -s https://devstash.io/yourhandle/react-patterns.md
```

## Handles and slugs

Your handle is the first part of every collection URL. It is created from your email the first time you share, and you can change it in Settings.

The slug comes from the collection's name. Change it in the collection's Edit dialog. Old URLs redirect to the new one, so links you have already posted keep working.
