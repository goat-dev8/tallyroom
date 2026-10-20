import { handleMcpHttp } from '../../../src/mcp';
import { MAX_BODY_BYTES } from '../../../src/errors';

export const runtime = 'nodejs';

async function respond(req: Request) {
  const raw = req.method === 'POST' ? await req.text() : '';
  if (raw.length > MAX_BODY_BYTES) return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Body over 4 MB' } }, { status: 413 });
  const r = handleMcpHttp(req.method, raw);
  if (r.status === 202) return new Response(null, { status: 202 });
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...(r.headers ?? {}) } });
}

export const POST = respond;
export const GET = respond;
export const DELETE = respond;
