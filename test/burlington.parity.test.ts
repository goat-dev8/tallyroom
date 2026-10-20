import { describe, it, expect } from 'vitest';
import { tabulateIrv } from '../src/index.js';
import { BURLINGTON_2009_MAYOR as E } from '../src/elections/burlington-2009-mayor.js';
const inactive = (x: Record<string, number>) => Object.values(x).reduce((a, b) => a + b, 0);
describe('Burlington 2009 mayor — certified parity (ChoicePlus round detail)', () => {
  const r = tabulateIrv(E.load(), E.candidates, E.rules);
  it('every round matches the certified tallies, exhausted pile and eliminations', () => {
    expect(r.totalBallots).toBe(E.certified.totalBallots); expect(r.rounds.length).toBe(3); expect(r.winner).toBe(E.certified.winner);
    E.certified.rounds.forEach((cr, i) => {
      expect(r.rounds[i].tallies).toEqual(cr.tallies);
      expect(inactive(r.rounds[i].inactive)).toBe(cr.exhausted);
      expect([...r.rounds[i].eliminated].sort()).toEqual([...cr.eliminated].sort());
    });
  });
  it('the 2,4,{Simpson,Wright} ballot reaches Wright in round 3 (overvote resolves to the one continuing name)', () => {
    expect(r.rounds[2].tallies['Kurt Wright']).toBe(4061);
    const ex = tabulateIrv(E.load(), E.candidates, { ...E.rules, overvote: 'exhaust' });
    expect(ex.rounds[2].tallies['Kurt Wright']).toBe(4060);
  });
  it('a first-rank overvote between two continuing names stays exhausted after one is eliminated', () => {
    expect(r.rounds[1].inactive.overvote).toBe(4); expect(r.rounds[2].inactive.overvote).toBe(4);
  });
});
