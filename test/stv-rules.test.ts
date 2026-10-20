import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';

// BUG-019: multi-seat STV accepted overvote, skips and duplicates rules and silently ignored them.
const post = (o: unknown) => handleTabulate('POST', JSON.stringify(o), { contentType: 'application/json' }) as { status: number; body: any };

describe('BUG-019: STV applies the ballot-reading rules', () => {
  it('skips two-exhaust: _>_>A is inactive, so A gets nothing', () => {
    const r = post({ seats: 2, ballots: '3,_>_>A\n2,B\n2,C', rules: { skips: 'two-exhaust' } });
    expect(r.status).toBe(200);
    expect(r.body.rounds[0].tallies).toEqual({ A: '0.0000', B: '2.0000', C: '2.0000' });
    expect(r.body.rounds[0].exhausted).toBe('3.0000');
    expect(r.body.winners).toEqual(['B', 'C']);
  });
  it('overvote skip: [A=B]>C counts for C', () => {
    const r = post({ seats: 2, ballots: '3,[A=B]>C\n2,A\n2,B', rules: { overvote: 'skip' } });
    expect(r.body.rounds[0].tallies.C).toBe('3.0000');
    expect(r.body.rounds[0].elected).toEqual(['C']);
  });
  it('duplicates skip + two-exhaust: A>A>_>B goes inactive when A is out', () => {
    const r = post({ seats: 2, ballots: '1,A>A>_>B\n3,B\n3,C\n2,D', rules: { skips: 'two-exhaust', duplicates: 'skip' } });
    expect(r.body.rounds[1].tallies.B).toBe('3.0000');
    expect(r.body.rounds[1].exhausted).toBe('1.0000');
  });
  it('defaults are unchanged: overvotes exhaust, blanks are passed over', () => {
    const r = post({ seats: 2, ballots: '3,[A=B]>C\n2,_>A\n2,B' });
    expect(r.body.rounds[0].tallies).toEqual({ C: '0.0000', A: '2.0000', B: '2.0000' });
    expect(r.body.rounds[0].exhausted).toBe('3.0000');
  });
  it('batch elimination is IRV-only and is refused for STV instead of being ignored', () => {
    const r = post({ seats: 2, ballots: '3,A\n2,B\n1,C', rules: { batch: true } });
    expect(r.status).toBe(422); expect(r.body.error.code).toBe('INVALID_BATCH');
  });
});
