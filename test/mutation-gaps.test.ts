// Tests for behaviour that Stryker showed was untested (audit/mutation/README.md).
import { describe, it, expect } from 'vitest';
import { Fraction, tabulateIrv, tabulateStv, BallotGroup, Mark } from '../src/index.js';
const c = (name: string): Mark => ({ kind: 'candidate', name });
const S: Mark = { kind: 'skip' }, O: Mark = { kind: 'overvote' };
const g = (count: number, ...marks: Mark[]): BallotGroup => ({ count, marks });

describe('Fraction normalisation and formatting', () => {
  it('rejects a zero denominator', () => { expect(() => new Fraction(1, 0)).toThrow(/zero denominator/); });
  it('moves the sign to the numerator and reduces negatives', () => {
    const a = new Fraction(1, -2); expect([a.n, a.d]).toEqual([-1n, 2n]);
    const b = new Fraction(-2, 4); expect([b.n, b.d]).toEqual([-1n, 2n]);
    const z = new Fraction(0, -5); expect([z.n, z.d]).toEqual([0n, 1n]);
  });
  it('cmp returns 0 for equal values written differently', () => { expect(new Fraction(2, 4).cmp(new Fraction(1, 2))).toBe(0); expect(new Fraction(1, 3).cmp(new Fraction(1, 2))).toBe(-1); });
  it('toFixed keeps the sign, and drops it when the value rounds to zero', () => {
    expect(new Fraction(-1, 3).toFixed(2)).toBe('-0.33'); expect(new Fraction(-1, 1000).toFixed(2)).toBe('0.00'); expect(new Fraction(7, 2).toFixed(0)).toBe('4');
  });
  it('isZero and toNumber', () => { expect(Fraction.ZERO.isZero()).toBe(true); expect(new Fraction(1, 4).isZero()).toBe(false); expect(new Fraction(1, 4).toNumber()).toBe(0.25); });
});

describe('IRV paths the parity fixtures never hit', () => {
  it('throws on an empty candidate list', () => { expect(() => tabulateIrv([], [])).toThrow('No candidates'); });
  it('a tied final two is not a win: lot order eliminates the later-declared candidate first', () => {
    const r = tabulateIrv([g(1, c('A')), g(1, c('B'))], ['A', 'B'], { tiebreak: 'lot' });
    expect(r.rounds.length).toBe(2); expect(r.rounds[0].eliminated).toEqual(['B']); expect(r.rounds[0].tieNote).toBe('lot'); expect(r.winner).toBe('A');
  });
  const tie = [g(5, c('A')), g(3, c('B')), g(4, c('C')), g(1, c('D'), c('B'))];
  it('previous-round tiebreak looks back one round', () => {
    const r = tabulateIrv(tie, ['A', 'B', 'C', 'D'], { tiebreak: 'previous-round' });
    expect(r.rounds[1].tallies).toEqual({ A: 5, B: 4, C: 4 }); expect(r.rounds[1].eliminated).toEqual(['B']); expect(r.rounds[1].tieNote).toBe('previous-round');
  });
  it('lot tiebreak ignores earlier rounds', () => {
    const r = tabulateIrv(tie, ['A', 'B', 'C', 'D'], { tiebreak: 'lot' });
    expect(r.rounds[1].eliminated).toEqual(['C']); expect(r.rounds[1].tieNote).toBe('lot');
  });
  it('previous-round falls back to lot when there is no earlier round', () => {
    const r = tabulateIrv([g(2, c('A')), g(1, c('B')), g(1, c('C'))], ['A', 'B', 'C'], { tiebreak: 'previous-round' });
    expect(r.rounds[0].eliminated).toEqual(['C']); expect(r.rounds[0].tieNote).toBe('lot');
  });
  it('batch elimination needs the bottom group to be strictly below the next candidate', () => {
    const r = tabulateIrv([g(10, c('A')), g(5, c('B')), g(3, c('C')), g(2, c('D'))], ['A', 'B', 'C', 'D'], { batch: true });
    expect(r.rounds[0].eliminated).toEqual(['D']);
  });
  it('labels each inactive reason', () => {
    const ballots = [g(1, S, S), g(1, O, c('A')), g(1, c('B'), S, S, c('C')), g(1, c('B'), S), g(1, c('B'))];
    const r = tabulateIrv([...ballots, g(4, c('A')), g(3, c('C'))], ['A', 'C', 'B'], { skips: 'two-exhaust', overvote: 'exhaust', tiebreak: 'lot' });
    const last = r.rounds[r.rounds.length - 1].inactive;
    expect(last).toEqual({ blank: 1, overvote: 1, skips: 1, undervote: 1, exhausted: 1 });
  });
});

describe('STV edges', () => {
  it('allows seats equal to the number of candidates', () => {
    expect(tabulateStv([g(2, c('A')), g(1, c('B'))], ['A', 'B'], 2).winners.sort()).toEqual(['A', 'B']);
    expect(() => tabulateStv([g(1, c('A'))], ['A'], 2)).toThrow(RangeError);
  });
  it('an overvote exhausts the paper instead of skipping to the next rank', () => {
    const r = tabulateStv([g(3, O, c('A')), g(2, c('B')), g(1, c('A'))], ['A', 'B'], 1);
    expect(r.rounds[0].tallies).toEqual({ A: '1.0000', B: '2.0000' }); expect(r.rounds[0].exhausted).toBe('3.0000');
  });
  it('equal tallies: the later-declared candidate is eliminated', () => {
    const r = tabulateStv([g(2, c('A')), g(1, c('B')), g(1, c('C'))], ['A', 'B', 'C'], 1);
    expect(r.rounds[0].eliminated).toEqual(['C']); expect(r.rounds[1].eliminated).toEqual(['B']); expect(r.winners).toEqual(['A']);
  });
});
