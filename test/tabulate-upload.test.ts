import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';
import { POST } from '../app/api/tabulate/route.js';

const T02 = 'count,rank1,rank2\n8,A,D\n6,B,C\n4,C,B\n3,D,C\n';

describe('POST /api/tabulate CSV and JSON ballots', () => {
  it('counts a CSV with rank columns and a count column', () => {
    const r = handleTabulate('POST', T02, { contentType: 'text/csv' }) as any;
    expect(r.status).toBe(200);
    expect(r.body.method).toBe('irv');
    expect(r.body.winner).toBe('C');
    expect(r.body.rounds[0].tallies).toEqual({ A: 8, B: 6, C: 4, D: 3 });
    expect(r.body.totalBallots).toBe(21);
  });

  it('counts headerless CSV and 1st/2nd Choice headers, including skips and overvotes', () => {
    const headerless = handleTabulate('POST', 'A,D\nA,D\nB\n', { contentType: 'text/csv' }) as any;
    expect(headerless.status).toBe(200);
    expect(headerless.body.rounds[0].tallies).toEqual({ A: 2, D: 0, B: 1 });
    const labeled = '1st Choice,2nd Choice\n"Smith, Jr.",Lee\novervote,Lee\n_,Lee\n';
    const r = handleTabulate('POST', labeled, { contentType: 'text/csv; charset=utf-8' }) as any;
    expect(r.status).toBe(200);
    expect(r.body.candidates).toEqual(['Smith, Jr.', 'Lee']);
    expect(r.body.rounds[0].tallies).toEqual({ 'Smith, Jr.': 1, Lee: 1 });
    expect(r.body.rounds[0].inactive.overvote).toBe(1);
  });

  it('auto-detects CSV when the body is not JSON', () => {
    const r = handleTabulate('POST', T02) as any;
    expect(r.status).toBe(200);
    expect(r.body.winner).toBe('C');
  });

  it('accepts a JSON array of ballots and { count, ranks } objects', () => {
    const asArrays = handleTabulate('POST', JSON.stringify([
      ['A', 'D'], ['A', 'D'], ['A', 'D'], ['A', 'D'], ['A', 'D'], ['A', 'D'], ['A', 'D'], ['A', 'D'],
      ['B', 'C'], ['B', 'C'], ['B', 'C'], ['B', 'C'], ['B', 'C'], ['B', 'C'],
      ['C', 'B'], ['C', 'B'], ['C', 'B'], ['C', 'B'],
      ['D', 'C'], ['D', 'C'], ['D', 'C'],
    ])) as any;
    expect(asArrays.status).toBe(200);
    expect(asArrays.body.winner).toBe('C');
    const grouped = handleTabulate('POST', JSON.stringify({
      ballots: [
        { count: 8, ranks: ['A', 'D'] },
        { count: 6, ranking: 'B>C' },
        { count: 4, ranks: ['C', 'B'] },
        { count: 3, ranks: ['D', 'C'] },
      ],
    })) as any;
    expect(grouped.status).toBe(200);
    expect(grouped.body.rounds[2].tallies).toEqual({ A: 8, C: 13 });
    expect(grouped.body.winner).toBe('C');
  });

  it('accepts a JSON csv field and still applies rules', () => {
    const r = handleTabulate('POST', JSON.stringify({
      csv: 'count,rank1,rank2\n5,A\n3,B,C\n3,C,B\n',
      rules: { lotOrder: ['A', 'B', 'C'] },
    })) as any;
    expect(r.status).toBe(200);
    expect(r.body.rounds[0].eliminated).toEqual(['C']);
    expect(r.body.winner).toBe('B');
  });

  it('JSON array with seats uses STV', () => {
    const r = handleTabulate('POST', JSON.stringify({
      ballots: [{ count: 3, ranks: ['A', 'B'] }, { count: 3, ranks: ['A', 'C'] }, { count: 2, ranks: ['B'] }, { count: 1, ranks: ['C'] }, { count: 4, ranks: ['D'] }],
      seats: 2,
    })) as any;
    expect(r.status).toBe(200);
    expect(r.body.method).toBe('stv');
    expect([...r.body.winners].sort()).toEqual(['A', 'D']);
  });

  it('400 on malformed JSON, malformed CSV, and the wrong ballots type', () => {
    expect(handleTabulate('POST', '{x', { contentType: 'application/json' }).body).toEqual({ error: 'Invalid JSON body' });
    expect(handleTabulate('POST', 'rank1,rank2\n"Alice,Bob\n', { contentType: 'text/csv' }).status).toBe(400);
    expect(handleTabulate('POST', 'rank1\n"Alice,Bob\n', { contentType: 'text/csv' }).body).toEqual({ error: 'Line 2: unterminated quoted field' });
    expect(handleTabulate('POST', JSON.stringify({ ballots: 12 })).status).toBe(400);
    expect(handleTabulate('POST', JSON.stringify({ ballots: 12 })).body).toEqual({ error: 'Field "ballots" must be a ranking string or an array of ballots' });
    expect(handleTabulate('POST', JSON.stringify({ ballots: '1,A', rules: { foo: 1 } })).body).toEqual({ error: 'Unknown rule key(s): foo' });
  });

  it('422 when the upload is readable but cannot be counted', () => {
    expect(handleTabulate('POST', 'rank1,rank2\n', { contentType: 'text/csv' })).toMatchObject({ status: 422, body: { error: 'No valid ballots to count' } });
    expect(handleTabulate('POST', 'count,rank1\n0,A\n', { contentType: 'text/csv' })).toMatchObject({ status: 422, body: { error: 'Row 2: count must be a positive integer' } });
    expect(handleTabulate('POST', JSON.stringify({ ballots: [] }))).toMatchObject({ status: 422, body: { error: 'No valid ballots to count' } });
    expect(handleTabulate('POST', JSON.stringify({ ballots: [{ count: -2, ranks: ['A'] }] }))).toMatchObject({ status: 422, body: { error: 'Ballot 1: count must be a positive integer' } });
    expect(handleTabulate('POST', JSON.stringify({ ballots: [{ ranks: ['Zed'] }], candidates: ['A', 'B'] }))).toMatchObject({ status: 422, body: { error: 'Ballot 1: unknown candidate "Zed"' } });
    expect(handleTabulate('POST', JSON.stringify({ csv: 'rank1\nZed\n', candidates: ['A'] }))).toMatchObject({ status: 422, body: { error: 'Row 2: unknown candidate "Zed"' } });
  });

  it('413 still applies to CSV bodies over 10 MB', () => {
    expect(handleTabulate('POST', 'a,b\n' + 'x'.repeat(10 * 1024 * 1024), { contentType: 'text/csv' }).status).toBe(413);
  });

  it('route accepts a CSV content type and a multipart file upload', async () => {
    const csv = await POST(new Request('http://localhost/api/tabulate', {
      method: 'POST', headers: { 'content-type': 'text/csv' }, body: T02,
    }));
    expect(csv.status).toBe(200);
    expect((await csv.json()).winner).toBe('C');

    const fd = new FormData();
    fd.set('file', new File([T02], 'ballots.csv', { type: 'text/csv' }));
    const uploaded = await POST(new Request('http://localhost/api/tabulate', { method: 'POST', body: fd }));
    expect(uploaded.status).toBe(200);
    expect((await uploaded.json()).winner).toBe('C');

    const missing = await POST(new Request('http://localhost/api/tabulate', { method: 'POST', body: new FormData() }));
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: 'Expected a file field named "file" or "ballots"' });
  });
});
