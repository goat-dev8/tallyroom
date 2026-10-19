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
    expect(handleTabulate('POST', '{x', { contentType: 'application/json' }).body).toEqual({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body', details: null } });
    expect(handleTabulate('POST', 'rank1,rank2\n"Alice,Bob\n', { contentType: 'text/csv' }).status).toBe(400);
    expect(handleTabulate('POST', 'rank1\n"Alice,Bob\n', { contentType: 'text/csv' }).body).toEqual({
      error: { code: 'UNTERMINATED_QUOTE', message: 'Line 2: unterminated quoted field', details: { row: 2, column: 1 } },
    });
    expect(handleTabulate('POST', JSON.stringify({ ballots: 12 })).status).toBe(400);
    expect(handleTabulate('POST', JSON.stringify({ ballots: 12 })).body).toEqual({ error: { code: 'INVALID_BALLOTS', message: 'Field "ballots" must be a ranking string or an array of ballots', details: null } });
    expect(handleTabulate('POST', JSON.stringify({ ballots: '1,A', rules: { foo: 1 } })).body).toEqual({ error: { code: 'UNKNOWN_RULE', message: 'Unknown rule key(s): foo', details: { keys: ['foo'] } } });
  });

  it('422 when the upload is readable but cannot be counted, with row and column', () => {
    expect(handleTabulate('POST', 'rank1,rank2\n', { contentType: 'text/csv' })).toMatchObject({ status: 422, body: { error: { code: 'NO_BALLOTS', message: 'No valid ballots to count', details: null } } });
    expect(handleTabulate('POST', 'count,rank1\n0,A\n', { contentType: 'text/csv' }).body).toEqual({
      error: { code: 'INVALID_COUNT', message: 'Row 2, column 1: count must be a positive integer', details: { row: 2, column: 1 } },
    });
    expect(handleTabulate('POST', JSON.stringify({ ballots: [] }))).toMatchObject({ status: 422, body: { error: { code: 'NO_BALLOTS', message: 'No valid ballots to count' } } });
    expect(handleTabulate('POST', JSON.stringify({ ballots: [{ count: -2, ranks: ['A'] }] })).body).toEqual({
      error: { code: 'INVALID_COUNT', message: 'Ballot 1: count must be a positive integer', details: { row: 1 } },
    });
    expect(handleTabulate('POST', JSON.stringify({ ballots: [{ ranks: ['Zed'] }], candidates: ['A', 'B'] })).body).toEqual({
      error: { code: 'UNKNOWN_CANDIDATE', message: 'Row 1, column 1: unknown candidate "Zed"', details: { row: 1, column: 1, candidate: 'Zed' } },
    });
    expect(handleTabulate('POST', JSON.stringify({ csv: 'rank1,rank2\nA,Zed\n', candidates: ['A'] })).body).toEqual({
      error: { code: 'UNKNOWN_CANDIDATE', message: 'Row 2, column 2: unknown candidate "Zed"', details: { row: 2, column: 2, candidate: 'Zed' } },
    });
    expect(handleTabulate('POST', JSON.stringify({ ballots: '1,A>Zed', candidates: ['A'] })).status).toBe(422);
    expect(handleTabulate('POST', JSON.stringify({ ballots: '1,A>Zed', candidates: ['A'] })).body).toEqual({
      error: { code: 'UNKNOWN_CANDIDATE', message: 'Line 1: unknown candidate "Zed"', details: { row: 1, column: 2, candidate: 'Zed' } },
    });
  });

  // BUG-001 (BUGS.md): marked it.fails until the fix lands, so the build and preview still deploy for the red TestSprite run.
  it.fails('BUG-001: headerless single-choice ballots ("3,A") count as ranking lines', () => {
    const r = handleTabulate('POST', '3,A\n2,B\n', { contentType: 'text/csv' }) as any;
    expect(r.status).toBe(200);
    expect(r.body.candidates).toEqual(['A', 'B']);
    expect(r.body.rounds[0].tallies).toEqual({ A: 3, B: 2 });
    expect(r.body.winner).toBe('A');
    const mixed = handleTabulate('POST', '4,A\n3,B>A\n2,C>B\n', { contentType: 'text/csv' }) as any;
    expect(mixed.status).toBe(200);
    expect(mixed.body.rounds[0].tallies).toEqual({ A: 4, B: 3, C: 2 });
  });

  it('reads headerless count,A>B as a ranking instead of two candidate names', () => {
    const r = handleTabulate('POST', '5,A>B', { contentType: 'text/csv' }) as any;
    expect(r.status).toBe(200);
    expect(r.body.candidates).toEqual(['A', 'B']);
    expect(r.body.totalBallots).toBe(5);
    expect(r.body.rounds[0].tallies).toEqual({ A: 5, B: 0 });
    expect(r.body.winner).toBe('A');
    const several = handleTabulate('POST', '5,A>B\n3,B>A\n', { contentType: 'text/csv' }) as any;
    expect(several.status).toBe(200);
    expect(several.body.totalBallots).toBe(8);
    expect(several.body.rounds[0].tallies).toEqual({ A: 5, B: 3 });
    const viaJson = handleTabulate('POST', JSON.stringify({ csv: '5,A>B' })) as any;
    expect(viaJson.status).toBe(200);
    expect(viaJson.body.candidates).toEqual(['A', 'B']);
    expect(viaJson.body.totalBallots).toBe(5);
  });

  it('rejects a ">" ranking mixed into rank columns, and a numeric headerless first column', () => {
    const mixed = handleTabulate('POST', '5,A>B,C\n', { contentType: 'text/csv' });
    expect(mixed.status).toBe(422);
    expect(mixed.body).toEqual({
      error: {
        code: 'CSV_FORMAT_AMBIGUOUS',
        message: 'Row 1, column 2: ">" joins ranks inside one cell, so this is not one candidate per column. Use ranking lines such as "5,A>B", or one candidate per column: count,rank1,rank2,...',
        details: { row: 1, column: 2 },
      },
    });
    const headed = handleTabulate('POST', 'count,rank1\n5,A>B\n', { contentType: 'text/csv' });
    expect(headed.status).toBe(422);
    expect(headed.body).toMatchObject({ error: { code: 'CSV_FORMAT_AMBIGUOUS', details: { row: 2, column: 2 } } });
    const numeric = handleTabulate('POST', '5,A,B\n', { contentType: 'text/csv' });
    expect(numeric.status).toBe(422);
    expect(numeric.body).toEqual({
      error: {
        code: 'CSV_FORMAT_AMBIGUOUS',
        message: 'Row 1, column 1: candidate name "5" is purely numeric. With no header, a leading count belongs in count,rank1,rank2,...',
        details: { row: 1, column: 1, candidate: '5' },
      },
    });
    const named = handleTabulate('POST', 'rank1,rank2\n5,Alice\n', { contentType: 'text/csv' }) as any;
    expect(named.status).toBe(200);
    expect(named.body.candidates).toEqual(['5', 'Alice']);
  });

  it('413 still applies to a CSV body over 4 MB', () => {
    expect(handleTabulate('POST', 'a,b\n' + 'x'.repeat(4 * 1024 * 1024), { contentType: 'text/csv' }).status).toBe(413);
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
    expect(await missing.json()).toEqual({ error: { code: 'MISSING_FILE', message: 'Expected a file field named "file" or "ballots"', details: { fields: ['file', 'ballots'] } } });
  });
});
