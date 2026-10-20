// Regression guards for BUG-002..004 (audit/defects.md), found by probing POST /api/tabulate with edge-case input.
import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';

const csv = (body: string) => handleTabulate('POST', body);
const json = (body: unknown) => handleTabulate('POST', JSON.stringify(body));
const ok = (r: ReturnType<typeof handleTabulate>) => { expect(r.status).toBe(200); return r.body as any; };
const err = (r: ReturnType<typeof handleTabulate>) => (r.body as any).error;

describe('BUG-002: count,ranking header line', () => {
  it('is skipped, not counted as a ballot for candidates "count" and "ranking"', () => {
    const j = ok(csv('count,ranking\n3,A\n2,B\n'));
    expect(j.candidates).toEqual(['A', 'B']);
    expect(j.totalBallots).toBe(5);
    expect(j.rounds[0].tallies).toEqual({ A: 3, B: 2 });
  });
  it('accepts CRLF, BOM and multi-rank rows after the header', () => {
    const j = ok(csv('\uFEFFCount,Ranking\r\n4,A\r\n3,B>A\r\n2,C>B\r\n'));
    expect(j.winner).toBe('B');
  });
  it('a header with no ballots is NO_BALLOTS, not a 1-ballot election', () => {
    const r = csv('count,ranking\n');
    expect(r.status).toBe(422);
    expect(err(r).code).toBe('NO_BALLOTS');
  });
});

describe('BUG-003: candidate names that are Object.prototype keys', () => {
  for (const name of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    it(`"${name}" keeps its votes`, () => {
      const j = ok(csv(`3,${name}\n2,B\n`));
      expect(j.rounds[0].tallies[name]).toBe(3);
      expect(j.winner).toBe(name);
      expect(JSON.parse(JSON.stringify(j)).rounds[0].tallies[name]).toBe(3);
    });
  }
  it('also through JSON ranks', () => {
    const j = ok(json({ ballots: [{ count: 3, ranks: ['__proto__'] }, { count: 2, ranks: ['B'] }] }));
    expect(j.winner).toBe('__proto__');
  });
});

describe('BUG-004: counts beyond exact integer range', () => {
  it('CSV count above 2^53 is rejected, not silently rounded', () => {
    const r = csv('99999999999999999999,A\n1,B\n');
    expect(r.status).toBe(422);
    expect(err(r).code).toBe('INVALID_COUNT');
  });
  it('JSON count 1e308 is rejected as INVALID_COUNT', () => {
    const r = json({ ballots: [{ count: 1e308, ranks: ['A'] }, { count: 1, ranks: ['B'] }] });
    expect(r.status).toBe(422);
    expect(err(r).code).toBe('INVALID_COUNT');
  });
  it('a total above 2^53 is rejected even when each count is safe', () => {
    const big = Number.MAX_SAFE_INTEGER - 1;
    const r = json({ ballots: [{ count: big, ranks: ['A'] }, { count: big, ranks: ['B'] }] });
    expect(r.status).toBe(422);
    expect(err(r).code).toBe('INVALID_COUNT');
  });
  it('the largest safe count still counts exactly', () => {
    const j = ok(json({ ballots: [{ count: Number.MAX_SAFE_INTEGER - 1, ranks: ['A'] }, { count: 1, ranks: ['B'] }] }));
    expect(j.totalBallots).toBe(Number.MAX_SAFE_INTEGER);
  });
});
