import type { IncomingMessage, ServerResponse } from 'node:http';
import { ENGINE_VERSION } from '../src/api.js';
export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify({ ok: true, engineVersion: ENGINE_VERSION }));
}
