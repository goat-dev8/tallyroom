import { handleTabulate } from '../../../src/api';
import { fail, MAX_BODY_BYTES, tooLarge } from '../../../src/errors';

export const runtime = 'nodejs';
const MAX = MAX_BODY_BYTES;

function send(r: { status: number; body: unknown; headers?: Record<string, string> }) {
  return new Response(JSON.stringify(r.body), {
    status: r.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(r.headers ?? {}) },
  });
}

async function respond(req: Request) {
  if (req.method !== 'POST') return send(handleTabulate(req.method, ''));
  const ct = req.headers.get('content-type') ?? '';
  if (ct.toLowerCase().includes('multipart/form-data')) {
    let form: FormData;
    try { form = await req.formData(); }
    catch { return send(fail(400, 'MULTIPART', 'Could not read multipart form data')); }
    const file = form.get('file') ?? form.get('ballots');
    if (typeof file === 'string') return send(handleTabulate('POST', file, { contentType: 'text/csv' }));
    if (file == null) return send(fail(400, 'MISSING_FILE', 'Expected a file field named "file" or "ballots"', { fields: ['file', 'ballots'] }));
    if (file.size > MAX) return send(tooLarge());
    const raw = await file.text();
    const name = file.name ?? '';
    const type = file.type || (name.endsWith('.json') ? 'application/json' : 'text/csv');
    return send(handleTabulate('POST', raw, { contentType: type }));
  }
  const raw = await req.text();
  return send(handleTabulate(req.method, raw.length > MAX + 1 ? raw.slice(0, MAX + 1) : raw, { contentType: ct }));
}

export const POST = respond;
export const GET = respond;
export const PUT = respond;
export const DELETE = respond;
export const PATCH = respond;
