import { describe, it, expect } from 'vitest';
import { parseBallots, tabulateStv, Fraction } from '../src/index.js';
const food = '4,Oranges\n2,Pears>Oranges\n8,Chocolate>Strawberries\n4,Chocolate>Hamburgers\n1,Strawberries\n1,Hamburgers';
describe('STV (exact rationals)', () => {
  it('T17 food election, Droop, 3 seats', () => {
    const { ballots, candidates } = parseBallots(food); const r = tabulateStv(ballots, candidates, 3);
    expect(r.quota).toBe('6.0000'); expect(r.rounds[0].elected).toEqual(['Chocolate']); expect(r.rounds[0].tallies.Chocolate).toBe('12.0000');
    expect(r.rounds[1].tallies.Strawberries).toBe('5.0000'); expect(r.rounds[1].tallies.Hamburgers).toBe('3.0000'); expect(r.rounds[1].eliminated).toEqual(['Pears']);
    expect(r.rounds[2].tallies.Oranges).toBe('6.0000'); expect([...r.winners].sort()).toEqual(['Chocolate', 'Oranges', 'Strawberries']);
  });
  it('T18 fractional surplus stays exact', () => {
    const { ballots, candidates } = parseBallots('3,A>B\n3,A>C\n2,B\n1,C\n4,D'); const r = tabulateStv(ballots, candidates, 2);
    expect(r.quota).toBe('5.0000'); expect(r.rounds[1].tallies).toEqual({ B: '2.5000', C: '1.5000', D: '4.0000' });
    expect(r.rounds[1].eliminated).toEqual(['C']); expect(r.rounds[2].exhausted).toBe('1.5000'); expect(r.winners.sort()).toEqual(['A', 'D']);
  });
  it('T19 Hare quota variant', () => {
    const { ballots, candidates } = parseBallots(food); const r = tabulateStv(ballots, candidates, 3, 'hare');
    expect(r.quota).toBe('6.6667'); expect(r.rounds[1].tallies.Strawberries).toBe('4.5556'); expect(r.rounds[1].tallies.Hamburgers).toBe('2.7778');
    expect([...r.winners].sort()).toEqual(['Chocolate', 'Oranges', 'Strawberries']);
  });
  it('T20 seats validation', () => {
    const { ballots, candidates } = parseBallots(food);
    expect(() => tabulateStv(ballots, candidates, 6)).toThrow('Seats must be between 1 and 5');
    expect(() => tabulateStv(ballots, candidates, 0)).toThrow('Seats must be between 1 and 5');
  });
  it('Fraction: 1/3 + 1/3 + 1/3 is exactly 1 (float gives 0.9999… in chains)', () => {
    const t = new Fraction(1, 3); expect(t.add(t).add(t).cmp(Fraction.of(1))).toBe(0); expect(new Fraction(2, 3).toFixed(4)).toBe('0.6667'); expect(new Fraction(-1, 2).toFixed(0)).toBe('-1');
  });
});
