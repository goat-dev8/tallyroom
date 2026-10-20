import { ENGINE_VERSION, ApiResult } from './api.js';
import { fail } from './errors.js';
import { DUPLICATE_OPTIONS, OVERVOTE_OPTIONS, QUOTA_OPTIONS, SKIP_OPTIONS, TIEBREAK_OPTIONS } from './options.js';
import { PRESET_IDS } from './presets.js';
import { BUNDLED_ELECTIONS } from './elections/registry.js';

/** OpenAPI 3.1 description of the public HTTP API. Enum values come from the same constants the validators use,
 *  and test/openapi.test.ts replays every documented example against the real handlers. */
const errorBody = {
  type: 'object', required: ['error'],
  properties: { error: { type: 'object', required: ['code', 'message', 'details'], properties: {
    code: { type: 'string', description: 'Stable machine-readable code, e.g. UNKNOWN_CANDIDATE, INVALID_OVERVOTE' },
    message: { type: 'string' }, details: { type: ['object', 'null'] } } } },
} as const;
const err = (description: string) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
const json = (schema: object, description: string, example?: unknown) => ({ description, content: { 'application/json': { schema, ...(example === undefined ? {} : { example }) } } });
const electionId = { name: 'id', in: 'path', required: true, schema: { type: 'string', enum: BUNDLED_ELECTIONS.flatMap(e => [e.id, ...e.aliases]) } } as const;

export const TABULATE_EXAMPLES = {
  irv: { ballots: '5,Ada>Bo\n4,Bo>Ada\n2,Cy>Bo', rules: { tiebreak: 'previous-round' } },
  stv: { ballots: '6,Ada>Bo\n3,Bo\n3,Cy>Bo\n2,Dee>Cy', seats: 2, quota: 'droop' },
  preset: { ballots: '3,Ada>_>_>Bo\n2,Bo\n1,Cy>Ada', rules: 'maine-2018' },
} as const;

