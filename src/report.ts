import { Round } from './types.js';

/** Deterministic JSON: object keys sorted, no insignificant whitespace. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

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
