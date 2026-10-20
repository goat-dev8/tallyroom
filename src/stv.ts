import { currentChoice } from './irv.js';
import { DEFAULT_RULES, Rules } from './types.js';
import { Fraction } from './fraction.js';
import { BallotGroup } from './types.js';
import { BallotSemanticError, assertCandidateLimit } from './parse.js';

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
 *  so clients can verify conservation with no rounding: Σ tallies + exhausted + quota × (elected candidates no longer in
 *  tallies) = ballots. `tallies` lists continuing candidates plus elected ones whose surplus is still to be transferred. */
export interface StvRound { round: number; tallies: Record<string, string>; exhausted: string; elected: string[]; eliminated: string[]; surplusTransferred?: string; exact: { tallies: Record<string, string>; exhausted: string } }
export interface StvResult { quota: string; quotaExact: string; winners: string[]; rounds: StvRound[] }

/** Multi-seat STV, weighted inclusive Gregory surplus transfer, exact rationals.
 *  quota droop = floor(valid/(seats+1))+1 ; hare = valid/seats (exact), valid = ballots counting for a candidate at stage 1.
 *  One surplus is transferred per stage, largest first. Ballots are read with the IRV ballot rules. */
export function tabulateStv(ballots: BallotGroup[], candidates: string[], seats: number, quotaKind: 'droop' | 'hare' = 'droop', partial: Partial<Rules> = {}): StvResult {
  // BUG-019: ballots are read with the same overvote, skips and duplicates rules as IRV (currentChoice), and a
  // ballot that goes inactive stays inactive. Batch elimination is IRV-only (rejected for STV by the API).
  const rules: Rules = { ...DEFAULT_RULES, ...partial };
  const ties = rules;
  // BUG-014: ties for last place follow the same rules as IRV: previous-round (default), then lot (last in lotOrder goes).
  assertCandidateLimit(candidates);
  const lot = ties.lotOrder ?? candidates;
  for (const c of candidates) if (!lot.includes(c)) throw new Error(`lotOrder is missing candidate "${c}"`);
  const tiebreak = ties.tiebreak ?? 'previous-round';
  const history: Map<string, Fraction>[] = [];
  if (!Number.isInteger(seats) || seats < 1 || seats > candidates.length) throw new RangeError(`Seats must be between 1 and ${candidates.length}`);
  // BUG-026: papers share weight classes. A class's weight is the product of the transfer values it went through, so
  // tallies are summed as integer counts per class and multiplied once, instead of one big-fraction add per paper.
  type WeightClass = { weight: Fraction; next: Map<string, WeightClass> };
  // `at` is the candidate holding the paper, or null once it is inactive (non-transferable). Papers only move when their
  // holder is excluded or has a surplus transferred, so an inactive paper stays inactive (BUG-019) and an elected
  // candidate whose surplus is still waiting keeps its papers and receives no new ones (BUG-029).
  type Paper = { marks: BallotGroup['marks']; cls: WeightClass; count: number; at: string | null };
  const unit: WeightClass = { weight: Fraction.of(1), next: new Map() };
  let commonDen = 1n;
  const hopeful = new Set(candidates); const elected: string[] = []; const pending: string[] = []; const rounds: StvRound[] = [];
  const nextHolder = (p: Paper) => { const pick = currentChoice(p.marks, hopeful, rules); return pick.kind === 'candidate' ? pick.name : null; };
  const papers: Paper[] = ballots.map(b => ({ marks: b.marks, count: b.count, cls: unit, at: null }));
  for (const p of papers) p.at = nextHolder(p);
  // BUG-028: the quota is computed from valid ballots, those that count for a candidate at the first stage. Blank papers,
  // first-preference overvotes and other papers void under the ballot rules do not raise it.
  // Source: Scottish Local Government Elections Order 2007 (SSI 2007/42), Schedule 1, rules 43 (void papers not counted),
  // 45(3) (total number of valid ballot papers) and 46 (quota = valid papers / (seats + 1), decimals ignored, plus one).
  const valid = papers.reduce((s, p) => s + (p.at === null ? 0 : p.count), 0);
  if (valid === 0) throw new BallotSemanticError('No ballot counts for any candidate, so there is no quota', undefined, undefined, undefined, 'NO_VALID_BALLOTS');
  const quota = quotaKind === 'droop' ? Fraction.of(Math.floor(valid / (seats + 1)) + 1) : new Fraction(valid, seats);
  const moveTo = (p: Paper, tv: Fraction | null, key: string, r: number) => {
    if (tv) {
      let to = p.cls.next.get(key);
      if (!to) { p.cls.next.set(key, (to = { weight: p.cls.weight.mul(tv), next: new Map() })); commonDen = lcm(commonDen, to.weight.d); if (bitLength(commonDen) > MAX_EXACT_BITS) tooComplex(r); }
      p.cls = to;
    }
    p.at = nextHolder(p);
  };
  const fmt = (f: Fraction) => f.toFixed(4);
  const exact = (f: Fraction) => `${f.n}/${f.d}`;
  for (let r = 1; elected.length < seats; r++) {
    // Tallies list continuing candidates and elected candidates whose surplus has not been transferred yet.
    const tally = new Map<string, Fraction>(); for (const c of candidates) if (hopeful.has(c) || pending.includes(c)) tally.set(c, Fraction.ZERO);
    let exhausted = Fraction.ZERO;
    const sums = new Map<WeightClass, Map<string | null, bigint>>();
    for (const p of papers) {
      let m = sums.get(p.cls); if (!m) sums.set(p.cls, (m = new Map()));
      m.set(p.at, (m.get(p.at) ?? 0n) + BigInt(p.count));
    }
    // commonDen is the lcm of every class weight's denominator, so each tally is one integer sum and a single reduction.
    const nums = new Map<string | null, bigint>();
    for (const [cls, m] of sums) {
      const scale = cls.weight.n * (commonDen / cls.weight.d);
      for (const [c, n] of m) nums.set(c, (nums.get(c) ?? 0n) + scale * n);
    }
    // Papers held by an elected candidate after its surplus left are its quota; they are in neither column.
    for (const [c, n] of nums) { const v = new Fraction(n, commonDen); if (c === null) exhausted = v; else if (tally.has(c)) tally.set(c, v); }
    const round: StvRound = { round: r, tallies: Object.fromEntries([...tally].map(([k, v]) => [k, fmt(v)])), exhausted: fmt(exhausted), elected: [], eliminated: [],
      exact: { tallies: Object.fromEntries([...tally].map(([k, v]) => [k, exact(v)])), exhausted: exact(exhausted) } };
    rounds.push(round); history.push(tally);
    const order = [...hopeful].sort((a, b) => tally.get(b)!.cmp(tally.get(a)!) || candidates.indexOf(a) - candidates.indexOf(b));
    // Rule 52: when the continuing candidates fit the remaining seats they are elected and nothing more is transferred.
    if (hopeful.size <= seats - elected.length) { for (const c of order) { elected.push(c); round.elected.push(c); } break; }
    // Rule 47: a candidate at or above the quota is elected at that stage.
    for (const c of order.filter(c => tally.get(c)!.cmp(quota) >= 0)) { hopeful.delete(c); elected.push(c); pending.push(c); round.elected.push(c); }
    if (elected.length >= seats) break;
    if (hopeful.size <= seats - elected.length) { for (const c of [...hopeful]) { hopeful.delete(c); elected.push(c); round.elected.push(c); } break; }
    if (pending.length) {
      // BUG-029, rule 49: one surplus per stage, the largest first; equal surpluses go by the most recent stage where the
      // candidates differed (highest first), then by lot (earliest in lotOrder first).
      const surplus = (c: string) => tally.get(c)!.sub(quota);
      let tied = pending.filter(c => surplus(c).cmp(pending.map(surplus).reduce((a, b) => (a.cmp(b) >= 0 ? a : b))) === 0);
      for (let back = history.length - 2; back >= 0 && tied.length > 1; back--) {
        const t = history[back]; if (!tied.every(c => t.has(c))) break;
        const high = tied.map(c => t.get(c)!).reduce((a, b) => (a.cmp(b) >= 0 ? a : b));
        tied = tied.filter(c => t.get(c)!.cmp(high) === 0);
      }
      if (tied.length > 1) tied.sort((a, b) => lot.indexOf(a) - lot.indexOf(b));
      const c = tied[0]; const t = tally.get(c)!; const tv = t.sub(quota).div(t);
      pending.splice(pending.indexOf(c), 1); round.surplusTransferred = c;
      for (const p of papers) if (p.at === c) moveTo(p, tv, c, r);
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
    for (const p of papers) if (p.at === loser) moveTo(p, null, loser, r);
  }
  return { quota: fmt(quota), quotaExact: exact(quota), winners: elected, rounds };
}
