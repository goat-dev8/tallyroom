import { ApiResult } from '../../../../../src/api';
import { handleElectionTabulate } from '../../../../../src/elections/tabulate';

export const runtime = 'nodejs';

function send(r: ApiResult) {
  return new Response(JSON.stringify(r.body), {
    status: r.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(r.headers ?? {}) },
  });
}

async function respond(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return send(handleElectionTabulate(req.method, id));
}

export const POST = respond;
export const GET = respond;
export const PUT = respond;
export const DELETE = respond;
export const PATCH = respond;
