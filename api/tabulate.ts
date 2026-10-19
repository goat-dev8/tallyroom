import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleTabulate } from '../src/api.js';
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const chunks: Buffer[] = []; let size = 0;
  for await (const c of req) { size += (c as Buffer).length; if (size > 10 * 1024 * 1024 + 1) break; chunks.push(c as Buffer); }
  const r = handleTabulate(req.method ?? 'GET', Buffer.concat(chunks).toString('utf8'));
  res.statusCode = r.status; res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(r.headers ?? {})) res.setHeader(k, v);
  res.end(JSON.stringify(r.body));
}
