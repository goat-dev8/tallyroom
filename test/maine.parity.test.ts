import { describe, it, expect } from 'vitest';
import { tabulateIrv, maineCategories } from '../src/index.js';
import { MAINE_2018_CD2 as E } from '../src/elections/maine-2018-cd2.js';
describe('Maine 2018 CD2 — certified parity from official CVRs', () => {
  const r = tabulateIrv(E.load(), E.candidates, E.rules);
  it('T21 round 1 matches certified exactly', () => { expect(r.totalBallots).toBe(296077); expect(r.rounds[0].tallies).toEqual(E.certified.round1); expect(r.rounds[0].threshold).toBe(144813); });
  it('T22 final round matches certified exactly, 2 rounds via batch elimination', () => {
    expect(r.rounds.length).toBe(2); expect(r.rounds[0].eliminated.sort()).toEqual(['Bond, Tiffany L.', 'Hoar, William R.S.']);
    expect(r.rounds[1].tallies).toEqual(E.certified.final); expect(r.winner).toBe('DEM Golden, Jared F.');
    expect(r.rounds[1].continuing).toBe(281371); expect(r.rounds[1].threshold).toBe(140686);
    expect(r.rounds[1].transfers).toEqual({ 'REP Poliquin, Bruce': 4747, 'DEM Golden, Jared F.': 10427 });
  });
  it('official exhaustion categories match the SoS summary report in both rounds', () => {
    expect(maineCategories(r.rounds[0])).toEqual({ overvotes: 435, undervotes: 6018, exhaustedChoices: 0, continuing: 289624 });
    expect(maineCategories(r.rounds[1])).toEqual({ overvotes: 533, undervotes: 13838, exhaustedChoices: 335, continuing: 281371 });
  });
  it('T28 rule sensitivity: overvote=skip differs from certified', () => {
    const s = tabulateIrv(E.load(), E.candidates, { ...E.rules, overvote: 'skip' });
    const diff = Math.abs(s.rounds.at(-1)!.tallies['DEM Golden, Jared F.'] - 142440) + Math.abs(s.rounds.at(-1)!.tallies['REP Poliquin, Bruce'] - 138931);
    expect(diff).toBeGreaterThan(0);
  });
  it('without batch elimination: 3 rounds, same final', () => {
    const s = tabulateIrv(E.load(), E.candidates, { ...E.rules, batch: false });
    expect(s.rounds.length).toBe(3); expect(s.rounds[2].tallies).toEqual(E.certified.final);
  });
});
