/**
 * Tallyroom as a Model Context Protocol server. Stateless JSON-RPC 2.0 core shared by the HTTP route
 * (app/api/mcp, one request per POST, fits a serverless function) and the stdio entry (mcp/stdio.ts).
 * Every tool calls the same handler as the matching REST endpoint, so MCP and HTTP answers are identical.
 */
import { ENGINE_VERSION, handleTabulate, ApiResult } from './api.js';
import { handleElectionList } from './elections/http.js';
import { handleElectionRounds } from './rounds-api.js';
import { countingOptions } from './options.js';
import { DUPLICATE_OPTIONS, OVERVOTE_OPTIONS, QUOTA_OPTIONS, SKIP_OPTIONS, TIEBREAK_OPTIONS } from './options.js';
import { PRESET_IDS } from './presets.js';
import { BUNDLED_ELECTIONS } from './elections/registry.js';
import { MAX_BODY_BYTES } from './errors.js';

export const MCP_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

type Json = Record<string, unknown>;
interface Tool { name: string; title: string; description: string; inputSchema: Json; run: (args: Json) => ApiResult }

const rulesSchema = { oneOf: [
  { type: 'string', enum: PRESET_IDS, description: 'Certified rule preset' },
  { type: 'object', additionalProperties: false, properties: {
    overvote: { type: 'string', enum: [...OVERVOTE_OPTIONS] }, skips: { type: 'string', enum: [...SKIP_OPTIONS] },
    duplicates: { type: 'string', enum: [...DUPLICATE_OPTIONS] }, batch: { type: 'boolean' },
    tiebreak: { type: 'string', enum: [...TIEBREAK_OPTIONS] }, lotOrder: { type: 'array', items: { type: 'string' } } } },
] };

export const MCP_TOOLS: Tool[] = [
  {
    name: 'count_ballots', title: 'Count ranked ballots',
    description: 'Run an exact ranked-choice count. One seat = instant runoff; seats > 1 = STV with exact fractions. Ballots are lines like "5,Ada>Bo>Cy" (count, then ranking; "_" = blank rank, "[Ada=Bo]" = overvote). Returns every round.',
    inputSchema: { type: 'object', anyOf: [{ required: ['ballots'] }, { required: ['csv'] }], additionalProperties: false, properties: {
      ballots: { oneOf: [{ type: 'string' }, { type: 'array' }] }, csv: { type: 'string', description: 'Alternative to ballots: CSV text' },
      candidates: { type: 'array', items: { type: 'string' } }, rules: rulesSchema,
      seats: { type: 'integer', minimum: 1 }, quota: { type: 'string', enum: [...QUOTA_OPTIONS] } } },
    run: a => handleTabulate('POST', JSON.stringify(a), { contentType: 'application/json' }),
  },
  {
    name: 'list_elections', title: 'List certified elections',
    description: 'Real elections bundled with Tallyroom, each reproduced exactly from official ballot data: id, candidates, ballot count, certified winner, official source.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
    run: () => handleElectionList('GET'),
  },
  {
    name: 'election_rounds', title: 'Rounds of a certified election',
    description: 'Round-by-round tallies, eliminations and vote transfers of one bundled election.',
    inputSchema: { type: 'object', required: ['id'], additionalProperties: false, properties: {
      id: { type: 'string', enum: BUNDLED_ELECTIONS.flatMap(e => [e.id, ...e.aliases]) } } },
    run: a => handleElectionRounds('GET', String(a.id ?? '')),
  },
  {
    name: 'counting_rules', title: 'Counting rule options',
    description: 'Every rule switch the counter accepts, its default, and the certified presets.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
    run: () => ({ status: 200, body: countingOptions() }),
  },
];

/** BUG-031: checks a value against the JSON Schema subset the tool inputSchemas use (type, enum value type, required, properties,
 *  additionalProperties: false, items, minimum, oneOf, anyOf). Returns the first problem as "path: reason", or null. */
