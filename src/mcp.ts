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

const ok = (id: unknown, result: unknown) => ({ jsonrpc: '2.0', id, result });
const bad = (id: unknown, code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

/** Handle one JSON-RPC message. Returns null for notifications (no reply). */
export function handleMcpMessage(msg: unknown): unknown {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return bad(null, -32600, 'Invalid request');
  const { id, method, params } = msg as { id?: unknown; method?: unknown; params?: Json };
  if ((msg as Json).jsonrpc !== '2.0' || typeof method !== 'string') return bad(id, -32600, 'Invalid request');
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
      const args = (params?.arguments ?? {}) as Json;
      if (typeof args !== 'object' || Array.isArray(args)) return bad(id, -32602, 'arguments must be an object');
      // BUG-025: arguments the tool's inputSchema doesn't declare are an error (additionalProperties: false), not ignored.
      const props = Object.keys((tool.inputSchema.properties ?? {}) as Json);
      const extra = Object.keys(args).filter(k => !props.includes(k));
      if (extra.length) {
        const body = { error: { code: 'UNKNOWN_ARGUMENT', message: `Unknown argument(s): ${extra.join(', ')}`, details: { keys: extra } } };
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
export function handleMcpHttp(method: string, rawBody: string): ApiResult {
  if (method !== 'POST') return { status: 405, body: bad(null, -32000, 'Use POST'), headers: { Allow: 'POST' } };
  let msg: unknown;
  try { msg = JSON.parse(rawBody); } catch { return { status: 400, body: bad(null, -32700, 'Parse error') }; }
  if (Array.isArray(msg)) {
    const out = msg.map(handleMcpMessage).filter(r => r !== null);
    return out.length ? { status: 200, body: out } : { status: 202, body: null };
  }
  const r = handleMcpMessage(msg);
  return r === null ? { status: 202, body: null } : { status: 200, body: r };
}
