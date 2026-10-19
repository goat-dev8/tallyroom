import { describe, it, expect } from 'vitest';
import { parseBallots, tabulateIrv, Rules } from '../src/index.js';
const run = (text: string, rules: Partial<Rules> = {}, declared?: string[]) => { const { ballots, candidates } = parseBallots(text, declared); return tabulateIrv(ballots, candidates, rules); };
const T = (r: ReturnType<typeof run>, i: number) => r.rounds[i].tallies;

describe('single-winner IRV fixtures (hand-computed)', () => {
  it('T01 majority in round 1', () => {
    const r = run('6,A\n3,B\n1,C');
    expect(r.rounds.length).toBe(1); expect(r.winner).toBe('A'); expect(r.rounds[0].threshold).toBe(6); expect(T(r, 0).A).toBe(6);
  });
  it('T02 comeback over three rounds', () => {
    const r = run('8,A>D\n6,B>C\n4,C>B\n3,D>C');
    expect(T(r, 0)).toEqual({ A: 8, B: 6, C: 4, D: 3 }); expect(r.rounds[0].eliminated).toEqual(['D']);
    expect(T(r, 1)).toEqual({ A: 8, B: 6, C: 7 }); expect(r.rounds[1].eliminated).toEqual(['B']);
    expect(T(r, 2)).toEqual({ A: 8, C: 13 }); expect(r.winner).toBe('C'); expect(r.rounds[0].threshold).toBe(11);
  });
  it('T03 exhausted ballots counted', () => {
    const r = run('7,A\n6,B\n4,C>A\n3,D');
    expect(r.rounds[1].inactive.exhausted).toBe(3); expect(T(r, 1)).toEqual({ A: 7, B: 6, C: 4 }); expect(T(r, 2)).toEqual({ A: 11, B: 6 });
    expect(r.rounds[2].continuing).toBe(17);
  });
  it('T04 threshold uses continuing ballots, not total', () => {
    const r = run('6,A\n6,B\n5,C\n3,D>A');
    expect(T(r, 1)).toEqual({ A: 9, B: 6, C: 5 }); expect(T(r, 2)).toEqual({ A: 9, B: 6 });
    expect(r.rounds[2].threshold).toBe(8); expect(r.winner).toBe('A'); expect(r.rounds[2].inactive.exhausted).toBe(5);
  });
  it('T05 tie broken by previous round', () => {
    const r = run('10,A\n7,B\n6,C>A\n5,D>B\n1,E>D>B');
    expect(T(r, 1)).toEqual({ A: 10, B: 7, C: 6, D: 6 }); expect(r.rounds[1].eliminated).toEqual(['D']); expect(r.rounds[1].tieNote).toBe('previous-round');
    expect(T(r, 2)).toEqual({ A: 10, B: 13, C: 6 }); expect(T(r, 3)).toEqual({ A: 16, B: 13 }); expect(r.winner).toBe('A'); expect(r.rounds.length).toBe(4);
  });
  it('T06/T07 lot order decides a first-round tie and flips the winner', () => {
    const f = '5,A\n3,B>C\n3,C>B';
    const a = run(f, { lotOrder: ['A', 'B', 'C'] }); expect(a.rounds[0].eliminated).toEqual(['C']); expect(a.rounds[0].tieNote).toBe('lot'); expect(T(a, 1)).toEqual({ A: 5, B: 6 }); expect(a.winner).toBe('B');
    const b = run(f, { lotOrder: ['A', 'C', 'B'] }); expect(b.rounds[0].eliminated).toEqual(['B']); expect(T(b, 1)).toEqual({ A: 5, C: 6 }); expect(b.winner).toBe('C');
  });
  it('T08/T09 overvote exhaust vs skip flips the winner', () => {
    const f = '4,A\n4,B\n1,C>A\n2,C>[A=B]>B';
    const e = run(f, { overvote: 'exhaust' }); expect(T(e, 1)).toEqual({ A: 5, B: 4 }); expect(e.rounds[1].inactive.overvote).toBe(2); expect(e.winner).toBe('A');
    const s = run(f, { overvote: 'skip' }); expect(T(s, 1)).toEqual({ A: 5, B: 6 }); expect(s.rounds[1].inactive.overvote).toBe(0); expect(s.winner).toBe('B');
  });
  it('T10/T11 skipped ranks: continue vs two-consecutive exhaust', () => {
    const f = '4,A\n4,B\n1,C>_>A\n2,C>_>_>B';
    const c = run(f, { skips: 'continue' }); expect(T(c, 1)).toEqual({ A: 5, B: 6 }); expect(c.winner).toBe('B');
    const x = run(f, { skips: 'two-exhaust' }); expect(T(x, 1)).toEqual({ A: 5, B: 4 }); expect(x.rounds[1].inactive.skips).toBe(2); expect(x.winner).toBe('A');
  });
  it('T12 duplicate ranking is ignored, ballot continues', () => {
    const r = run('5,B\n4,C\n2,A>A>C');
    expect(T(r, 0)).toEqual({ B: 5, C: 4, A: 2 }); expect(T(r, 1)).toEqual({ B: 5, C: 6 }); expect(r.winner).toBe('C'); expect(r.rounds[1].inactive.exhausted).toBe(0);
  });
  it('T13 batch elimination changes the round count, not the winner', () => {
    const f = '45,A\n40,B\n9,C>A\n6,D>B';
    const on = run(f, { batch: true }); expect(on.rounds[0].eliminated.sort()).toEqual(['C', 'D']); expect(on.rounds.length).toBe(2); expect(T(on, 1)).toEqual({ A: 54, B: 46 });
    const off = run(f, { batch: false }); expect(off.rounds.length).toBe(3); expect(T(off, 1)).toEqual({ A: 45, B: 46, C: 9 }); expect(T(off, 2)).toEqual({ A: 54, B: 46 });
    expect(on.winner).toBe('A'); expect(off.winner).toBe('A');
  });
  it('T14 scale invariance ×1000', () => {
    const r = run('8000,A>D\n6000,B>C\n4000,C>B\n3000,D>C');
    expect(T(r, 0)).toEqual({ A: 8000, B: 6000, C: 4000, D: 3000 }); expect(T(r, 2)).toEqual({ A: 8000, C: 13000 });
  });
  it('T15 uncontested race', () => { const r = run('5,A'); expect(r.rounds.length).toBe(1); expect(r.winner).toBe('A'); expect(r.rounds[0].continuing).toBe(5); });
  it('T16 conservation: continuing + inactive = total every round, inactive never decreases', () => {
    const r = run('6,A\n6,B\n5,C\n3,D>A');
    let prev = 0;
    for (const rd of r.rounds) { const inact = Object.values(rd.inactive).reduce((a, b) => a + b, 0); expect(rd.continuing + inact).toBe(20); expect(inact).toBeGreaterThanOrEqual(prev); prev = inact; }
    expect(r.rounds[2].continuing).toBe(15);
  });
  it('blank ballots are inactive from round 1', () => {
    const r = run('3,A\n2,B\n1,_>_', { skips: 'two-exhaust' }); expect(r.rounds[0].inactive.blank).toBe(1); expect(r.rounds[0].continuing).toBe(5);
  });
  it('rejects a lotOrder missing a candidate', () => {
    expect(() => run('1,A\n1,B', { lotOrder: ['A'] })).toThrow('lotOrder is missing candidate "B"');
  });
});
