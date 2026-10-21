import { describe, it, expect } from 'vitest';
import { tabulateStv } from '../src/stv.js';
import type { BallotGroup } from '../src/types.js';

const b = (count: number, ...names: string[]): BallotGroup => ({ count, marks: names.map((name) => ({ kind: 'candidate' as const, name })) });
describe('STV transferDecimals (Scottish rule 48(3))', () => {
  // 10 ballots, 2 seats: quota floor(10/3)+1 = 4. A has 7, surplus 3, transfer value 3/7 = 0.428571…
  const ballots = [b(7, 'A', 'B'), b(2, 'C'), b(1, 'B')];
  it('exact by default', () => {
    const r = tabulateStv(ballots, ['A', 'B', 'C'], 2);
    expect(r.rounds[1].exact.tallies.B).toBe('4/1'); // 1 + 7 × 3/7
  });
  it('cuts each transferred paper value to the given places, remainder ignored', () => {
    // value cut to 0.42857 per paper: B gets 1 + 7 × 0.42857 = 3.99999; the 0.00001 left over goes nowhere
    const r = tabulateStv(ballots, ['A', 'B', 'C'], 2, 'droop', { transferDecimals: 5 });
    expect(r.rounds[1].exact.tallies.B).toBe('399999/100000');
  });
  it('rejects a bad setting', () => {
    expect(() => tabulateStv(ballots, ['A', 'B', 'C'], 2, 'droop', { transferDecimals: 1.5 })).toThrow(RangeError);
  });
});
