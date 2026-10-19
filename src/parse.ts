import { BallotGroup, Mark } from './types.js';
export class ParseError extends Error { constructor(public line: number, msg: string) { super(`Line ${line}: ${msg}`); } }
const clean = (s: string) => s.trim().replace(/^"(.*)"$/s, '$1').normalize('NFC');

/** Parse `count,A>B>C` lines. `[A=B]` is an overvote at that rank, `_` a skipped rank. Quoted names may contain commas. */
export function parseBallots(text: string, declared?: string[]): { ballots: BallotGroup[]; candidates: string[] } {
  const ballots: BallotGroup[] = []; const seen: string[] = [];
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim(); if (!line || line.startsWith('#')) return;
    const comma = line.indexOf(','); if (comma < 0) throw new ParseError(i + 1, 'expected "count,ranking"');
    const countStr = line.slice(0, comma).trim();
    if (!/^[1-9]\d*$/.test(countStr)) throw new ParseError(i + 1, 'count must be a positive integer');
    const marks: Mark[] = line.slice(comma + 1).split('>').map(tok => {
      const t = tok.trim();
      if (t === '_' || t === '') return { kind: 'skip' } as Mark;
      if (/^\[.*\]$/.test(t)) return { kind: 'overvote' } as Mark;
      const name = clean(t);
      if (declared && !declared.includes(name)) throw new ParseError(i + 1, `unknown candidate "${name}"`);
      if (!seen.includes(name)) seen.push(name);
      return { kind: 'candidate', name } as Mark;
    });
    ballots.push({ count: Number(countStr), marks });
  });
  if (ballots.length === 0) throw new ParseError(0, 'No valid ballots to count');
  return { ballots, candidates: declared ?? seen };
}

/** Pattern TSV: `count \t rank1 \t ... ` with tokens `overvote`, `undervote`, or a candidate name. */
export function parsePatternTsv(text: string): BallotGroup[] {
  return text.split('\n').filter(Boolean).map(l => {
    const [c, ...ranks] = l.split('\t');
    return { count: Number(c), marks: ranks.map((r): Mark => r === 'undervote' ? { kind: 'skip' } : r === 'overvote' ? { kind: 'overvote' } : { kind: 'candidate', name: r }) };
  });
}
