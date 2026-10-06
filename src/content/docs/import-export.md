Your stash is yours to take with you. Everything here is in **Settings**, under **Data**.

## Export

- **Export JSON** downloads every item and collection with its tags, in a format DevStash can import again.
- **Export Markdown** downloads one `.md` file: a section per collection with its items in order, then the items that are not in any collection, grouped by type.

## Import

**Import from JSON** takes a file exported from DevStash, or one written in the same format. Before anything is saved you see how many items of each type, collections, and tags the file holds.

- With **Skip duplicates** on, an item with the same title and type as one you already have is skipped.
- Collections are matched by name. Items for a collection you already have are added to the end of it.
- File and image uploads are switched off for now, so file and image items in an import are skipped.
- When it finishes, it tells you how many items and collections were imported and how many were skipped.

A minimal import file with one note in one collection:

```json
{
  "version": 1,
  "collections": [{ "name": "CI/CD" }],
  "items": [
    {
      "title": "Deploy checklist",
      "type": "note",
      "content": "## Before you deploy\n\n- Run the tests",
      "tags": ["deploy"],
      "collections": ["CI/CD"]
    }
  ]
}
```
