import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { tabulateStv, BallotGroup, Fraction } from '../src/index.js';

// Property-based invariants for multi-seat STV (weighted inclusive Gregory, exact rationals).
// Tallies are reported at 4 dp, so sums are compared within the rounding bound of the reported values.
const C = ['A', 'B', 'C', 'D', 'E'];
const ballotArb = fc.record({
  count: fc.integer({ min: 1, max: 40 }),
  marks: fc.array(fc.oneof(
    { weight: 6, arbitrary: fc.constantFrom(...C).map(name => ({ kind: 'candidate' as const, name })) },
    { weight: 1, arbitrary: fc.constant({ kind: 'skip' as const }) },
    { weight: 1, arbitrary: fc.constant({ kind: 'overvote' as const }) }), { minLength: 1, maxLength: 5 }),
});
const elect = fc.array(ballotArb, { minLength: 1, maxLength: 25 });
const seatsArb = fc.integer({ min: 1, max: 4 });
const quotaArb = fc.constantFrom('droop' as const, 'hare' as const);
const num = (s: string) => Number(s);
const total = (bs: BallotGroup[]) => bs.reduce((s, b) => s + b.count, 0);

describe('STV invariants (property-based)', () => {
  it('fills exactly `seats` distinct seats from the candidate list', () => fc.assert(fc.property(elect, seatsArb, quotaArb, (bs, seats, q) => {
    const r = tabulateStv(bs as BallotGroup[], C, seats, q);
    expect(r.winners).toHaveLength(seats);
    expect(new Set(r.winners).size).toBe(seats);
    for (const w of r.winners) expect(C).toContain(w);
  })));

  it('Droop quota is floor(valid/(seats+1))+1 and Hare is valid/seats', () => fc.assert(fc.property(elect, seatsArb, (bs, seats) => {
    const n = total(bs as BallotGroup[]);
    expect(tabulateStv(bs as BallotGroup[], C, seats, 'droop').quota).toBe(`${Math.floor(n / (seats + 1)) + 1}.0000`);
    expect(num(tabulateStv(bs as BallotGroup[], C, seats, 'hare').quota)).toBeCloseTo(n / seats, 4);
  })));

  it('conservation: hopeful tallies + exhausted + quota kept by earlier winners = total ballots', () => fc.assert(fc.property(elect, seatsArb, quotaArb, (bs, seats, q) => {
    const r = tabulateStv(bs as BallotGroup[], C, seats, q); const n = total(bs as BallotGroup[]); let keptBy = 0;
    for (const rd of r.rounds) {
      const vals = Object.values(rd.tallies).map(num);
      const sum = vals.reduce((a, b) => a + b, 0) + num(rd.exhausted) + keptBy * num(r.quota);
      // each reported value is rounded to 4 dp: error at most 0.00005 per term
      expect(Math.abs(sum - n)).toBeLessThanOrEqual(0.00005 * (vals.length + 2 + keptBy) + 1e-9);
      keptBy += rd.elected.filter(c => Object.prototype.hasOwnProperty.call(rd.tallies, c) && num(rd.tallies[c]) >= num(r.quota) - 1e-9).length;
    }
  })));

  it('exhausted value never decreases from one round to the next', () => fc.assert(fc.property(elect, seatsArb, quotaArb, (bs, seats, q) => {
    const r = tabulateStv(bs as BallotGroup[], C, seats, q); let prev = 0;
    for (const rd of r.rounds) { expect(num(rd.exhausted)).toBeGreaterThanOrEqual(prev - 1e-9); prev = num(rd.exhausted); }
  })));

  it('a candidate elected on quota reached the quota in that round', () => fc.assert(fc.property(elect, seatsArb, quotaArb, (bs, seats, q) => {
    const r = tabulateStv(bs as BallotGroup[], C, seats, q);
    for (const rd of r.rounds) if (rd.eliminated.length) expect(rd.elected).toEqual([]);
    const last = r.rounds.at(-1)!;
    for (const rd of r.rounds) if (rd !== last) for (const c of rd.elected) expect(num(rd.tallies[c])).toBeGreaterThanOrEqual(num(r.quota) - 1e-9);
  })));

  it('the eliminated candidate has the lowest tally of that round', () => fc.assert(fc.property(elect, seatsArb, quotaArb, (bs, seats, q) => {
    for (const rd of tabulateStv(bs as BallotGroup[], C, seats, q).rounds) for (const e of rd.eliminated) {
      const min = Math.min(...Object.values(rd.tallies).map(num)); expect(num(rd.tallies[e])).toBe(min);
    }
  })));

  it('a candidate with a Droop quota of first preferences always wins a seat', () => fc.assert(fc.property(elect, seatsArb, (bs, seats) => {
    const r = tabulateStv(bs as BallotGroup[], C, seats, 'droop');
    for (const [c, v] of Object.entries(r.rounds[0].tallies)) if (num(v) >= num(r.quota)) expect(r.winners).toContain(c);
  })));

  it('ballot order never changes the result (byte-identical)', () => fc.assert(fc.property(elect, seatsArb, quotaArb, (bs, seats, q) => {
    expect(JSON.stringify(tabulateStv([...bs].reverse() as BallotGroup[], C, seats, q))).toBe(JSON.stringify(tabulateStv(bs as BallotGroup[], C, seats, q)));
  })));

  it('splitting a ballot group into two groups gives the same result', () => fc.assert(fc.property(elect.filter(b => b[0].count > 1), seatsArb, quotaArb, (bs, seats, q) => {
    const [h, ...rest] = bs; const k = Math.floor(h.count / 2);
    const split = [{ ...h, count: k }, { ...h, count: h.count - k }, ...rest];
    expect(JSON.stringify(tabulateStv(split as BallotGroup[], C, seats, q))).toBe(JSON.stringify(tabulateStv(bs as BallotGroup[], C, seats, q)));
  })));

  it('scaling every count by k scales the Hare quota and every tally by k (same winners)', () => fc.assert(fc.property(elect, seatsArb, fc.integer({ min: 2, max: 5 }), (bs, seats, k) => {
    const a = tabulateStv(bs as BallotGroup[], C, seats, 'hare'), b = tabulateStv(bs.map(x => ({ ...x, count: x.count * k })) as BallotGroup[], C, seats, 'hare');
    expect(b.winners).toEqual(a.winners); expect(b.rounds.length).toBe(a.rounds.length);
    b.rounds.forEach((rd, i) => { for (const c of Object.keys(rd.tallies)) expect(num(rd.tallies[c])).toBeCloseTo(num(a.rounds[i].tallies[c]) * k, 3); });
  })));
});

