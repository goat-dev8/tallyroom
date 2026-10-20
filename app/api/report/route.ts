import { ApiResult } from '../../../src/api';
import { canonicalJson } from '../../../src/report';
import { handleReport } from '../../../src/report-api';

export const runtime = 'nodejs';

function send(r: ApiResult) {
  const body = r.status === 200 ? canonicalJson(r.body) : JSON.stringify(r.body);
  return new Response(body, {
    status: r.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(r.headers ?? {}) },
  });
}

export async function GET(req: Request) {
  const election = new URL(req.url).searchParams.get('election');
  return send(handleReport('GET', { election }));
}

export async function POST(req: Request) {
  const raw = await req.text();
  return send(handleReport('POST', { rawBody: raw, contentType: req.headers.get('content-type') ?? '' }));
}

async function other(req: Request) {
  return send(handleReport(req.method, {}));
}

export const PUT = other;
export const DELETE = other;
export const PATCH = other;