export function openApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Tallyroom counting API', version: ENGINE_VERSION,
      description: 'Exact instant-runoff (IRV) and multi-seat STV counts with per-round tallies. The engine reproduces the certified results of Maine 2018 CD2, Alaska 2022, NYC 2021 and Burlington 2009 (see PARITY.md in the repository).',
    },
    servers: [{ url: '/', description: 'Same origin as this document' }],
    paths: {
      '/api/tabulate': { post: {
        operationId: 'tabulate', summary: 'Count uploaded ballots (IRV, or STV when seats > 1)',
        requestBody: { required: true, content: {
          'application/json': { schema: { $ref: '#/components/schemas/TabulateRequest' }, examples: Object.fromEntries(Object.entries(TABULATE_EXAMPLES).map(([k, v]) => [k, { value: v }])) },
          'text/csv': { schema: { type: 'string', description: 'Ranking lines `count,A>B>C`, or one rank per column with an optional header' }, example: 'count,ranking\n5,Ada>Bo\n4,Bo>Ada' },
        } },
        responses: {
          200: json({ oneOf: [{ $ref: '#/components/schemas/IrvResult' }, { $ref: '#/components/schemas/StvResult' }] }, 'Count result'),
          400: err('Malformed body, unknown rule key, unknown preset, or seats out of range'),
          413: err('Body over 4 MB'), 422: err('Well-formed but not countable: unknown candidate, invalid option value, no ballots'),
          405: err('Only POST is allowed'),
        } } },
      '/api/report': {
        get: { operationId: 'reportBundled', summary: 'Shareable report for a bundled election, sealed with a content hash',
          parameters: [{ name: 'election', in: 'query', required: true, schema: electionId.schema }],
          responses: { 200: json({ $ref: '#/components/schemas/Report' }, 'Report'), 400: err('Missing election'), 404: err('Unknown election') } },
        post: { operationId: 'reportUpload', summary: 'Shareable report for uploaded ballots (same body as /api/tabulate)',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TabulateRequest' } } } },
          responses: { 200: json({ $ref: '#/components/schemas/Report' }, 'Report'), 400: err('Bad request'), 413: err('Body over 4 MB'), 422: err('Not countable') } } },
      '/api/elections': { get: { operationId: 'listElections', summary: 'Bundled certified elections',
        responses: { 200: json({ type: 'object', required: ['elections'], properties: { elections: { type: 'array', items: { $ref: '#/components/schemas/ElectionMetadata' } } } }, 'List') } } },
      '/api/elections/{id}/rounds': { get: { operationId: 'electionRounds', summary: 'Precomputed rounds and transfers of a bundled election',
        parameters: [electionId], responses: { 200: json({ type: 'object' }, 'Rounds payload'), 404: err('Unknown election') } } },
      '/api/elections/{id}/tabulate': { post: { operationId: 'electionTabulate', summary: 'Recount a bundled election from its ballot data now',
        parameters: [electionId], responses: { 200: json({ $ref: '#/components/schemas/IrvResult' }, 'Count result plus certifiedWinner'), 404: err('Unknown election') } } },
      '/api/options': { get: { operationId: 'options', summary: 'Accepted rule values, defaults and presets', responses: { 200: json({ type: 'object' }, 'Options') } } },
      '/api/health': { get: { operationId: 'health', summary: 'Liveness and engine version',
        responses: { 200: json({ type: 'object', required: ['ok', 'engineVersion'], properties: { ok: { const: true }, engineVersion: { type: 'string' } } }, 'Healthy') } } },
      '/api/mcp': { post: { operationId: 'mcp', summary: 'Model Context Protocol endpoint (JSON-RPC 2.0, streamable HTTP, stateless). Tools: count_ballots, list_elections, election_rounds, counting_rules',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: json({ type: 'object' }, 'JSON-RPC response'), 202: { description: 'Notification accepted' }, 400: json({ type: 'object' }, 'JSON-RPC parse error (-32700) or invalid request') } } },
      '/api/openapi': { get: { operationId: 'openapi', summary: 'This document', responses: { 200: json({ type: 'object' }, 'OpenAPI 3.1') } } },
    },
    components: { schemas: {
      Error: errorBody,
      Rules: { type: 'object', additionalProperties: false, properties: {
        overvote: { enum: [...OVERVOTE_OPTIONS] }, skips: { enum: [...SKIP_OPTIONS] }, duplicates: { enum: [...DUPLICATE_OPTIONS] },
        batch: { type: 'boolean', description: 'Single-winner IRV only; 422 INVALID_BATCH when true with seats > 1.' }, tiebreak: { enum: [...TIEBREAK_OPTIONS] }, lotOrder: { type: 'array', items: { type: 'string' } } } },
      TabulateRequest: { type: 'object', properties: {
        ballots: { oneOf: [{ type: 'string', description: '`count,A>B>C` lines; `_` blank rank, `[A=B]` overvote' }, { type: 'array' }] },
        csv: { type: 'string', description: 'Alternative to ballots: CSV text' },
        candidates: { type: 'array', items: { type: 'string' }, description: 'Declared candidates; unknown names on ballots are rejected' },
        rules: { oneOf: [{ $ref: '#/components/schemas/Rules' }, { enum: PRESET_IDS }] },
        seats: { type: 'integer', minimum: 1 }, quota: { enum: [...QUOTA_OPTIONS] } } },
      IrvRound: { type: 'object', required: ['round', 'tallies', 'continuing', 'inactive', 'threshold', 'eliminated'], properties: {
        round: { type: 'integer' }, tallies: { type: 'object', additionalProperties: { type: 'integer' } }, continuing: { type: 'integer' },
        inactive: { type: 'object', additionalProperties: { type: 'integer' } }, threshold: { type: 'integer' },
        eliminated: { type: 'array', items: { type: 'string' } }, tieNote: { enum: ['previous-round', 'lot'] }, transfers: { type: 'object' } } },
      IrvResult: { type: 'object', required: ['engineVersion', 'method', 'winner', 'rounds', 'totalBallots', 'candidates', 'rules'], properties: {
        engineVersion: { type: 'string' }, method: { const: 'irv' }, winner: { type: 'string' }, totalBallots: { type: 'integer' },
        candidates: { type: 'array', items: { type: 'string' } }, rules: { $ref: '#/components/schemas/Rules' },
        rounds: { type: 'array', items: { $ref: '#/components/schemas/IrvRound' } } } },
      StvResult: { type: 'object', required: ['engineVersion', 'method', 'winners', 'quota', 'quotaExact', 'rounds'], properties: {
        engineVersion: { type: 'string' }, method: { const: 'stv' }, winners: { type: 'array', items: { type: 'string' } },
        quota: { type: 'string', description: '4 dp' }, quotaExact: { type: 'string', description: 'reduced fraction n/d' }, rounds: { type: 'array' } } },
      ElectionMetadata: { type: 'object', required: ['id', 'name', 'candidates', 'ballotCount', 'certifiedWinner', 'source'], properties: {
        id: { type: 'string' }, name: { type: 'string' }, jurisdiction: { type: 'string' }, year: { type: 'integer' }, method: { const: 'IRV' },
        seats: { type: 'integer' }, candidates: { type: 'array', items: { type: 'string' } }, ballotCount: { type: 'integer' },
        certifiedWinner: { type: 'string' }, source: { type: 'string' } } },
      Report: { type: 'object', required: ['contentHash', 'method', 'winners', 'rounds'], properties: { contentHash: { type: 'string', pattern: '^sha256:[0-9a-f]{64}$' } } },
    } },
  };
}

export function handleOpenApi(method: string): ApiResult {
  if (method !== 'GET') return fail(405, 'METHOD_NOT_ALLOWED', 'Method not allowed', null, { Allow: 'GET' });
  return { status: 200, body: openApiDocument() };
}
