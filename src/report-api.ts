import { createHash } from 'node:crypto';
import { ENGINE_VERSION, parseTabulateBody, ParsedTabulate, ApiResult } from './api.js';
import { findElection } from './elections/registry.js';
import { tabulateIrv } from './irv.js';
import { canonicalJson } from './report.js';
import { handleElectionRounds } from './rounds-api.js';
import { RoundsPayload, RoundView, toRoundViews } from './rounds-build.js';
import { tabulateStv } from './stv.js';
import { DEFAULT_RULES, Rules } from './types.js';

export interface ShareableReport {
  engineVersion: string;
  election: string | null;
  name: string;
  jurisdiction: string | null;
  year: number | null;
  method: 'IRV' | 'STV';
  seats: number;
  candidates: string[];
  ballotCount: number;
  certifiedWinner: string | null;
  winner: string | null;
  winners: string[];
  rules: Rules | null;
  quota: string | null;
  source: string | null;
  rounds: RoundView[] | unknown[];
  contentHash: string;
}

export function contentHash(body: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalJson(body)).digest('hex')}`;
}

function seal(body: Omit<ShareableReport, 'contentHash'>): ShareableReport {
  return { ...body, contentHash: contentHash(body) };
}

function bundledReport(id: string): ApiResult {
  const election = findElection(id);
  if (!election) return { status: 404, body: { error: `Unknown election "${id}"` } };
  const served = handleElectionRounds('GET', election.id);
  const payload = served.body as RoundsPayload;
  const rules: Rules = { ...DEFAULT_RULES, ...election.rules };
  return {
    status: 200,
    body: seal({
      engineVersion: ENGINE_VERSION,
      election: election.id,
      name: election.name,
      jurisdiction: election.jurisdiction,
      year: election.year,
      method: 'IRV',
      seats: election.seats,
      candidates: [...election.candidates],
      ballotCount: payload.totalBallots,
      certifiedWinner: election.certifiedWinner,
      winner: payload.winner,
      winners: [payload.winner],
      rules,
      quota: null,
      source: election.source,
      rounds: payload.rounds,
    }),
  };
}

function uploadReport(value: ParsedTabulate): ShareableReport {
  const ballotCount = value.ballots.reduce((s, b) => s + b.count, 0);
  if (value.seats !== undefined && value.seats !== 1) {
    const result = tabulateStv(value.ballots, value.candidates, value.seats, value.quota ?? 'droop');
    return seal({
      engineVersion: ENGINE_VERSION,
      election: null,
      name: 'Uploaded ballots',
      jurisdiction: null,
      year: null,
      method: 'STV',
      seats: value.seats,
      candidates: value.candidates,
      ballotCount,
      certifiedWinner: null,
      winner: null,
      winners: result.winners,
      rules: null,
      quota: result.quota,
      source: null,
      rounds: result.rounds,
    });
  }
  const rules: Rules = { ...DEFAULT_RULES, ...(value.rules ?? {}) };
  const result = tabulateIrv(value.ballots, value.candidates, rules);
  return seal({
    engineVersion: ENGINE_VERSION,
    election: null,
    name: 'Uploaded ballots',
    jurisdiction: null,
    year: null,
    method: 'IRV',
    seats: 1,
    candidates: result.candidates,
    ballotCount: result.totalBallots,
    certifiedWinner: null,
    winner: result.winner,
    winners: [result.winner],
    rules,
    quota: null,
    source: null,
    rounds: toRoundViews(value.ballots, value.candidates, rules, result.rounds),
  });
}

export interface ReportInput { election?: string | null; rawBody?: string; contentType?: string }

/** GET /api/report?election=… and POST /api/report. The content hash covers every field except itself. */
export function handleReport(method: string, input: ReportInput = {}): ApiResult {
  if (method !== 'GET' && method !== 'POST') return { status: 405, headers: { Allow: 'GET, POST' }, body: { error: 'Method not allowed' } };
  if (method === 'GET') {
    if (!input.election) return { status: 400, body: { error: 'Query parameter "election" is required' } };
    return bundledReport(input.election);
  }
  const raw = input.rawBody ?? '';
  const contentType = input.contentType ?? '';
  if (raw.length > 10 * 1024 * 1024) return { status: 413, body: { error: 'Ballot file too large (max 10 MB)' } };
  const trimmed = raw.trimStart().replace(/^\uFEFF/, '');
  const csv = contentType.toLowerCase().includes('text/csv') || contentType.toLowerCase().includes('application/csv')
    || (!contentType.toLowerCase().includes('json') && trimmed.length > 0 && !trimmed.startsWith('{') && !trimmed.startsWith('['));
  if (!csv) {
    let req: any;
    try { req = JSON.parse(raw); } catch { return { status: 400, body: { error: 'Invalid JSON body' } }; }
    if (Array.isArray(req)) {
      // A JSON array is a ballot list; counted below.
    } else if (!req || typeof req !== 'object') {
      return { status: 400, body: { error: 'JSON body must be an object' } };
    } else if (typeof req.election === 'string') {
      if (req.ballots !== undefined || typeof req.csv === 'string') return { status: 400, body: { error: 'Provide either "election" or "ballots"' } };
      return bundledReport(req.election);
    } else if (req.ballots === undefined && typeof req.csv !== 'string') {
      return { status: 400, body: { error: 'Field "election" or "ballots" is required' } };
    }
  }
  const parsed = parseTabulateBody(raw, contentType);
  if (!parsed.ok) return parsed.result;
  try { return { status: 200, body: uploadReport(parsed.value) }; }
  catch (e) {
    if (e instanceof Error) return { status: 400, body: { error: e.message } };
    throw e;
  }
}
