import { Round } from './types.js';
/** Maine SoS summary report categories ("Ballot Exhausted By Overvotes / By Undervotes / By Exhausted Choices"). */
export function maineCategories(r: Round) {
  return { overvotes: r.inactive.overvote, undervotes: r.inactive.blank + r.inactive.skips + r.inactive.undervote, exhaustedChoices: r.inactive.exhausted, continuing: r.continuing };
}
/** Dominion RCV Detailed Report categories (Alaska): Blanks = non-overvote inactive in round 1;
 *  Exhausted = non-overvote ballots that became inactive after round 1; Overvotes = cumulative overvotes. */
export function dominionCategories(rounds: Round[], i: number) {
  const nonOver = (r: Round) => r.inactive.blank + r.inactive.skips + r.inactive.undervote + r.inactive.exhausted;
  const blanks = nonOver(rounds[0]);
  return { blanks, exhausted: nonOver(rounds[i]) - blanks, overvotes: rounds[i].inactive.overvote, continuing: rounds[i].continuing };
}
