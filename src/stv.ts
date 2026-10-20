import { currentChoice } from './irv.js';
import { DEFAULT_RULES, Rules } from './types.js';
import { Fraction } from './fraction.js';
import { BallotGroup } from './types.js';
import { BallotSemanticError } from './parse.js';

/** BUG-026: exact Gregory transfers can grow fractions without bound (and time with them). Past this size the count is refused (422). */
export const MAX_EXACT_BITS = 24576;
const gcdBig = (a: bigint, b: bigint): bigint => { while (b) [a, b] = [b, a % b]; return a; };
const lcm = (a: bigint, b: bigint) => (a / gcdBig(a, b)) * b;
const tooComplex = (round: number): never => {
  throw new BallotSemanticError(`This count needs exact fractions larger than ${MAX_EXACT_BITS} bits (round ${round}); it is refused rather than left to time out. Fewer distinct rankings or fewer seats will fit.`,
    undefined, undefined, undefined, 'STV_TOO_COMPLEX');
};
const bitLength = (n: bigint) => n.toString(16).length * 4;

/** `tallies`/`exhausted` are display values (4 dp). `exact` holds the same values as reduced fractions "n/d",
 *  so clients can verify conservation (hopeful + exhausted + quota × seats filled = ballots) with no rounding. */
export interface StvRound { round: number; tallies: Record<string, string>; exhausted: string; elected: string[]; eliminated: string[]; exact: { tallies: Record<string, string>; exhausted: string } }
export interface StvResult { quota: string; quotaExact: string; winners: string[]; rounds: StvRound[] }

/** Multi-seat STV, weighted inclusive Gregory surplus transfer, exact rationals.
 *  quota droop = floor(valid/(seats+1))+1 ; hare = valid/seats (exact). Skips are passed over; overvotes exhaust. */
export function tabulateStv(ballots: BallotGroup[], candidates: string[], seats: number, quotaKind: 'droop' | 'hare' = 'droop', partial: Partial<Rules> = {}): StvResult {
  // BUG-019: ballots are read with the same overvote, skips and duplicates rules as IRV (currentChoice), and a
  // ballot that goes inactive stays inactive. Batch elimination is IRV-only (rejected for STV by the API).
  const rules: Rules = { ...DEFAULT_RULES, ...partial };
  const ties = rules;
  // BUG-014: ties for last place follow the same rules as IRV: previous-round (default), then lot (last in lotOrder goes).
  const lot = ties.lotOrder ?? candidates;
  for (const c of candidates) if (!lot.includes(c)) throw new Error(`lotOrder is missing candidate "${c}"`);
  const tiebreak = ties.tiebreak ?? 'previous-round';
  const history: Map<string, Fraction>[] = [];
  if (!Number.isInteger(seats) || seats < 1 || seats > candidates.length) throw new RangeError(`Seats must be between 1 and ${candidates.length}`);
  const total = ballots.reduce((s, b) => s + b.count, 0);
  const quota = quotaKind === 'droop' ? Fraction.of(Math.floor(total / (seats + 1)) + 1) : new Fraction(total, seats);
  // BUG-026: papers share weight classes. A class's weight is the product of the transfer values it went through, so
  // tallies are summed as integer counts per class and multiplied once, instead of one big-fraction add per paper.
  type WeightClass = { weight: Fraction; next: Map<string, WeightClass> };
  type Paper = { marks: BallotGroup['marks']; cls: WeightClass; count: number };
  const unit: WeightClass = { weight: Fraction.of(1), next: new Map() };
  const papers: Paper[] = ballots.map(b => ({ marks: b.marks, count: b.count, cls: unit }));
  let commonDen = 1n;
  const hopeful = new Set(candidates); const elected: string[] = []; const rounds: StvRound[] = [];
  const dead = new Set<Paper>();
  const choice = (p: Paper) => {
    if (dead.has(p)) return null;
    const pick = currentChoice(p.marks, hopeful, rules);
    if (pick.kind === 'candidate') return pick.name;
    dead.add(p); return null;
  };
  const fmt = (f: Fraction) => f.toFixed(4);
  const exact = (f: Fraction) => `${f.n}/${f.d}`;
  for (let r = 1; elected.length < seats; r++) {
    const tally = new Map<string, Fraction>(); for (const c of candidates) if (hopeful.has(c)) tally.set(c, Fraction.ZERO);
    let exhausted = Fraction.ZERO;
    const sums = new Map<WeightClass, Map<string | null, bigint>>();
    for (const p of papers) {
      const c = choice(p); let m = sums.get(p.cls); if (!m) sums.set(p.cls, (m = new Map()));
      m.set(c, (m.get(c) ?? 0n) + BigInt(p.count));
    }
    // commonDen is the lcm of every class weight's denominator,
    // so each tally is one integer sum over commonDen and a single reduction.
    const nums = new Map<string | null, bigint>();
    for (const [cls, m] of sums) {
      const scale = cls.weight.n * (commonDen / cls.weight.d);
      for (const [c, n] of m) nums.set(c, (nums.get(c) ?? 0n) + scale * n);
    }
    for (const [c, n] of nums) { const v = new Fraction(n, commonDen); if (c) tally.set(c, v); else exhausted = v; }
    const round: StvRound = { round: r, tallies: Object.fromEntries([...tally].map(([k, v]) => [k, fmt(v)])), exhausted: fmt(exhausted), elected: [], eliminated: [],
      exact: { tallies: Object.fromEntries([...tally].map(([k, v]) => [k, exact(v)])), exhausted: exact(exhausted) } };
    rounds.push(round); history.push(tally);
    const order = [...tally.keys()].sort((a, b) => tally.get(b)!.cmp(tally.get(a)!) || candidates.indexOf(a) - candidates.indexOf(b));
    if (hopeful.size <= seats - elected.length) { for (const c of order) { elected.push(c); round.elected.push(c); } break; }
    const winners = order.filter(c => tally.get(c)!.cmp(quota) >= 0);
    if (winners.length) {
      for (const c of winners) {
        const t = tally.get(c)!; const tv = t.sub(quota).div(t);
        const key = `${c}`;
        for (const p of papers) if (choice(p) === c) {
          let to = p.cls.next.get(key); if (!to) { p.cls.next.set(key, (to = { weight: p.cls.weight.mul(tv), next: new Map() })); commonDen = lcm(commonDen, to.weight.d); if (bitLength(commonDen) > MAX_EXACT_BITS) tooComplex(r); }
          p.cls = to;
        }
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
