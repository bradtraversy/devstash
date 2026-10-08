export const SETUP_KINDS = [
  { value: 'curl', label: 'curl', hint: 'Lists your newest items.' },
  { value: 'claude-code', label: 'Claude Code', hint: 'Run it in a terminal to add DevStash to every project.' },
  {
    value: 'codex',
    label: 'Codex',
    hint: 'Add it to ~/.codex/config.toml, which the Codex CLI, IDE extension, and app share.',
  },
  { value: 'cursor', label: 'Cursor', hint: 'Add it to ~/.cursor/mcp.json.' },
] as const;

export type SetupKind = (typeof SETUP_KINDS)[number]['value'];

export function mcpServerUrl(origin: string): string {
  return `${origin}/mcp`;
}

/** A ready-to-run way to use a new token, with the token filled in. */
export function setupSnippet(kind: SetupKind, origin: string, token: string): string {
  const header = `Authorization: Bearer ${token}`;
  switch (kind) {
    case 'curl':
      return `curl -H "${header}" ${origin}/api/v1/items`;
    case 'claude-code':
      return `claude mcp add --scope user --transport http devstash ${mcpServerUrl(origin)} --header "${header}"`;
    case 'codex':
      return [
        '[mcp_servers.devstash]',
        `url = "${mcpServerUrl(origin)}"`,
        `http_headers = { "Authorization" = "Bearer ${token}" }`,
      ].join('\n');
    case 'cursor':
      return JSON.stringify(
        { mcpServers: { devstash: { url: mcpServerUrl(origin), headers: { Authorization: `Bearer ${token}` } } } },
        null,
        2
      );
  }
}
