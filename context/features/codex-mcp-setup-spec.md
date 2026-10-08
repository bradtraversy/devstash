# Codex MCP Setup

## Overview

The MCP docs page and the token dialog show setup for Claude Code and Cursor only. Codex connects too: it reads remote MCP servers from `~/.codex/config.toml`, with the bearer token in `http_headers` or an environment variable named by `bearer_token_env_var`, and the Codex CLI, IDE extension, and ChatGPT desktop app share that file (OpenAI's Codex MCP docs, checked 2026-10-08). `codex mcp add` takes no header flag, so the setup is a config entry, not a command. Brad asked for Codex alongside the other two (2026-10-08).

Branch: `feature/codex-mcp-setup` off `main`, one commit, then a pull request.

## Requirements

- `SETUP_KINDS` gains Codex between Claude Code and Cursor, with the hint "Add it to ~/.codex/config.toml, which the Codex CLI, IDE extension, and app share."
- `setupSnippet('codex', origin, token)` returns the TOML entry with the token in the header, as the Cursor snippet does, because an app opened from the dock may not see variables from the shell profile:

  ```toml
  [mcp_servers.devstash]
  url = "{origin}/mcp"
  http_headers = { "Authorization" = "Bearer {token}" }
  ```

- The MCP docs page names Codex in the intro and the Create a token paragraph, gets a Codex section between Claude Code and Cursor (the entry, that one entry covers the CLI, IDE extension, and app, `/mcp` to check it, and `bearer_token_env_var` as the way to keep the token out of the file), and the Revoke section says to delete the entry from the Codex or Cursor config.
- The API tokens card's MCP link reads "connect Claude Code, Codex, or Cursor", and the README's MCP line names Codex.

## Out of scope

- A `codex mcp add` command, since it cannot set a header.
- TOML highlighting on the docs page; TOML is not in the language registry, so the fence renders as Plain Text.

## Testing

- Unit test for the Codex snippet (URL and header, token filled in); the existing every-kind test covers its hint.
- `npm run verify`.
- Browser check of the token dialog's Codex option and the docs page.