export function schemaProblem(schema: Json, v: unknown, path = 'arguments'): string | null {
  const t = schema.type as string | undefined;
  const typeOk = (k: string) => k === 'object' ? !!v && typeof v === 'object' && !Array.isArray(v) : k === 'array' ? Array.isArray(v)
    : k === 'integer' ? Number.isInteger(v) : k === 'number' ? typeof v === 'number' && Number.isFinite(v) : typeof v === k;
  if (t && !typeOk(t)) return `${path}: must be ${t === 'integer' || t === 'array' || t === 'object' ? 'an' : 'a'} ${t}`;
  // Enum misses are left to the tool, which answers with the same specific code as the HTTP API (UNKNOWN_ELECTION, ...).
  if (schema.enum && typeof v !== typeof (schema.enum as unknown[])[0]) return `${path}: must be a ${typeof (schema.enum as unknown[])[0]}`;
  if (typeof schema.minimum === 'number' && typeof v === 'number' && v < schema.minimum) return `${path}: must be at least ${schema.minimum}`;
  if (schema.oneOf) {
    const forms = schema.oneOf as Json[]; const fits = forms.filter(f => !schemaProblem(f, v, path)).length;
    if (fits === 0) return forms.map(f => schemaProblem(f, v, path)).join(', or ');
    if (fits > 1) return `${path}: matches more than one allowed form`;
  }
  if (schema.anyOf && !(schema.anyOf as Json[]).some(s => !schemaProblem(s, v, path))) return `${path}: needs one of ${(schema.anyOf as Json[]).map(s => (s.required as string[] | undefined)?.join('+') ?? '?').join(' or ')}`;
  if (v && typeof v === 'object' && !Array.isArray(v) && (t === 'object' || schema.required || schema.properties)) {
    const o = v as Json;
    for (const k of (schema.required as string[] | undefined) ?? []) if (!(k in o)) return `${path}.${k}: is required`;
    const props = (schema.properties ?? {}) as Record<string, Json>;
    for (const [k, x] of Object.entries(o)) {
      if (props[k]) { const p = schemaProblem(props[k], x, `${path}.${k}`); if (p) return p; }
      else if (schema.additionalProperties === false) return `${path}.${k}: unknown argument`;
    }
  }
  if (Array.isArray(v) && schema.items) for (let i = 0; i < v.length; i++) { const p = schemaProblem(schema.items as Json, v[i], `${path}[${i}]`); if (p) return p; }
  return null;
}

