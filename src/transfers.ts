import { currentChoice } from './irv.js';
import { BallotGroup, DEFAULT_RULES, Round, Rules } from './types.js';

/** One pile of ballots moving off an eliminated candidate. `to` is a continuing candidate or `exhausted`. */
export interface TransferEdge {
  from: string;
  to: string;
  count: number;
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
  for (const b of ballots) {
    const prev = currentChoice(b.marks, before, rules);
    if (prev.kind !== 'candidate' || !gone.has(prev.name)) continue;
    const next = currentChoice(b.marks, after, rules);
    const to = next.kind === 'candidate' ? next.name : 'exhausted';
    const key = `${prev.name}\0${to}`;
    counts.set(key, (counts.get(key) ?? 0) + b.count);
  }
  const destOrder = (name: string) => (name === 'exhausted' ? candidates.length + 1 : candidates.indexOf(name));
  return [...counts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split('\0');
      return { from, to, count };
    })
    .sort((a, b) => candidates.indexOf(a.from) - candidates.indexOf(b.from) || destOrder(a.to) - destOrder(b.to) || a.to.localeCompare(b.to));
}
