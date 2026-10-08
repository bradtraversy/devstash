import { describe, it, expect } from 'vitest';
import { SETUP_KINDS, mcpServerUrl, setupSnippet } from './setup-snippets';

const ORIGIN = 'https://devstash.io';
const TOKEN = 'ds_abc';

describe('setupSnippet', () => {
  it('lists items with curl', () => {
    expect(setupSnippet('curl', ORIGIN, TOKEN)).toBe(
      'curl -H "Authorization: Bearer ds_abc" https://devstash.io/api/v1/items'
    );
  });

  it('adds the MCP server to Claude Code for every project', () => {
    expect(setupSnippet('claude-code', ORIGIN, TOKEN)).toBe(
      'claude mcp add --scope user --transport http devstash https://devstash.io/mcp --header "Authorization: Bearer ds_abc"'
    );
  });

  it('writes Cursor config with the URL and header', () => {
    expect(JSON.parse(setupSnippet('cursor', ORIGIN, TOKEN))).toEqual({
      mcpServers: { devstash: { url: 'https://devstash.io/mcp', headers: { Authorization: 'Bearer ds_abc' } } },
    });
  });

  it('has a hint for every kind', () => {
    for (const kind of SETUP_KINDS) {
      expect(kind.hint).not.toBe('');
      expect(setupSnippet(kind.value, ORIGIN, TOKEN)).toContain(TOKEN);
    }
  });
});

describe('mcpServerUrl', () => {
  it('is /mcp on the origin', () => {
    expect(mcpServerUrl('http://localhost:3001')).toBe('http://localhost:3001/mcp');
  });
});
