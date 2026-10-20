import { BallotSemanticError, parseBallotJson, parseRankCsv } from './parse.js';
import { ParseError } from './parse.js';
import { tabulateIrv } from './irv.js';
import { tabulateStv } from './stv.js';
import { validateTabulateOptions } from './options.js';
import { resolveRules } from './presets.js';
import { BallotGroup, DEFAULT_RULES, Rules } from './types.js';
export const ENGINE_VERSION = '0.1.0';
const RULE_KEYS = new Set([...Object.keys(DEFAULT_RULES), 'duplicates', 'lotOrder']);
export interface ApiResult { status: number; body: unknown; headers?: Record<string, string> }
export interface TabulateOptions { contentType?: string }

function isCsvUpload(contentType: string, rawBody: string): boolean {
  const ct = contentType.toLowerCase();
  if (ct.includes('text/csv') || ct.includes('application/csv')) return true;
  if (ct.includes('application/json') || ct.includes('+json')) return false;
  const trimmed = rawBody.trimStart().replace(/^\uFEFF/, '');
  if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
  return true;
}

export interface ParsedTabulate {
  seats?: number;
  quota?: 'droop' | 'hare';
  rules?: Partial<Rules>;
  ballots: BallotGroup[];
  candidates: string[];
}

function errorResult(e: unknown): ApiResult {
  if (e instanceof BallotSemanticError) return { status: 422, body: { error: e.message } };
  if (e instanceof ParseError || e instanceof RangeError || e instanceof Error) return { status: 400, body: { error: (e as Error).message } };
  throw e;
}

/** Parse a tabulate/report upload into ballots. Does not count. */
export function parseTabulateBody(rawBody: string, contentType = ''): { ok: true; value: ParsedTabulate } | { ok: false; result: ApiResult } {
  if (rawBody.length > 10 * 1024 * 1024) return { ok: false, result: { status: 413, body: { error: 'Ballot file too large (max 10 MB)' } } };
  try {
    if (isCsvUpload(contentType, rawBody)) {
      const parsed = parseRankCsv(rawBody);
      return checked({ ballots: parsed.ballots, candidates: parsed.candidates });
    }
    let req: any;
    try { req = JSON.parse(rawBody); } catch { return { ok: false, result: { status: 400, body: { error: 'Invalid JSON body' } } }; }
    if (Array.isArray(req)) req = { ballots: req };
    if (!req || typeof req !== 'object') return { ok: false, result: { status: 400, body: { error: 'JSON body must be an object' } } };
    const hasBallots = req.ballots !== undefined;
    const hasCsv = typeof req.csv === 'string';
    if (!hasBallots && !hasCsv) return { ok: false, result: { status: 400, body: { error: 'Field "ballots" (string) is required' } } };
    if (hasBallots && req.ballots !== null && typeof req.ballots !== 'string' && !Array.isArray(req.ballots)) {
      return { ok: false, result: { status: 400, body: { error: 'Field "ballots" must be a ranking string or an array of ballots' } } };
    }
    const resolved = resolveRules(req.rules);
    if (!resolved.ok) return { ok: false, result: { status: 400, body: { error: resolved.error } } };
    const rules = resolved.rules;
    const unknown = Object.keys(rules ?? {}).filter(k => !RULE_KEYS.has(k));
    if (unknown.length) return { ok: false, result: { status: 400, body: { error: `Unknown rule key(s): ${unknown.join(', ')}` } } };
    const declared = Array.isArray(req.candidates) ? req.candidates.map((c: unknown) => String(c)) : undefined;
    const parsed = hasBallots ? parseBallotJson(req.ballots, declared) : parseRankCsv(req.csv, declared);
    return checked({ seats: req.seats, quota: req.quota, rules, ballots: parsed.ballots, candidates: parsed.candidates });
  } catch (e) {
    return { ok: false, result: errorResult(e) };
  }
}

function checked(value: ParsedTabulate): { ok: true; value: ParsedTabulate } | { ok: false; result: ApiResult } {
  const invalid = validateTabulateOptions(value);
  if (invalid) return { ok: false, result: invalid };
  return { ok: true, value };
}

function finish(value: ParsedTabulate): ApiResult {
  if (value.seats !== undefined && value.seats !== 1) {
    return { status: 200, body: { engineVersion: ENGINE_VERSION, method: 'stv', ...tabulateStv(value.ballots, value.candidates, value.seats, value.quota ?? 'droop') } };
  }
  const rules: Rules = { ...DEFAULT_RULES, ...(value.rules ?? {}) };
  return { status: 200, body: { engineVersion: ENGINE_VERSION, method: 'irv', ...tabulateIrv(value.ballots, value.candidates, rules) } };
}

/** Pure request handler shared by the serverless function and the tests. */
export function handleTabulate(method: string, rawBody: string, opts: TabulateOptions = {}): ApiResult {
  if (method !== 'POST') return { status: 405, headers: { Allow: 'POST' }, body: { error: 'Method not allowed' } };
  const parsed = parseTabulateBody(rawBody, opts.contentType ?? '');
  if (!parsed.ok) return parsed.result;
  try { return finish(parsed.value); }
  catch (e) { return errorResult(e); }
}
