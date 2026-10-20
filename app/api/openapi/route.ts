import { handleOpenApi } from '../../../src/openapi';

export const runtime = 'nodejs';

async function respond(req: Request) {
  const r = handleOpenApi(req.method);
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', ...(r.headers ?? {}) } });
}

export const GET = respond;
export const POST = respond;
