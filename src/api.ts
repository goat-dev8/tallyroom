import { parseBallots, ParseError } from './parse.js';
import { tabulateIrv } from './irv.js';
import { tabulateStv } from './stv.js';
import { DEFAULT_RULES, Rules } from './types.js';
export const ENGINE_VERSION = '0.1.0';
const RULE_KEYS = new Set([...Object.keys(DEFAULT_RULES), 'duplicates', 'lotOrder']);
export interface ApiResult { status: number; body: unknown; headers?: Record<string, string> }
/** Pure request handler shared by the serverless function and the tests. */
export function handleTabulate(method: string, rawBody: string): ApiResult {
  if (method !== 'POST') return { status: 405, headers: { Allow: 'POST' }, body: { error: 'Method not allowed' } };
  if (rawBody.length > 10 * 1024 * 1024) return { status: 413, body: { error: 'Ballot file too large (max 10 MB)' } };
  let req: any;
  try { req = JSON.parse(rawBody); } catch { return { status: 400, body: { error: 'Invalid JSON body' } }; }
  if (!req || typeof req.ballots !== 'string') return { status: 400, body: { error: 'Field "ballots" (string) is required' } };
  const unknown = Object.keys(req.rules ?? {}).filter(k => !RULE_KEYS.has(k));
  if (unknown.length) return { status: 400, body: { error: `Unknown rule key(s): ${unknown.join(', ')}` } };
  try {
    const { ballots, candidates } = parseBallots(req.ballots, req.candidates);
    if (req.seats !== undefined && req.seats !== 1) {
      return { status: 200, body: { engineVersion: ENGINE_VERSION, method: 'stv', ...tabulateStv(ballots, candidates, req.seats, req.quota ?? 'droop') } };
    }
    const rules: Rules = { ...DEFAULT_RULES, ...(req.rules ?? {}) };
    return { status: 200, body: { engineVersion: ENGINE_VERSION, method: 'irv', ...tabulateIrv(ballots, candidates, rules) } };
  } catch (e) {
    if (e instanceof ParseError || e instanceof RangeError || e instanceof Error) return { status: 400, body: { error: (e as Error).message } };
    throw e;
  }
}
