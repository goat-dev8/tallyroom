import { fail, MAX_BODY_BYTES, tooLarge } from './errors.js';
import { BallotSemanticError, parseBallotJson, parseRankCsv, ParseError } from './parse.js';
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

function located(row?: number, column?: number, candidate?: string): Record<string, unknown> | null {
  const details: Record<string, unknown> = {};
  if (row !== undefined) details.row = row;
  if (column !== undefined) details.column = column;
  if (candidate !== undefined) details.candidate = candidate;
  return Object.keys(details).length ? details : null;
}

export function errorResult(e: unknown): ApiResult {
  if (e instanceof BallotSemanticError && e.code) {
    return fail(422, e.code, e.message, located(e.row, e.column, e.candidate));
  }
  if (e instanceof BallotSemanticError || e instanceof ParseError) {
    const unknown = e.candidate ?? (/unknown candidate "([^"]*)"/.exec(e.message)?.[1]);
    const details = located(e instanceof ParseError ? e.line : e.row, e.column, unknown);
    if (unknown) return fail(422, 'UNKNOWN_CANDIDATE', e.message, details);
    if (/count must be a positive integer/.test(e.message)) {
      const status = e instanceof ParseError ? 400 : 422;
      return fail(status, 'INVALID_COUNT', e.message, details);
    }
    if (/No valid ballots/.test(e.message)) return fail(422, 'NO_BALLOTS', e.message, details);
    if (/unterminated quoted field/.test(e.message)) return fail(400, 'UNTERMINATED_QUOTE', e.message, details);
    const status = e instanceof BallotSemanticError ? 422 : 400;
    return fail(status, status === 422 ? 'UNPROCESSABLE' : 'PARSE_ERROR', e.message, details);
  }
  if (e instanceof RangeError) return fail(400, 'SEATS_OUT_OF_RANGE', e.message, null);
  if (e instanceof Error) return fail(400, 'BAD_REQUEST', e.message, null);
  throw e;
}

/** Parse a tabulate/report upload into ballots. Does not count. */
export function parseTabulateBody(rawBody: string, contentType = ''): { ok: true; value: ParsedTabulate } | { ok: false; result: ApiResult } {
  if (rawBody.length > MAX_BODY_BYTES) return { ok: false, result: tooLarge() };
  try {
    if (isCsvUpload(contentType, rawBody)) {
      const parsed = parseRankCsv(rawBody);
      return checked({ ballots: parsed.ballots, candidates: parsed.candidates });
    }
    let req: any;
    try { req = JSON.parse(rawBody); } catch { return { ok: false, result: fail(400, 'INVALID_JSON', 'Invalid JSON body') }; }
    if (Array.isArray(req)) req = { ballots: req };
    if (!req || typeof req !== 'object') return { ok: false, result: fail(400, 'INVALID_BODY', 'JSON body must be an object') };
    const hasBallots = req.ballots !== undefined;
    const hasCsv = typeof req.csv === 'string';
    if (!hasBallots && !hasCsv) return { ok: false, result: fail(400, 'MISSING_BALLOTS', 'Field "ballots" (string) is required') };
    if (hasBallots && req.ballots !== null && typeof req.ballots !== 'string' && !Array.isArray(req.ballots)) {
      return { ok: false, result: fail(400, 'INVALID_BALLOTS', 'Field "ballots" must be a ranking string or an array of ballots') };
    }
    const resolved = resolveRules(req.rules);
    if (!resolved.ok) {
      const code = resolved.error.startsWith('Unknown rules preset') ? 'UNKNOWN_PRESET' : 'INVALID_RULES';
      return { ok: false, result: fail(400, code, resolved.error) };
    }
    const rules = resolved.rules;
    const unknown = Object.keys(rules ?? {}).filter(k => !RULE_KEYS.has(k));
    if (unknown.length) return { ok: false, result: fail(400, 'UNKNOWN_RULE', `Unknown rule key(s): ${unknown.join(', ')}`, { keys: unknown }) };
    const declared = Array.isArray(req.candidates) ? req.candidates.map((c: unknown) => String(c)) : undefined;
    const parsed = hasBallots ? parseBallotJson(req.ballots, declared) : parseRankCsv(req.csv, declared);
    return checked({ seats: req.seats, quota: req.quota, rules, ballots: parsed.ballots, candidates: parsed.candidates });
  } catch (e) {
    return { ok: false, result: errorResult(e) };
  }
}

function checked(value: ParsedTabulate): { ok: true; value: ParsedTabulate } | { ok: false; result: ApiResult } {
  const invalid = validateTabulateOptions(value);
  if (invalid) return { ok: false, result: fail(invalid.status, invalid.code, invalid.message, invalid.details ?? null) };
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
  if (method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'Method not allowed', null, { Allow: 'POST' });
  const parsed = parseTabulateBody(rawBody, opts.contentType ?? '');
  if (!parsed.ok) return parsed.result;
  try { return finish(parsed.value); }
  catch (e) { return errorResult(e); }
}
