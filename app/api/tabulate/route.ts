import { handleTabulate } from '../../../src/api';
export const runtime = 'nodejs';
const MAX = 10 * 1024 * 1024;
async function respond(req: Request) {
  const raw = req.method === 'POST' ? await req.text() : '';
  const r = handleTabulate(req.method, raw.length > MAX + 1 ? raw.slice(0, MAX + 1) : raw);
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...(r.headers ?? {}) } });
}
export const POST = respond; export const GET = respond; export const PUT = respond; export const DELETE = respond; export const PATCH = respond;
