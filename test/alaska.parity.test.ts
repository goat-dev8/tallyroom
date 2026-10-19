import { describe, it, expect } from 'vitest';
import { tabulateIrv, dominionCategories } from '../src/index.js';
import { ALASKA_2022_SPECIAL as E } from '../src/elections/alaska-2022-special.js';
describe('Alaska 2022 special — certified parity from official CVR', () => {
  const r = tabulateIrv(E.load(), E.candidates, E.rules);
  it('T23 round 1 matches certified exactly', () => {
    expect(r.totalBallots).toBe(E.certified.totalBallots); expect(r.rounds[0].tallies).toEqual(E.certified.rounds[0].tallies);
    const c = dominionCategories(r.rounds, 0); expect(c).toEqual({ blanks: 3412, exhausted: 0, overvotes: 295, continuing: 188582 });
    expect(r.rounds[0].eliminated).toEqual(['Begich, Nick']);
  });
  it('T24 final round matches certified exactly, including exhausted 11,243', () => {
    expect(r.rounds.length).toBe(2); expect(r.rounds[1].tallies).toEqual(E.certified.rounds[1].tallies); expect(r.winner).toBe('Peltola, Mary S.');
    expect(dominionCategories(r.rounds, 1)).toEqual({ blanks: 3412, exhausted: 11243, overvotes: 342, continuing: 177292 });
  });
  it('T25 Begich transfer split matches the official transfer table', () => {
    const d = r.rounds[1].transfers!; const c1 = dominionCategories(r.rounds, 1);
    expect(d).toEqual({ 'Palin, Sarah': 27053, 'Peltola, Mary S.': 15467 });
    expect(c1.exhausted).toBe(E.certified.begichTransfers.exhausted); expect(c1.overvotes - 295).toBe(E.certified.begichTransfers.overvotes);
    expect(27053 + 15467 + 11243 + 47).toBe(53810);
  });
  it('duplicate-as-ignored (the other convention) does NOT match — the rule matters', () => {
    const s = tabulateIrv(E.load(), E.candidates, { ...E.rules, duplicates: 'ignore' });
    expect(s.rounds[1].tallies).not.toEqual(E.certified.rounds[1].tallies);
  });
});
