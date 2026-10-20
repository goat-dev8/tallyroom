import { describe, it, expect } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import { handleTabulate } from '../src/api.js';
import { parseBallots } from '../src/parse.js';
import { tabulateIrv } from '../src/irv.js';
import { eliminationTransfers } from '../src/transfers.js';
import { handleMcpMessage, handleMcpHttp } from '../src/mcp.js';
import { openApiDocument } from '../src/openapi.js';
import { buildFlow } from '../components/sankey.js';

// Independent review, round 3 (cursor-round3-report.md, items N1..N14). Each block names its BUG id.
const post = (b: unknown, ct = 'application/json') => handleTabulate('POST', typeof b === 'string' ? b : JSON.stringify(b), { contentType: ct }) as { status: number; body: any };
const call = (name: string, args: unknown) => handleMcpMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) as any;

describe('BUG-028 (N1): the STV quota counts valid ballots only (Scottish LGE Order 2007, Sch. 1 rules 43, 45(3), 46)', () => {
  it('9 blank ballots do not raise the quota or change the winners', () => {
    const r = post({ ballots: '10,A>C\n6,B\n5,C\n9,_', seats: 2, candidates: ['A', 'B', 'C'] });
    expect(r.body.quotaExact).toBe('8/1'); expect(r.body.winners).toEqual(['A', 'C']);
  });
  it('first-rank overvotes, undeclared write-ins and two-exhaust blanks are void too; Hare uses valid ballots', () => {
    for (const extra of ['9,[A=B]', '9,Write-in']) {
      const r = post({ ballots: `10,A>C\n6,B\n5,C\n${extra}`, seats: 2, candidates: ['A', 'B', 'C'] });
      expect(r.body.quotaExact).toBe('8/1'); expect(r.body.winners).toEqual(['A', 'C']);
    }
    const t = post({ ballots: '10,A>C\n6,B\n5,C\n9,_>_>A', seats: 2, candidates: ['A', 'B', 'C'], rules: { skips: 'two-exhaust' } });
    expect(t.body.quotaExact).toBe('8/1');
    expect(post({ ballots: '10,A>C\n6,B\n5,C\n9,_', seats: 2, quota: 'hare', candidates: ['A', 'B', 'C'] }).body.quotaExact).toBe('21/2');
  });
  it('no valid ballots at all is 422 NO_VALID_BALLOTS, not a quota of zero', () => {
    const r = post({ ballots: '9,_', seats: 2, quota: 'hare', candidates: ['A', 'B', 'C'] });
    expect(r.status).toBe(422); expect(r.body.error.code).toBe('NO_VALID_BALLOTS');
  });
});

