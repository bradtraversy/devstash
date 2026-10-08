import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

vi.mock('@/lib/api/auth', () => ({ authenticateApiRequest: vi.fn() }));

vi.mock('@/lib/db/collections', () => ({ getCollectionSummaries: vi.fn() }));

import { authenticateApiRequest } from '@/lib/api/auth';
import { rateLimitedResponse, unauthorizedResponse } from '@/lib/api/respond';
import { getCollectionSummaries } from '@/lib/db/collections';
import { DELETE, GET, POST } from './route';

const mockAuth = vi.mocked(authenticateApiRequest);
const mockCollections = vi.mocked(getCollectionSummaries);

const USER = { id: 'user-1', isPro: false };

const HEADERS = {
  Authorization: 'Bearer ds_test',
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
  'MCP-Protocol-Version': '2025-06-18',
};

function post(body: string, headers: Record<string, string> = HEADERS): Promise<Response> {
  return POST(new Request('http://localhost/mcp', { method: 'POST', headers, body }));
}

function rpc(method: string, params?: unknown): Promise<Response> {
  return post(JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }));
}

async function rpcResult(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  const data = text.split('\n').find((line) => line.startsWith('data: '));
  const message = JSON.parse(data ? data.slice(6) : text);
  return message.result;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: USER });
});

describe('/mcp', () => {
  it('answers 401 before the MCP handler runs', async () => {
    mockAuth.mockResolvedValue({ response: unauthorizedResponse() });

    const res = await rpc('tools/list');

    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toBe('Bearer');
    expect(await res.json()).toEqual({ error: 'Invalid or missing API token' });
  });

  it('passes the shared rate limit through', async () => {
    mockAuth.mockResolvedValue({ response: rateLimitedResponse(30) });

    const res = await rpc('tools/list');

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
  });

  it('answers 500 when authentication throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAuth.mockRejectedValue(new Error('database down'));

    const res = await rpc('tools/list');

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Something went wrong' });
    consoleError.mockRestore();
  });

  it('lists the six tools through the real handler', async () => {
    const res = await rpc('tools/list');

    expect(res.status).toBe(200);
    const result = await rpcResult(res);
    const tools = result.tools as { name: string; annotations?: Record<string, boolean> }[];
    expect(tools.map((tool) => tool.name).sort()).toEqual(
      ['delete_items', 'get_item', 'list_collections', 'save_item', 'search_items', 'share_item'].sort()
    );
    expect(tools.find((tool) => tool.name === 'delete_items')?.annotations?.destructiveHint).toBe(true);
  });

  it('runs a tool as the authenticated user', async () => {
    mockCollections.mockResolvedValue([]);

    const res = await rpc('tools/call', { name: 'list_collections', arguments: {} });

    expect(res.status).toBe(200);
    const result = await rpcResult(res);
    expect(mockCollections).toHaveBeenCalledWith('user-1');
    expect(result.content).toEqual([{ type: 'text', text: '{"collections":[]}' }]);
  });

  it('runs each request as its own user', async () => {
    mockCollections.mockResolvedValue([]);
    mockAuth.mockResolvedValueOnce({ user: USER }).mockResolvedValueOnce({ user: { id: 'user-2', isPro: true } });

    await rpc('tools/call', { name: 'list_collections', arguments: {} });
    await rpc('tools/call', { name: 'list_collections', arguments: {} });

    expect(mockCollections.mock.calls).toEqual([['user-1'], ['user-2']]);
  });

  it('refuses a JSON-RPC batch so one request cannot carry many tool calls', async () => {
    const call = { jsonrpc: '2.0', method: 'tools/call', params: { name: 'list_collections', arguments: {} } };

    const res = await post(JSON.stringify([{ ...call, id: 1 }, { ...call, id: 2 }]));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Batch requests are not supported' },
    });
    expect(mockCollections).not.toHaveBeenCalled();
  });

  it('checks the token before looking at the body', async () => {
    mockAuth.mockResolvedValue({ response: unauthorizedResponse() });
    const res = await post('[{"jsonrpc":"2.0"}]');
    expect(res.status).toBe(401);
  });

  it('leaves a body that is not JSON to the handler, which refuses it', async () => {
    const res = await post('not json');
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(mockCollections).not.toHaveBeenCalled();
  });

  it('sends a browser to the setup page without authenticating', async () => {
    const res = await GET(
      new Request('http://localhost/mcp', { headers: { Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' } })
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toBe('http://localhost/docs/mcp');
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('keeps a GET that asks for an event stream on the MCP path', async () => {
    const res = await GET(
      new Request('http://localhost/mcp', {
        headers: { Authorization: 'Bearer ds_test', Accept: 'text/event-stream, text/html' },
      })
    );

    expect(res.status).toBe(405);
    expect(mockAuth).toHaveBeenCalled();
  });

  it.each([
    ['GET', GET],
    ['DELETE', DELETE],
  ])('answers %s with 405 since the server is stateless', async (method, route) => {
    const res = await route(new Request('http://localhost/mcp', { method, headers: { Authorization: 'Bearer ds_test' } }));
    expect(res.status).toBe(405);
    expect(mockAuth).toHaveBeenCalled();
  });
});
