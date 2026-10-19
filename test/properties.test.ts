import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { tabulateIrv, BallotGroup } from '../src/index.js';
const C = ['A', 'B', 'C', 'D'];
const ballotArb = fc.record({ count: fc.integer({ min: 1, max: 50 }), marks: fc.array(fc.oneof(
  fc.constantFrom(...C).map(name => ({ kind: 'candidate' as const, name })), fc.constant({ kind: 'skip' as const }), fc.constant({ kind: 'overvote' as const })), { minLength: 1, maxLength: 5 }) });
const rulesArb = fc.record({ overvote: fc.constantFrom('exhaust', 'skip' as const), skips: fc.constantFrom('continue', 'two-exhaust' as const), batch: fc.boolean(), tiebreak: fc.constantFrom('previous-round', 'lot' as const) });
const elect = fc.array(ballotArb, { minLength: 1, maxLength: 30 });
describe('engine invariants (property-based)', () => {
  it('conservation and monotone inactive in every round', () => fc.assert(fc.property(elect, rulesArb, (bs, rules) => {
    const r = tabulateIrv(bs as BallotGroup[], C, rules); const total = bs.reduce((s, b) => s + b.count, 0); let prev = 0;
    for (const rd of r.rounds) { const ina = Object.values(rd.inactive).reduce((a, b) => a + b, 0); expect(rd.continuing + ina).toBe(total); expect(ina).toBeGreaterThanOrEqual(prev); prev = ina; }
  })));
  it('ballot order never changes the result', () => fc.assert(fc.property(elect, rulesArb, (bs, rules) => {
    const a = tabulateIrv(bs as BallotGroup[], C, rules), b = tabulateIrv([...bs].reverse() as BallotGroup[], C, rules);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  })));
  it('scaling all counts by k scales every tally by k (winner unchanged)', () => fc.assert(fc.property(elect, rulesArb, fc.integer({ min: 2, max: 7 }), (bs, rules, k) => {
    const a = tabulateIrv(bs as BallotGroup[], C, rules), b = tabulateIrv(bs.map(x => ({ ...x, count: x.count * k })) as BallotGroup[], C, rules);
    expect(b.winner).toBe(a.winner); expect(b.rounds.length).toBe(a.rounds.length);
    b.rounds.forEach((rd, i) => { for (const c of Object.keys(rd.tallies)) expect(rd.tallies[c]).toBe(a.rounds[i].tallies[c] * k); });
  })));
  it('winner holds a majority of continuing ballots or is last standing / two-way leader', () => fc.assert(fc.property(elect, rulesArb, (bs, rules) => {
    const r = tabulateIrv(bs as BallotGroup[], C, rules); const last = r.rounds.at(-1)!; const n = Object.keys(last.tallies).length;
    expect(last.tallies[r.winner] >= last.threshold || n <= 2).toBe(true);
  })));
  it('determinism: same input, byte-identical output', () => fc.assert(fc.property(elect, rulesArb, (bs, rules) => {
    expect(JSON.stringify(tabulateIrv(bs as BallotGroup[], C, rules))).toBe(JSON.stringify(tabulateIrv(bs as BallotGroup[], C, rules)));
  })));
});