describe('BUG-029 (N2): surpluses are transferred one at a time, largest first (rule 49(1))', () => {
  it('A\'s surplus elects C, so B\'s surplus skips C and goes to D', () => {
    const r = post({ ballots: '91,A>C\n55,B>C>D\n10,C\n40,D\n44,F', seats: 4, candidates: ['A', 'B', 'C', 'D', 'F'] });
    expect([...r.body.winners].sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(r.body.rounds[0].surplusTransferred).toBe('A');
  });
});

describe('BUG-030 (N3): a quoted ranking field keeps its value (RFC 4180 §2)', () => {
  it('quotes around a whole ranking', () => {
    const r = post('5,"Ada>Bo"\n4,"Bo>Ada"\n2,"Cy>Bo"\n', 'text/csv');
    expect(r.status).toBe(200); expect(r.body.winner).toBe('Bo'); expect(r.body.candidates).toEqual(['Ada', 'Bo', 'Cy']);
  });
  it('a quoted ranking whose names contain commas', () => {
    const r = post('5,"Ada, Jr.>Bo"\n4,"Bo>Ada, Jr."\n', 'text/csv');
    expect(r.body.candidates).toEqual(['Ada, Jr.', 'Bo']); expect(r.body.winner).toBe('Ada, Jr.');
  });
});

describe('BUG-031 (N4 remainder; BUG-025 covered extra keys): MCP arguments are type-checked against the inputSchema', () => {
  it('election_rounds with id as an array is an error, as over HTTP', () => expect(call('election_rounds', { id: ['alaska-2022'] }).result.isError).toBe(true));
  it('arguments: null is not an object', () => expect(call('list_elections', null).result?.isError ?? call('list_elections', null).error).toBeTruthy());
  it('a valid call still works', () => expect(call('election_rounds', { id: 'alaska-2022' }).result.isError).toBe(false));
});

describe('BUG-032 (N5): Sankey node ids never collide with reserved nodes', () => {
  for (const t of ['5,inactive>Alice\n3,Alice>inactive\n4,Bob\n2,_', '6,out>Alice\n5,Alice>out\n4,Bob\n3,Cy>Bob\n2,_'])
    it(JSON.stringify(t), () => { const p = parseBallots(t); const ids = buildFlow(tabulateIrv(p.ballots, p.candidates) as any, 0)!.nodes.map(n => n.id); expect(new Set(ids).size).toBe(ids.length); });
});

describe('BUG-033 (N6): a candidate called "exhausted" is not merged with the exhausted pile', () => {
  it('two edges: Zed to the candidate (3) and Zed to the pile (2)', () => {
    const { ballots } = parseBallots('3,Zed>exhausted\n2,Zed\n6,exhausted>Alice\n6,Alice>exhausted'); const c = ['Alice', 'exhausted', 'Zed'];
    const e = eliminationTransfers(ballots, c, {}, tabulateIrv(ballots, c).rounds, 1);
    expect(e).toHaveLength(2); expect(e.find(x => x.exhausted)?.count).toBe(2); expect(e.find(x => !x.exhausted)?.count).toBe(3);
  });
});

describe('BUG-034 (N7): very many candidates', () => {
  it('130,000 one-vote candidates get a documented 422 quickly, not a stack overflow reported as SEATS_OUT_OF_RANGE', () => {
    const body = Array.from({ length: 130000 }, (_, i) => `1,c${i}`).join('\n'); const t = Date.now();
    const r = post({ ballots: body });
    expect(r.status).toBe(422); expect(r.body.error.code).toBe('TOO_MANY_CANDIDATES'); expect(Date.now() - t).toBeLessThan(5000);
  }, 120000);
  it('1,000 candidates are still counted', () => {
    const r = post({ ballots: Array.from({ length: 1000 }, (_, i) => `${i + 1},c${i}`).join('\n') });
    expect(r.status).toBe(200); expect(r.body.winner).toBe('c999');
  }, 60000);
});

describe('BUG-035 (N9): MCP JSON-RPC conformance', () => {
  for (const id of [true, {}, null]) it(`request id ${JSON.stringify(id)} is -32600`, () => expect((handleMcpMessage({ jsonrpc: '2.0', id, method: 'ping' }) as any).error?.code).toBe(-32600));
  it('a posted JSON-RPC response gets 202 and no body', () => { const r = handleMcpHttp('POST', '{"jsonrpc":"2.0","id":4,"result":{}}'); expect(r.status).toBe(202); expect(r.body).toBeNull(); });
  it('an empty batch is a single -32600 error', () => { const r: any = handleMcpHttp('POST', '[]'); expect(r.status).toBe(400); expect(r.body.error.code).toBe(-32600); });
  it('an unsupported MCP-Protocol-Version header is 400', () => expect(handleMcpHttp('POST', '{"jsonrpc":"2.0","id":1,"method":"ping"}', { protocolVersion: '1999-01-01' }).status).toBe(400));
  it('a supported or absent header is fine', () => {
    expect(handleMcpHttp('POST', '{"jsonrpc":"2.0","id":1,"method":"ping"}', { protocolVersion: '2025-06-18' }).status).toBe(200);
    expect(handleMcpHttp('POST', '{"jsonrpc":"2.0","id":1,"method":"ping"}').status).toBe(200);
  });
});

describe('BUG-036 (N10): the MCP 4 MB cap counts UTF-8 bytes, and 413 is documented', () => {
  it('2.2M "é" (4.4 MB in UTF-8) is 413', () => {
    const raw = '{"jsonrpc":"2.0","id":1,"method":"ping","params":{"x":"' + 'é'.repeat(2_200_000) + '"}}';
    expect(raw.length).toBeLessThan(4 * 1024 * 1024); expect(handleMcpHttp('POST', raw).status).toBe(413);
  });
  it('OpenAPI lists 413 for /api/mcp', () => expect(Object.keys((openApiDocument() as any).paths['/api/mcp'].post.responses)).toContain('413'));
});

describe('BUG-037 (N11): OpenAPI /api/mcp 200 allows the batch (array) response', () => {
  it('the batch body validates against the documented schema', () => {
    const s = (openApiDocument() as any).paths['/api/mcp'].post.responses['200'].content['application/json'].schema;
    expect(new (Ajv2020 as any)({ strict: false }).compile(s)(handleMcpHttp('POST', '[{"jsonrpc":"2.0","id":1,"method":"ping"}]').body)).toBe(true);
  });
});

describe('BUG-039 (N13): every API election id with a dashboard entry maps to its catalog slug', () => {
  it('registry ids and aliases resolve to catalog slugs', async () => {
    const { BUNDLED_ELECTIONS } = await import('../src/elections/registry.js'); const { API_ID_TO_SLUG, CATALOG } = await import('../lib/catalog.js');
    const slugs = new Set(CATALOG.map(c => c.slug));
    for (const e of BUNDLED_ELECTIONS) {
      const inUi = [e.id, ...e.aliases].find(x => slugs.has(x)); if (!inUi) continue; // burlington-2009 has no dashboard entry
      expect(API_ID_TO_SLUG[e.id]).toBe(inUi);
    }
  });
});
