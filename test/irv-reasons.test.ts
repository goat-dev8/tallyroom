import { describe, it, expect } from 'vitest';
import { parseBallots, tabulateIrv } from '../src/index.js';
describe('inactive reasons and duplicate conventions', () => {
  it('every-rank-marked ballot is "exhausted"; one blank rank makes it "undervote"', () => {
    const { ballots } = parseBallots('5,A\n4,B\n1,C>C>C\n1,C>_>C');
    const r = tabulateIrv(ballots, ['A', 'B', 'C']);
    expect(r.rounds[1].inactive.exhausted).toBe(1); expect(r.rounds[1].inactive.undervote).toBe(1); expect(r.rounds[1].tallies).toEqual({ A: 5, B: 4 });
  });
  it('duplicates=skip: A>A>_>B exhausts under two-skip; duplicates=ignore continues to B', () => {
    const f = '3,X\n2,Y\n1,A>A>_>Y';
    const sk = tabulateIrv(parseBallots(f).ballots, ['X', 'Y', 'A'], { skips: 'two-exhaust', duplicates: 'skip' });
    const ig = tabulateIrv(parseBallots(f).ballots, ['X', 'Y', 'A'], { skips: 'two-exhaust', duplicates: 'ignore' });
    expect(sk.rounds[1].tallies).toEqual({ X: 3, Y: 2 }); expect(sk.rounds[1].inactive.skips).toBe(1);
    expect(ig.rounds[1].tallies).toEqual({ X: 3, Y: 3 });
  });
  it('non-continuing (excluded) write-in is passed over without counting as a skip', () => {
    const r = tabulateIrv(parseBallots('3,X\n2,Y\n1,Write-in>_>Y').ballots, ['X', 'Y'], { skips: 'two-exhaust' });
    expect(r.rounds[0].tallies).toEqual({ X: 3, Y: 3 }); expect(r.rounds[0].inactive.skips).toBe(0);
    const r2 = tabulateIrv(parseBallots('3,X\n2,Y\n1,Write-in>_>_>Y').ballots, ['X', 'Y'], { skips: 'two-exhaust' });
    expect(r2.rounds[0].tallies).toEqual({ X: 3, Y: 2 }); expect(r2.rounds[0].inactive.skips).toBe(1);
  });
});
