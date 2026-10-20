import { currentChoice } from './irv.js';
import { BallotGroup, DEFAULT_RULES, Round, Rules } from './types.js';

/** One pile of ballots moving off an eliminated candidate. `to` is a continuing candidate, or `exhausted` with
 *  `exhausted: true` for the inactive pile (BUG-033: a candidate may itself be called "exhausted"). */
export interface TransferEdge {
  from: string;
  to: string;
  count: number;
  exhausted?: true;
}

/**
 * Ballots that left candidates eliminated at the end of the previous round,
 * counted onto their next continuing candidate or to `exhausted`.
 * Round 0 has no incoming transfers. Batch eliminations are simultaneous:
 * a ballot is counted from the candidate it was on, not through other candidates eliminated in the same round.
 */
export function eliminationTransfers(
  ballots: BallotGroup[],
  candidates: string[],
  partial: Partial<Rules>,
  rounds: Round[],
  roundIndex: number,
): TransferEdge[] {
  if (roundIndex <= 0) return [];
  const eliminated = rounds[roundIndex - 1]?.eliminated ?? [];
  if (eliminated.length === 0) return [];
  const rules: Rules = { ...DEFAULT_RULES, ...partial };
  const gone = new Set(eliminated);
  const earlier = new Set<string>();
  for (let i = 0; i < roundIndex - 1; i++) for (const c of rounds[i].eliminated) earlier.add(c);
  const before = new Set(candidates.filter(c => !earlier.has(c)));
  const after = new Set(candidates.filter(c => !earlier.has(c) && !gone.has(c)));
  const counts = new Map<string, number>();
  // BUG-022: a ballot that went inactive in an earlier round stays inactive (as in irv.ts), so it is not a transfer.
  const hopefulAt = (j: number) => { const out = new Set<string>(); for (let k = 0; k < j; k++) for (const c of rounds[k].eliminated) out.add(c); return new Set(candidates.filter(c => !out.has(c))); };
  const earlierSets = Array.from({ length: roundIndex - 1 }, (_, j) => hopefulAt(j));
  for (const b of ballots) {
    if (earlierSets.some(h => currentChoice(b.marks, h, rules).kind !== 'candidate')) continue;
    const prev = currentChoice(b.marks, before, rules);
    if (prev.kind !== 'candidate' || !gone.has(prev.name)) continue;
    const next = currentChoice(b.marks, after, rules);
    const pile = next.kind !== 'candidate';
    const key = `${prev.name}\0${pile ? 'p' : 'c' + next.name}`; // tagged, so no candidate name can equal the pile
    counts.set(key, (counts.get(key) ?? 0) + b.count);
  }
  const destOrder = (e: TransferEdge) => (e.exhausted ? candidates.length + 1 : candidates.indexOf(e.to));
  return [...counts.entries()]
    .map(([key, count]): TransferEdge => {
      const [from, to] = key.split('\0');
      return to === 'p' ? { from, to: 'exhausted', count, exhausted: true } : { from, to: to.slice(1), count };
    })
    .sort((a, b) => candidates.indexOf(a.from) - candidates.indexOf(b.from) || destOrder(a) - destOrder(b) || a.to.localeCompare(b.to));
}
