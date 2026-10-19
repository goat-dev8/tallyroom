import { BallotGroup, DEFAULT_RULES, InactiveReason, IrvResult, Round, Rules } from './types.js';

type Pick = { kind: 'candidate'; name: string } | { kind: 'inactive'; reason: InactiveReason };

/** Find the ballot's current choice among continuing candidates under the given rules. Pure and deterministic. */
export function currentChoice(marks: BallotGroup['marks'], continuing: Set<string>, rules: Rules): Pick {
  let consecutiveSkips = 0; let sawAnyMark = false; const seen = new Set<string>();
  for (const m of marks) {
    if (m.kind === 'skip') {
      consecutiveSkips++;
      if (rules.skips === 'two-exhaust' && consecutiveSkips >= 2) return { kind: 'inactive', reason: hasLaterMark(marks, m) ? 'skips' : (sawAnyMark ? 'exhausted' : 'blank') };
      continue;
    }
    if (m.kind === 'overvote') {
      sawAnyMark = true;
      if (rules.overvote === 'exhaust') return { kind: 'inactive', reason: 'overvote' };
      consecutiveSkips = 0; continue; // overvote treated as a skipped rank but does not count toward the two-skip rule
    }
    sawAnyMark = true; consecutiveSkips = 0;
    if (seen.has(m.name)) continue; // duplicate ranking of the same candidate is ignored
    seen.add(m.name);
    if (continuing.has(m.name)) return { kind: 'candidate', name: m.name };
  }
  return { kind: 'inactive', reason: sawAnyMark ? 'exhausted' : 'blank' };
}
function hasLaterMark(marks: BallotGroup['marks'], at: BallotGroup['marks'][number]) {
  const i = marks.indexOf(at); return marks.slice(i + 1).some(m => m.kind !== 'skip');
}

export function tabulateIrv(ballots: BallotGroup[], candidates: string[], partial: Partial<Rules> = {}): IrvResult {
  const rules: Rules = { ...DEFAULT_RULES, ...partial };
  const lot = rules.lotOrder ?? candidates;
  for (const c of candidates) if (!lot.includes(c)) throw new Error(`lotOrder is missing candidate "${c}"`);
  const totalBallots = ballots.reduce((s, b) => s + b.count, 0);
  const continuing = new Set(candidates);
  const rounds: Round[] = [];
  if (candidates.length === 0) throw new Error('No candidates');
  for (let r = 1; ; r++) {
    const tallies: Record<string, number> = {}; for (const c of candidates) if (continuing.has(c)) tallies[c] = 0;
    const inactive: Record<InactiveReason, number> = { blank: 0, overvote: 0, skips: 0, exhausted: 0 };
    for (const b of ballots) {
      const p = currentChoice(b.marks, continuing, rules);
      if (p.kind === 'candidate') tallies[p.name] += b.count; else inactive[p.reason] += b.count;
    }
    // Inactive is cumulative by construction: once a ballot is inactive it never becomes active again
    // (continuing set only shrinks). Reasons may only move from active to inactive.
    const cont = Object.values(tallies).reduce((s, v) => s + v, 0);
    const threshold = Math.floor(cont / 2) + 1;
    const round: Round = { round: r, tallies, continuing: cont, inactive, threshold, eliminated: [] };
    const prev = rounds[rounds.length - 1];
    if (prev) { round.transfers = {}; for (const c of Object.keys(tallies)) round.transfers[c] = tallies[c] - prev.tallies[c]; }
    rounds.push(round);
    const ordered = Object.keys(tallies).sort((a, b) => tallies[b] - tallies[a] || lot.indexOf(a) - lot.indexOf(b));
    const top = ordered[0];
    if (tallies[top] >= threshold || ordered.length === 1) return { candidates, rules, rounds, winner: top, totalBallots };
    if (ordered.length === 2 && tallies[ordered[0]] > tallies[ordered[1]]) return { candidates, rules, rounds, winner: top, totalBallots };
    // choose who to eliminate
    let elim: string[] = [];
    if (rules.batch) {
      const asc = [...ordered].reverse(); let sum = 0;
      for (let k = 1; k <= asc.length - 2; k++) { sum += tallies[asc[k - 1]]; if (sum < tallies[asc[k]]) elim = asc.slice(0, k); }
    }
    if (elim.length === 0) {
      const min = Math.min(...Object.values(tallies));
      let tied = Object.keys(tallies).filter(c => tallies[c] === min);
      if (tied.length > 1 && rules.tiebreak === 'previous-round') {
        for (let back = rounds.length - 2; back >= 0 && tied.length > 1; back--) {
          const t = rounds[back].tallies; const m = Math.min(...tied.map(c => t[c]));
          tied = tied.filter(c => t[c] === m);
        }
        if (tied.length === 1) round.tieNote = 'previous-round';
      }
      if (tied.length > 1) { tied.sort((a, b) => lot.indexOf(b) - lot.indexOf(a)); tied = [tied[0]]; round.tieNote = 'lot'; }
      elim = tied;
    }
    round.eliminated = elim; for (const c of elim) continuing.delete(c);
  }
}
