A note can be a whole page: a tutorial, a cheat sheet, or the code that goes with a video. Share it and readers get one link with every section and code block in order.

## Bring in a gist or markdown doc

Paste the whole markdown file into the Home paste box. DevStash saves it as a note and takes the title from its first line, so start the file with a heading. Notes keep their markdown, so headings, lists, tables, links, and code fences all carry over.

## Write code blocks with a language

Fence each code block and name its language so it gets highlighted:

````markdown
## Install

```bash
npm install
npm run dev
```
````

Common short names work too, such as `sh`, `js`, `ts`, `py`, and `yml`. A fence without a language shows as plain text.

## What readers get

On the shared page:

- Every code block has a header with its language and its own **Copy** button. Shell blocks drop a leading `$ ` from each line when copied.
- Every heading gets a link. Hover a heading and click the `#` to get a URL that jumps straight to that section, like `/s/abc12345#install`.
- The note's own **Copy** button copies the whole markdown, and **Raw** serves it as plain text.

In your drawer the same code blocks are highlighted and have their own Copy buttons too.

## Tips

- Start sections at `##`. The note's title is already the page heading.
- Keep one topic per note. For a series, put the notes in a collection and share that (see [Collections](/docs/collections)).
- Prompts are markdown too, so long prompts with code blocks get the same treatment.
