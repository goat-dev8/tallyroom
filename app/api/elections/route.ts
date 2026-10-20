import { ApiResult } from '../../../src/api';
import { handleElectionList } from '../../../src/elections/http';

export const runtime = 'nodejs';

function send(r: ApiResult) {
  return new Response(JSON.stringify(r.body), {
    status: r.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(r.headers ?? {}) },
  });
}

async function respond(req: Request) {
  return send(handleElectionList(req.method));
}

export const GET = respond;
export const POST = respond;
export const PUT = respond;
export const DELETE = respond;
export const PATCH = respond;