const frac = (s: string) => { const [n, d] = s.split('/'); return new Fraction(BigInt(n), BigInt(d)); };
describe('STV exact surplus conservation (no rounding)', () => {
  it('every round: Σ hopeful + exhausted + quota × seats already filled = ballots, exactly', () => fc.assert(fc.property(elect, seatsArb, quotaArb, (bs, seats, q) => {
    const r = tabulateStv(bs as BallotGroup[], C, seats, q); const n = Fraction.of(total(bs as BallotGroup[])); const quota = frac(r.quotaExact); let filled = 0;
    for (const rd of r.rounds) {
      let sum = frac(rd.exact.exhausted).add(quota.mul(Fraction.of(filled)));
      for (const v of Object.values(rd.exact.tallies)) sum = sum.add(frac(v));
      expect(sum.cmp(n)).toBe(0);
      filled += rd.elected.length;
    }
  }), { numRuns: 300 }));
  it('display values are the exact values rounded to 4 dp', () => fc.assert(fc.property(elect, seatsArb, quotaArb, (bs, seats, q) => {
    const r = tabulateStv(bs as BallotGroup[], C, seats, q); expect(frac(r.quotaExact).toFixed(4)).toBe(r.quota);
    for (const rd of r.rounds) { expect(frac(rd.exact.exhausted).toFixed(4)).toBe(rd.exhausted); for (const [c, v] of Object.entries(rd.exact.tallies)) expect(frac(v).toFixed(4)).toBe(rd.tallies[c]); }
  })));
  it('surplus transfer: an elected candidate passes on exactly (tally − quota)', () => {
    // A: 9 first preferences, quota (Droop, 2 seats, 15 ballots) = 6, surplus 3 → B gets 9 × 3/9 = 3 exactly.
    const r = tabulateStv([{ count: 9, marks: [{ kind: 'candidate', name: 'A' }, { kind: 'candidate', name: 'B' }] }, { count: 2, marks: [{ kind: 'candidate', name: 'B' }] }, { count: 4, marks: [{ kind: 'candidate', name: 'C' }] }], ['A', 'B', 'C'], 2);
    expect(r.quotaExact).toBe('6/1'); expect(r.rounds[0].elected).toEqual(['A']);
    expect(r.rounds[1].exact.tallies).toEqual({ B: '5/1', C: '4/1' });
  });
});

describe('STV deterministic ties', () => {
  it('a tie for last (after A is elected on quota) eliminates the candidate listed later, every time', () => {
    const bs: BallotGroup[] = [{ count: 5, marks: [{ kind: 'candidate', name: 'A' }] }, { count: 2, marks: [{ kind: 'candidate', name: 'B' }] }, { count: 2, marks: [{ kind: 'candidate', name: 'C' }] }, { count: 3, marks: [{ kind: 'candidate', name: 'D' }] }];
    for (let i = 0; i < 5; i++) expect(tabulateStv(bs, ['A', 'B', 'C', 'D'], 2).rounds[1].eliminated).toEqual(['C']);
    expect(tabulateStv(bs, ['A', 'C', 'B', 'D'], 2).rounds[1].eliminated).toEqual(['B']);
  });
  it('with all-equal tallies the eliminated candidate is always the last-listed hopeful', () => fc.assert(fc.property(fc.integer({ min: 1, max: 20 }), fc.shuffledSubarray(C, { minLength: 3, maxLength: 5 }), (k, order) => {
    const bs = order.map(name => ({ count: k, marks: [{ kind: 'candidate' as const, name }] }));
    const r = tabulateStv(bs, order, 1); if (r.rounds[0].eliminated.length) expect(r.rounds[0].eliminated).toEqual([order.at(-1)]);
  })));
});
