import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';
describe('POST /api/tabulate contract', () => {
  it('counts T02 and echoes rules with defaults', () => {
    const r = handleTabulate('POST', JSON.stringify({ ballots: '8,A>D\n6,B>C\n4,C>B\n3,D>C' })) as any;
    expect(r.status).toBe(200); expect(r.body.winner).toBe('C'); expect(r.body.rounds).toHaveLength(3);
    expect(r.body.rules).toEqual({ overvote: 'exhaust', skips: 'continue', batch: false, tiebreak: 'previous-round' }); expect(r.body.engineVersion).toBe('0.1.0');
  });
  it('405 with Allow header on GET', () => { const r = handleTabulate('GET', ''); expect(r.status).toBe(405); expect(r.headers).toEqual({ Allow: 'POST' }); });
  it('400 on bad JSON, unknown rule key, parse error', () => {
    expect(handleTabulate('POST', '{x').body).toEqual({ error: 'Invalid JSON body' });
    expect(handleTabulate('POST', JSON.stringify({ ballots: '1,A', rules: { foo: 1 } })).body).toEqual({ error: 'Unknown rule key(s): foo' });
    expect(handleTabulate('POST', JSON.stringify({ ballots: 'x,A' })).body).toEqual({ error: 'Line 1: count must be a positive integer' });
  });
  it('STV path and seats validation', () => {
    const ok = handleTabulate('POST', JSON.stringify({ ballots: '3,A>B\n3,A>C\n2,B\n1,C\n4,D', seats: 2 })) as any;
    expect(ok.status).toBe(200); expect([...ok.body.winners].sort()).toEqual(['A', 'D']);
    expect(handleTabulate('POST', JSON.stringify({ ballots: '1,A\n1,B', seats: 3 })).body).toEqual({ error: 'Seats must be between 1 and 2' });
  });
  it('413 above 10 MB', () => { expect(handleTabulate('POST', 'x'.repeat(10 * 1024 * 1024 + 1)).status).toBe(413); });
});
