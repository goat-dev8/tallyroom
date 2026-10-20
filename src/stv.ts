import { Fraction } from './fraction.js';
import { BallotGroup } from './types.js';

/** `tallies`/`exhausted` are display values (4 dp). `exact` holds the same values as reduced fractions "n/d",
 *  so clients can verify conservation (hopeful + exhausted + quota × seats filled = ballots) with no rounding. */
export interface StvRound { round: number; tallies: Record<string, string>; exhausted: string; elected: string[]; eliminated: string[]; exact: { tallies: Record<string, string>; exhausted: string } }
export interface StvResult { quota: string; quotaExact: string; winners: string[]; rounds: StvRound[] }

/** Multi-seat STV, weighted inclusive Gregory surplus transfer, exact rationals.
 *  quota droop = floor(valid/(seats+1))+1 ; hare = valid/seats (exact). Skips are passed over; overvotes exhaust. */
export function tabulateStv(ballots: BallotGroup[], candidates: string[], seats: number, quotaKind: 'droop' | 'hare' = 'droop', ties: { tiebreak?: 'previous-round' | 'lot'; lotOrder?: string[] } = {}): StvResult {
  // BUG-014: ties for last place follow the same rules as IRV: previous-round (default), then lot (last in lotOrder goes).
  const lot = ties.lotOrder ?? candidates;
  for (const c of candidates) if (!lot.includes(c)) throw new Error(`lotOrder is missing candidate "${c}"`);
  const tiebreak = ties.tiebreak ?? 'previous-round';
  const history: Map<string, Fraction>[] = [];
  if (!Number.isInteger(seats) || seats < 1 || seats > candidates.length) throw new RangeError(`Seats must be between 1 and ${candidates.length}`);
  const total = ballots.reduce((s, b) => s + b.count, 0);
  const quota = quotaKind === 'droop' ? Fraction.of(Math.floor(total / (seats + 1)) + 1) : new Fraction(total, seats);
  type Paper = { marks: BallotGroup['marks']; weight: Fraction; count: number };
  const papers: Paper[] = ballots.map(b => ({ marks: b.marks, count: b.count, weight: Fraction.of(1) }));
  const hopeful = new Set(candidates); const elected: string[] = []; const rounds: StvRound[] = [];
  const choice = (p: Paper) => { for (const m of p.marks) { if (m.kind === 'overvote') return null; if (m.kind === 'candidate' && hopeful.has(m.name)) return m.name; } return null; };
  const fmt = (f: Fraction) => f.toFixed(4);
  const exact = (f: Fraction) => `${f.n}/${f.d}`;
  for (let r = 1; elected.length < seats; r++) {
    const tally = new Map<string, Fraction>(); for (const c of candidates) if (hopeful.has(c)) tally.set(c, Fraction.ZERO);
    let exhausted = Fraction.ZERO;
    for (const p of papers) { const c = choice(p); const v = p.weight.mul(Fraction.of(p.count)); if (c) tally.set(c, tally.get(c)!.add(v)); else exhausted = exhausted.add(v); }
    const round: StvRound = { round: r, tallies: Object.fromEntries([...tally].map(([k, v]) => [k, fmt(v)])), exhausted: fmt(exhausted), elected: [], eliminated: [],
      exact: { tallies: Object.fromEntries([...tally].map(([k, v]) => [k, exact(v)])), exhausted: exact(exhausted) } };
    rounds.push(round); history.push(tally);
    const order = [...tally.keys()].sort((a, b) => tally.get(b)!.cmp(tally.get(a)!) || candidates.indexOf(a) - candidates.indexOf(b));
    if (hopeful.size <= seats - elected.length) { for (const c of order) { elected.push(c); round.elected.push(c); } break; }
    const winners = order.filter(c => tally.get(c)!.cmp(quota) >= 0);
    if (winners.length) {
      for (const c of winners) {
        const t = tally.get(c)!; const tv = t.sub(quota).div(t);
        for (const p of papers) if (choice(p) === c) p.weight = p.weight.mul(tv);
        elected.push(c); round.elected.push(c);
      }
      for (const c of winners) hopeful.delete(c);
      continue;
    }
    const min = tally.get(order[order.length - 1])!;
    let tied = order.filter(c => tally.get(c)!.cmp(min) === 0);
    if (tied.length > 1 && tiebreak === 'previous-round') {
      for (let back = history.length - 2; back >= 0 && tied.length > 1; back--) {
        const t = history[back]; const low = tied.map(c => t.get(c)!).reduce((a, b) => (a.cmp(b) <= 0 ? a : b));
        tied = tied.filter(c => t.get(c)!.cmp(low) === 0);
      }
    }
    if (tied.length > 1) tied.sort((a, b) => lot.indexOf(b) - lot.indexOf(a));
    const loser = tied[0]; hopeful.delete(loser); round.eliminated.push(loser);
  }
  return { quota: fmt(quota), quotaExact: exact(quota), winners: elected, rounds };
}