const ok = (id: unknown, result: unknown) => ({ jsonrpc: '2.0', id, result });
const bad = (id: unknown, code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

/** Handle one JSON-RPC message. Returns null for notifications (no reply). */
export function handleMcpMessage(msg: unknown): unknown {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return bad(null, -32600, 'Invalid request');
  const { id, method, params } = msg as { id?: unknown; method?: unknown; params?: Json };
  // BUG-035: a request id is a string or a number (JSON-RPC 2.0 §4; MCP also rules out null).
  const idOk = id === undefined || typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id));
  if ((msg as Json).jsonrpc !== '2.0' || typeof method !== 'string' || !idOk) return bad(idOk ? id : null, -32600, 'Invalid request');
  const notification = id === undefined;
  if (notification) return null;
  switch (method) {
    case 'initialize': {
      const asked = typeof params?.protocolVersion === 'string' ? params.protocolVersion : '';
      return ok(id, {
        protocolVersion: MCP_PROTOCOL_VERSIONS.includes(asked) ? asked : MCP_PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'tallyroom', title: 'Tallyroom ranked-choice counter', version: ENGINE_VERSION },
        instructions: 'Use count_ballots for any ranked-choice count; list_elections and election_rounds for certified real elections.',
      });
    }
    case 'ping': return ok(id, {});
    case 'tools/list': return ok(id, { tools: MCP_TOOLS.map(({ run: _run, ...t }) => t) });
    case 'tools/call': {
      const tool = MCP_TOOLS.find(t => t.name === params?.name);
      if (!tool) return bad(id, -32602, `Unknown tool "${String(params?.name)}"`);
      // BUG-031: arguments may be left out, but when present (null included) they must be an object.
      const args = (params && 'arguments' in params ? params.arguments : {}) as Json;
      if (!args || typeof args !== 'object' || Array.isArray(args)) return bad(id, -32602, 'arguments must be an object');
      // BUG-025: arguments the tool's inputSchema doesn't declare are an error (additionalProperties: false), not ignored.
      const props = Object.keys((tool.inputSchema.properties ?? {}) as Json);
      const extra = Object.keys(args).filter(k => !props.includes(k));
      if (extra.length) {
        const body = { error: { code: 'UNKNOWN_ARGUMENT', message: `Unknown argument(s): ${extra.join(', ')}`, details: { keys: extra } } };
        return ok(id, { content: [{ type: 'text', text: JSON.stringify(body) }], structuredContent: body, isError: true });
      }
      // BUG-031: every argument is checked against the tool's inputSchema (types, enums), as the HTTP API would refuse it.
      const problem = schemaProblem(tool.inputSchema, args);
      if (problem) {
        const body = { error: { code: 'INVALID_ARGUMENT', message: problem, details: null } };
        return ok(id, { content: [{ type: 'text', text: JSON.stringify(body) }], structuredContent: body, isError: true });
      }
      const r = tool.run(args);
      const body = r.body as Json;
      return ok(id, { content: [{ type: 'text', text: JSON.stringify(body) }], structuredContent: body, isError: r.status !== 200 });
    }
    default: return bad(id, -32601, `Method not found: ${method}`);
  }
}

/** HTTP body -> HTTP response (streamable HTTP transport, JSON responses only, no sessions). */
// A JSON-RPC response or error object sent by the client (MCP transport: answered with 202 and no body).
const isResponse = (m: unknown) => !!m && typeof m === 'object' && !Array.isArray(m) && (m as Json).jsonrpc === '2.0' && !('method' in (m as Json)) && ('result' in (m as Json) || 'error' in (m as Json));
export function handleMcpHttp(method: string, rawBody: string, opts: { protocolVersion?: string | null } = {}): ApiResult {
  if (method !== 'POST') return { status: 405, body: bad(null, -32000, 'Use POST'), headers: { Allow: 'POST' } };
  // BUG-036: the cap is 4 MB of UTF-8, as on the REST routes (BUG-010), not 4 M UTF-16 characters.
  if (rawBody.length > MAX_BODY_BYTES || new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) return { status: 413, body: bad(null, -32000, 'Body over 4 MB') };
  // BUG-035: an MCP-Protocol-Version header the server doesn't support is 400 (MCP transport spec); absent is allowed.
  const pv = opts.protocolVersion;
  if (pv && !MCP_PROTOCOL_VERSIONS.includes(pv)) return { status: 400, body: bad(null, -32600, `Unsupported MCP-Protocol-Version "${pv}"; supported: ${MCP_PROTOCOL_VERSIONS.join(', ')}`) };
  let msg: unknown;
  try { msg = JSON.parse(rawBody); } catch { return { status: 400, body: bad(null, -32700, 'Parse error') }; }
  if (Array.isArray(msg)) {
    // BUG-035: an empty batch is one Invalid Request error (JSON-RPC 2.0 §6); client responses in a batch get no reply.
    if (msg.length === 0) return { status: 400, body: bad(null, -32600, 'Invalid request: empty batch') };
    const out = msg.filter(m => !isResponse(m)).map(handleMcpMessage).filter(r => r !== null);
    return out.length ? { status: 200, body: out } : { status: 202, body: null };
  }
  if (isResponse(msg)) return { status: 202, body: null };
  const r = handleMcpMessage(msg);
  return r === null ? { status: 202, body: null } : { status: 200, body: r };
}
