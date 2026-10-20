import { handleMcpHttp } from '../../../src/mcp';

export const runtime = 'nodejs';

async function respond(req: Request) {
  const raw = req.method === 'POST' ? await req.text() : '';
  // The 4 MB UTF-8 cap (413) and the MCP-Protocol-Version check live in handleMcpHttp (BUG-035, BUG-036).
  const r = handleMcpHttp(req.method, raw, { protocolVersion: req.headers.get('mcp-protocol-version') });
  if (r.status === 202) return new Response(null, { status: 202 });
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...(r.headers ?? {}) } });
}

export const POST = respond;
export const GET = respond;
export const DELETE = respond;
