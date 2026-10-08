# Homepage MCP

## Overview

The MCP server is only findable through the docs and the settings page. Brad wants people to know they can use DevStash from their agent without digging into the docs: a homepage section and a dedicated link (2026-10-08). The plan below was agreed the same day.

Branch: `feature/homepage-mcp` off `main`, one commit, then a pull request.

## Requirements

### Homepage section

- A new section after the link previews section and before Features, with `id="mcp"` and the navbar scroll offset the Sharing section uses, headed "Use it from your AI tools" with a line saying DevStash runs an MCP server so Claude Code, Codex, and Cursor can search the stash, save what you are working on, and hand back a share link without leaving the editor.
- Left: a terminal-style agent transcript built from the homepage sample data: a request to save the hook and share it, the `save_item` and `share_item` calls, and the short link for `SAMPLE_ITEM`; then a request to find Docker notes, a `search_items` call, and the titles of the three sample collection items it finds (search results carry no collection names, so the line does not name one). Static markup, hidden from screen readers only where it repeats the text.
- Right: "One line to connect", a sentence that nothing is installed (create a token on the settings page, add the server), a Claude Code, Codex, and Cursor switch showing each setup from `setupSnippet` with `ds_your_token` as the token and `https://devstash.io` as the origin, the kind's hint, a note that any MCP client that supports Streamable HTTP and can send a header works, and a "Connect your agent" brand button to the MCP docs.
- Texture, since the page runs long stretches of flat black (Brad, 2026-10-08): the section gets a faint dot grid that fades toward its edges and a soft violet glow behind the terminal, and the terminal sits lighter than the page with a distinct title bar. The "One link, every format" section after the hero gets a faint emerald glow behind the URL, like the hero and closing glows. Other sections stay as they are.
- The switch is a small client component with the tablist pattern `FormatExplorer` uses (roles, `aria-selected`, arrow keys); the snippets are computed on the server and passed in as strings. The homepage stays static.

### Dedicated link

- `MCP_DOCS_PATH` (`/docs/mcp`) in `src/lib/constants/links.ts`, used by the section's button, the footer link, the redirect below, and the API tokens card.
- The homepage Navbar, shared by the auth and docs pages, gets an "MCP" link to the homepage section (`/#mcp`) after Features, on desktop and in the mobile menu, like Sharing and Features (Brad, 2026-10-08). The footer's Resources column gets "MCP server", linking to the docs page.
- A browser that opens `https://devstash.io/mcp` (a GET whose `Accept` includes `text/html` and not `text/event-stream`) gets a 307 to the docs page before authentication, so the URL people paste into their agent explains itself. MCP clients ask for JSON or an event stream, so they still get the 401 or 405 they get today.

## Out of scope

- A separate landing page; the docs page is the destination (Brad, 2026-10-08).
- Changes to the hero, the features grid, or the MCP docs page.

## Testing

- Route tests: a browser GET redirects to `/docs/mcp` without authenticating; a GET asking for an event stream still authenticates and gets 405.
- `npm run verify`, with `/` still static.
- Browser check of the section, the switch with the keyboard, the navbar and footer links, and `/mcp` opened in the browser, at desktop and 375px.
