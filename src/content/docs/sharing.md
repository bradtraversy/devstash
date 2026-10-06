Every item starts private. Sharing gives it a short link that keeps working for as long as the item is shared.

## Visibility

| Setting | Who can see it |
| --- | --- |
| Private | Only you |
| Unlisted | Anyone with the link. It is not listed anywhere or indexed by search engines |
| Public | Anyone, and search engines may index it |

Change it from the sharing block at the top of an item's drawer.

## Share an item

There are a few ways to get a link:

- **Save and share** in the Home paste box saves and shares in one step.
- **Share** on an item's row makes a private item unlisted and copies its link. On a shared item the same button copies the link.
- **Share with a link** in the drawer does the same, then shows Copy link, Open page, Raw, Card, and Image.
- **Share** in the top bar opens a quick dialog for pasting code or a command and getting a link back.

The link looks like `devstash.io/s/abc12345`. Stop sharing and the link stops working; share the item again and the same link comes back.

## Link formats

Every shared text item is available in more than one shape:

| URL | What you get |
| --- | --- |
| `/s/{id}` | The page, with syntax highlighting and a Copy button |
| `/s/{id}/raw` | Plain text, ready for curl. Commands drop their `$ ` prompts |
| `/s/{id}.png` | The item as an image, up to 500 lines |

Raw is handy in a terminal:

```bash
curl -s https://devstash.io/s/abc12345/raw
```

When you paste a link into Slack, Discord, or a social post, it unfurls into a preview card with the title and the first lines of code.

## The Shared page

**Shared** in the sidebar lists everything you have shared, items and collections, with Copy link and Stop sharing on each.

## Save to your stash

Anyone viewing a shared item or collection can click **Save to your stash** to copy it into their own account as private items. They sign in first if they need to. Saving a collection copies its items in order; collections with more than 200 items cannot be saved yet.

Collections have their own readable links; see [Collections](/docs/collections).
