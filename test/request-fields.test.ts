import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import { handleTabulate } from '../src/api.js';
import { handleReport } from '../src/report-api.js';
import { MCP_TOOLS, handleMcpMessage } from '../src/mcp.js';

const tab = (o: unknown) => handleTabulate('POST', JSON.stringify(o), { contentType: 'application/json' }) as { status: number; body: any };

// BUG-024: top-level request fields were not validated, so typos and wrong types were silently ignored.
describe('BUG-024: tabulate rejects request fields it would otherwise ignore', () => {
  it('unknown top-level key ("seat" for "seats") is 400 UNKNOWN_FIELD, not a silent single-winner count', () => {
    const r = tab({ ballots: '3,A\n2,B\n2,C', seat: 2 });
    expect(r.status).toBe(400); expect(r.body.error.code).toBe('UNKNOWN_FIELD'); expect(r.body.error.details.keys).toEqual(['seat']);
  });
  it('candidates that is not an array is 422 INVALID_CANDIDATES', () => {
    for (const candidates of ['A,B,C', 5, { A: 1 }]) {
      const r = tab({ ballots: '3,A\n2,B', candidates });
      expect(r.status).toBe(422); expect(r.body.error.code).toBe('INVALID_CANDIDATES');
    }
  });
  it('ballots and csv together is 400 AMBIGUOUS_BALLOTS', () => {
    const r = tab({ ballots: '3,A\n2,B', csv: '1,B\n9,C' });
    expect(r.status).toBe(400); expect(r.body.error.code).toBe('AMBIGUOUS_BALLOTS');
  });
  it('the same checks apply to POST /api/report', () => {
    const r: any = handleReport('POST', { rawBody: JSON.stringify({ ballots: '3,A', seat: 2 }), contentType: 'application/json' });
    expect(r.status).toBe(400); expect(r.body.error.code).toBe('UNKNOWN_FIELD');
  });
  it('every documented field still works, and null candidates means "absent"', () => {
    expect(tab({ ballots: '3,A\n2,B\n1,C', candidates: ['A', 'B', 'C'], rules: { tiebreak: 'lot' }, seats: 2, quota: 'hare' }).status).toBe(200);
    expect(tab({ csv: 'count,rank1,rank2\n3,A,B\n2,B,' }).status).toBe(200);
    expect(tab({ ballots: '3,A', candidates: null }).status).toBe(200);
  });
});

// BUG-025: MCP tool arguments were not checked against the advertised inputSchema.
describe('BUG-025: MCP tools/call agrees with each tool inputSchema', () => {
  const ajv = new (Ajv as any)({ strict: false });
  const cases: [string, Record<string, unknown>][] = [
    ['count_ballots', { ballots: '3,A\n2,B' }], ['count_ballots', { ballots: '3,A\n2,B', extra: 1 }],
    ['count_ballots', { ballots: '3,A\n2,B', candidates: 'A' }], ['count_ballots', { csv: 'count,rank1,rank2\n3,A,B\n2,B,' }],
    ['count_ballots', { ballots: [{ count: 3, ranks: ['A'] }] }], ['count_ballots', { ballots: '3,A\n2,B', seats: 0 }],
    ['count_ballots', { ballots: '3,A\n2,B\n1,C', seats: 2, quota: 'hare' }], ['count_ballots', {}],
    ['list_elections', {}], ['list_elections', { foo: 1 }], ['counting_rules', { foo: 1 }],
    ['election_rounds', { id: 'maine-2018-cd2' }], ['election_rounds', { id: 'maine-2018-cd2', extra: true }], ['election_rounds', { id: 5 }],
  ];
  for (const [name, args] of cases) it(`${name} ${JSON.stringify(args)}`, () => {
    const tool = MCP_TOOLS.find(t => t.name === name)!;
    const valid = ajv.validate(tool.inputSchema, args);
    const r: any = handleMcpMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
    expect(r.result.isError).toBe(!valid);
  });
});
