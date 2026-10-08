import { createMcpHandler } from 'mcp-handler';
import { authenticateApiRequest } from '@/lib/api/auth';
import { apiJson, serverErrorResponse } from '@/lib/api/respond';
import { MCP_DOCS_PATH } from '@/lib/constants/links';
import { MCP_SERVER_OPTIONS, mcpAuthInfo, registerDevstashTools } from '@/lib/mcp/tools';

const mcpHandler = createMcpHandler(registerDevstashTools, MCP_SERVER_OPTIONS);

// A JSON-RPC batch would run up to 100 tool calls on one request's rate limit slot.
async function isBatch(request: Request): Promise<boolean> {
  if (request.method !== 'POST') return false;
  try {
    return Array.isArray(await request.clone().json());
  } catch {
    return false;
  }
}

// A browser opening the server URL lands on the setup page; MCP clients ask for JSON or an event stream.
function isBrowserVisit(request: Request): boolean {
  const accept = request.headers.get('accept') ?? '';
  return request.method === 'GET' && accept.includes('text/html') && !accept.includes('text/event-stream');
}

function batchRefused(): Response {
  return apiJson(
    { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Batch requests are not supported' } },
    400
  );
}

async function handler(request: Request): Promise<Response> {
  if (isBrowserVisit(request)) return Response.redirect(new URL(MCP_DOCS_PATH, request.url), 307);
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.response) return auth.response;
    if (await isBatch(request)) return batchRefused();
    request.auth = mcpAuthInfo(auth.user);
  } catch (error) {
    return serverErrorResponse('MCP authentication failed', error);
  }
  return mcpHandler(request);
}

export { handler as GET, handler as POST, handler as DELETE };
