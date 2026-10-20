import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';
import { parsePatternTsv } from '../src/parse.js';
import { tabulateIrv } from '../src/irv.js';

// BUG-014..017, found by an independent read-only review. Each test is the reviewer's repro, checked by hand.
const post = (o: unknown) => handleTabulate('POST', JSON.stringify(o), { contentType: 'application/json' }) as { status: number; body: any };

describe('BUG-014: multi-seat STV applies the tie-break rules', () => {
  it('previous-round: B and C tie at 5 in round 2; C had fewer in round 1, so C is eliminated', () => {
    const r = post({ seats: 2, ballots: '8,A>C\n5,B\n3,C', candidates: ['A', 'C', 'B'] });
    expect(r.status).toBe(200);
    expect(r.body.rounds[1].eliminated).toEqual(['C']);
    expect(r.body.winners).toEqual(['A', 'B']);
  });
  it('lot: the candidate last in lotOrder is eliminated', () => {
    const r = post({ seats: 2, ballots: '1,A\n1,B\n1,C', rules: { tiebreak: 'lot', lotOrder: ['C', 'B', 'A'] } });
    expect(r.body.rounds[0].eliminated).toEqual(['A']);
    expect([...r.body.winners].sort()).toEqual(['B', 'C']);
  });
});

describe('BUG-015: a repeated (ignored) candidate is a marked rank, so it breaks a run of skips', () => {
  it('A>_>A>_>B reaches B under two-exhaust', () => {
    const r = post({ ballots: '4,C\n3,B\n2,A>_>A>_>B', rules: { skips: 'two-exhaust', duplicates: 'ignore' } });
    expect(r.body.rounds[1].tallies).toEqual({ B: 5, C: 4 });
    expect(r.body.winner).toBe('B');
  });
});

describe('BUG-016: a bare CR ends a record in ranking text', () => {
  it('"1,B\\r5,A\\r" is two ballot lines', () => {
    const r = post({ ballots: '1,B\r5,A\r' });
    expect(r.body.totalBallots).toBe(6);
    expect(r.body.winner).toBe('A');
  });
});

describe('BUG-017: pattern TSV with CRLF line endings', () => {
  it('drops the CR instead of gluing it to the last name', () => {
    const r = tabulateIrv(parsePatternTsv('3\tB\r\n2\tA\r\n'), ['A', 'B']);
    expect(r.rounds[0].tallies).toEqual({ A: 2, B: 3 });
    expect(r.winner).toBe('B');
  });
});

describe('review item 5 (same root cause as BUG-013)', () => {
  it('an NFD name in both candidates and ballots is counted', () => {
    const r = post({ ballots: '3,Jose\u0301\n1,B', candidates: ['Jose\u0301', 'B'] });
    expect(r.status).toBe(200); expect(r.body.winner).toBe('Jos\u00e9');
  });
});

describe('BUG-018: lotOrder names are NFC-normalised (found by the extended differential fuzz)', () => {
  it('an NFD name in lotOrder matches the same name on the ballots', () => {
    const r = post({ ballots: '1,Jose\u0301\n1,B', rules: { tiebreak: 'lot', lotOrder: ['Jose\u0301', 'B'] } });
    expect(r.status).toBe(200); expect(r.body.winner).toBe('Jos\u00e9');
  });
});
