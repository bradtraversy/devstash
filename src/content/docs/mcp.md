The DevStash MCP server lets AI tools like Claude Code, Codex, and Cursor search, read, save, share, and delete items in your stash while you work. It runs at `https://devstash.io/mcp`, so there is nothing to install.

## Create a token

The MCP server signs in with an API token. Go to **Settings**, then **API tokens**, and click **Create token**. Once it is created, the dialog shows the setup for Claude Code, Codex, and Cursor with your token filled in, ready to copy. The token is shown once.

## Claude Code

Run this in a terminal, with your token in place of `ds_your_token`:

```bash
claude mcp add --scope user --transport http devstash https://devstash.io/mcp --header "Authorization: Bearer ds_your_token"
```

`--scope user` makes DevStash available in every project. Run `/mcp` inside Claude Code to see that it is connected.

## Codex

Add DevStash to `~/.codex/config.toml`:

```toml
[mcp_servers.devstash]
url = "https://devstash.io/mcp"
http_headers = { "Authorization" = "Bearer ds_your_token" }
```

The Codex CLI, the IDE extension, and the ChatGPT desktop app all read this file, so one entry covers each of them. Run `/mcp` inside Codex to see that it is connected.

To keep the token out of the file, put `bearer_token_env_var = "DEVSTASH_TOKEN"` in place of the `http_headers` line and set `DEVSTASH_TOKEN` in your environment. An app opened from the dock may not see variables from your shell profile, so the header is the simpler choice there.

## Cursor

Add DevStash to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "devstash": {
      "url": "https://devstash.io/mcp",
      "headers": {
        "Authorization": "Bearer ds_your_token"
      }
    }
  }
}
```

## Other clients

Any MCP client that supports Streamable HTTP and lets you set a header can connect: give it `https://devstash.io/mcp` and send `Authorization: Bearer ds_your_token`. Clients that only take a URL cannot connect yet, because the server has no sign-in screen of its own.

## What your AI tool can do

| Tool | What it does |
| --- | --- |
| `search_items` | Searches titles, descriptions, content, URLs, and tags, or lists your newest items |
| `get_item` | Reads one item in full, by its id, short id, or short link |
| `save_item` | Saves a snippet, command, prompt, note, or link, working out the type and title like the Home paste box |
| `share_item` | Makes an item unlisted or public and returns its link, or makes it private again |
| `delete_items` | Deletes up to 100 items at once |
| `list_collections` | Lists your collections, so new items can go into one |

Try asking "Save this function to DevStash and give me a share link" or "Find my Docker notes in DevStash".

New items are private unless you ask for them to be shared. As in the app, an item in an unlisted or public collection can be seen through that collection's link whatever its own setting. Anything the tools read from your stash goes to the AI tool you connected, under that tool's own terms.

## Deletes are permanent

There is no trash. A deleted item is gone, and so is its link. The delete tool is marked as destructive, and DevStash tells the model to show you the exact items and get your confirmation first. Read the list before you approve.

## Limits

The MCP server shares the API's limits: 120 requests a minute and 100 saves an hour per account, counted together with any API calls. Files and images cannot be saved through it.

## Revoke access

Revoke the token on the **Settings** page and the AI tool loses access right away. To take DevStash out of Claude Code, run `claude mcp remove --scope user devstash`. For Codex or Cursor, delete the `devstash` entry from its config file.
