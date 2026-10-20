import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import { handleMcpHttp, handleMcpMessage, MCP_TOOLS } from '../src/mcp.js';
import { handleTabulate } from '../src/api.js';

const rpc = (method: string, params?: unknown, id: number = 1) => handleMcpMessage({ jsonrpc: '2.0', id, method, params }) as any;
const call = (name: string, args: unknown) => rpc('tools/call', { name, arguments: args }).result;

describe('MCP server', () => {
  it('initialize negotiates a known protocol version and advertises tools', () => {
    const r = rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } }).result;
    expect(r.protocolVersion).toBe('2025-06-18');
    expect(r.capabilities.tools).toBeDefined();
    expect(r.serverInfo.name).toBe('tallyroom');
    expect(rpc('initialize', { protocolVersion: '1999-01-01' }).result.protocolVersion).toBe('2025-11-25');
  });
  it('tools/list: four tools, each input schema compiles', () => {
    const tools = rpc('tools/list').result.tools;
    expect(tools.map((t: any) => t.name)).toEqual(['count_ballots', 'list_elections', 'election_rounds', 'counting_rules']);
    const ajv = new (Ajv2020 as any)({ strict: false });
    for (const t of tools) { expect(t.run).toBeUndefined(); expect(() => ajv.compile(t.inputSchema)).not.toThrow(); }
  });
  it('count_ballots gives the same answer as POST /api/tabulate (IRV)', () => {
    const args = { ballots: '5,Ada>Bo\n4,Bo>Ada\n2,Cy>Bo' };
    const r = call('count_ballots', args);
    expect(r.isError).toBe(false);
    expect(r.structuredContent).toEqual(handleTabulate('POST', JSON.stringify(args), { contentType: 'application/json' }).body);
    expect(r.structuredContent.winner).toBe('Bo');
    expect(JSON.parse(r.content[0].text).rounds).toHaveLength(2);
  });
  it('count_ballots runs STV with exact fractions and certified presets', () => {
    const stv = call('count_ballots', { ballots: '6,Ada>Bo\n3,Bo\n3,Cy>Bo\n2,Dee>Cy', seats: 2 }).structuredContent;
    expect(stv.method).toBe('stv');
    expect(stv.quotaExact).toBe('5/1'); // floor(14/3)+1
    expect(stv.winners[0]).toBe('Ada');
    const maine = call('count_ballots', { ballots: '3,Ada>_>_>Bo\n2,Bo\n1,Cy>Ada', rules: 'maine-2018' }).structuredContent;
    expect(maine.rules.skips).toBe('two-exhaust');
  });
  it('a bad count is a tool error carrying the API error code, not a protocol error', () => {
    const r = call('count_ballots', { ballots: '1,Zed', candidates: ['Ada'] });
    expect(r.isError).toBe(true);
    expect(r.structuredContent.error.code).toBe('UNKNOWN_CANDIDATE');
  });
  it('certified elections: list and rounds', () => {
    const list = call('list_elections', {}).structuredContent.elections;
    expect(list.map((e: any) => e.id)).toEqual(['maine-2018-cd2', 'alaska-2022', 'nyc-2021', 'burlington-2009']);
    const rounds = call('election_rounds', { id: 'alaska-2022' });
    expect(rounds.isError).toBe(false);
    expect(call('election_rounds', { id: 'mars-2030' }).structuredContent.error.code).toBe('UNKNOWN_ELECTION');
    expect(call('counting_rules', {}).structuredContent.presets.ids).toEqual(['maine-2018', 'alaska-2022', 'nyc-2021']);
  });
  it('JSON-RPC errors: unknown method, unknown tool, bad envelope, parse error; notifications get 202', () => {
    expect(rpc('resources/list').error.code).toBe(-32601);
    expect(rpc('tools/call', { name: 'drop_tables' }).error.code).toBe(-32602);
    expect((handleMcpMessage({ id: 1, method: 'ping' }) as any).error.code).toBe(-32600);
    expect(handleMcpHttp('POST', '{').status).toBe(400);
    expect(handleMcpHttp('POST', JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);
    expect(handleMcpHttp('GET', '').status).toBe(405);
    const batch = handleMcpHttp('POST', JSON.stringify([{ jsonrpc: '2.0', id: 7, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }]));
    expect(batch.body).toEqual([{ jsonrpc: '2.0', id: 7, result: {} }]);
  });
  it('stdio entry answers line-delimited JSON-RPC', async () => {
    const p = spawn(process.execPath, ['--import', 'tsx', 'mcp/stdio.ts'], { cwd: new URL('..', import.meta.url).pathname });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n');
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'count_ballots', arguments: { ballots: '2,A\n1,B' } } }) + '\n');
    p.stdin.end();
    await new Promise(r => p.on('close', r));
    const lines = out.trim().split('\n').map(l => JSON.parse(l));
    expect(lines[0].result.tools).toHaveLength(MCP_TOOLS.length);
    expect(lines[1].result.structuredContent.winner).toBe('A');
  }, 20000);
});
