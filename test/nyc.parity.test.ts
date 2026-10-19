import { describe, it, expect } from 'vitest';
import { tabulateIrv } from '../src/index.js';
import { NYC_2021_DEM_MAYOR as E } from '../src/elections/nyc-2021-dem-mayor.js';
describe('NYC 2021 Democratic mayoral primary — certified parity from official CVR', () => {
  const r = tabulateIrv(E.load(), E.candidates, E.rules);
  const inact = (i: number) => Object.values(r.rounds[i].inactive).reduce((a, b) => a + b, 0) - Object.values(r.rounds[0].inactive).reduce((a, b) => a + b, 0);
  it('T26 all 8 rounds match the certified recap exactly (tallies, inactive, eliminations)', () => {
    expect(r.rounds.length).toBe(8);
    E.certified.rounds.forEach((cr, i) => {
      expect(r.rounds[i].tallies).toEqual(cr.tallies);
      expect(inact(i)).toBe(cr.inactive);
      expect([...r.rounds[i].eliminated].sort()).toEqual([...cr.eliminated].sort());
    });
    expect(r.winner).toBe('Eric L. Adams');
  });
  it('batch elimination is required: one-at-a-time gives more rounds, same final', () => {
    const s = tabulateIrv(E.load(), E.candidates, { ...E.rules, batch: false });
    expect(s.rounds.length).toBeGreaterThan(8); expect(s.rounds.at(-1)!.tallies).toEqual(E.certified.rounds[7].tallies);
  });
});
