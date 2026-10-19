import { BallotGroup, Mark } from './types.js';
export class ParseError extends Error { constructor(public line: number, msg: string) { super(`Line ${line}: ${msg}`); } }
const clean = (s: string) => s.trim().replace(/^"(.*)"$/s, '$1').normalize('NFC');

/** Ballot token for an unresolved write-in. Counted only when listed in the declared candidates. */
export const WRITE_IN = 'Write-in';

/**
 * "Write-in" may appear on a ballot without being a continuing candidate (Alaska: those marks are passed over).
 * It joins the continuing set only when the caller lists it in `declared` (New York City counts that row).
 */
export function writeInContinues(name: string, declared?: string[]): boolean {
  return name === WRITE_IN && !!declared?.includes(WRITE_IN);
}

function remember(seen: string[], name: string, declared?: string[]) {
  if (name === WRITE_IN && !writeInContinues(name, declared)) return;
  if (!seen.includes(name)) seen.push(name);
}

/** Parse `count,A>B>C` lines. `[A=B]` or `overvote` is an overvote, `_` or `undervote` a skipped rank. Quoted names may contain commas. */
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
      if (t === '_' || t === '' || /^undervote$/i.test(t)) return { kind: 'skip' } as Mark;
      if (/^\[.*\]$/.test(t) || /^overvote$/i.test(t)) return { kind: 'overvote' } as Mark;
      const name = clean(t);
      if (declared && !declared.includes(name) && name !== WRITE_IN) throw new ParseError(i + 1, `unknown candidate "${name}"`);
      remember(seen, name, declared);
      return { kind: 'candidate', name } as Mark;
    });
    ballots.push({ count: Number(countStr), marks });
  });
  if (ballots.length === 0) throw new ParseError(0, 'No valid ballots to count');
  return { ballots, candidates: declared ?? seen };
}

/** Well-formed ballot input that cannot be counted (empty file, bad count, unknown candidate). */
export class BallotSemanticError extends Error {
  constructor(message: string) { super(message); this.name = 'BallotSemanticError'; }
}

const RANK_HEADER = /^(?:rank|choice|preference|pref)\s*\d+$|^\d+\s*(?:st|nd|rd|th)?(?:\s*(?:choice|rank|preference|pref))?$|^(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)(?:\s+(?:choice|rank|preference))?$/i;
const COUNT_HEADER = /^(?:count|weight|ballots|votes|qty|quantity)$/i;
const IGNORE_HEADER = /^(?:id|ballot|ballot[_\s-]?id|#|precinct|style)$/i;
const SKIP_CELL = /^(?:_|undervote|skip|blank)$/i;

function marksFromRanking(ranking: string, declared: string[] | undefined, label: string): Mark[] {
  let parsed: { ballots: BallotGroup[] };
  try { parsed = parseBallots(`1,${ranking}`, declared); }
  catch (e) {
    if (e instanceof ParseError) throw new BallotSemanticError(`${label}: ${e.message.replace(/^Line \d+: /, '')}`);
    throw e;
  }
  return parsed.ballots[0].marks;
}

function cellMark(cell: string, declared: string[] | undefined, rowLabel: string): Mark {
  const t = clean(cell);
  if (t === '' || SKIP_CELL.test(t)) return { kind: 'skip' };
  if (/^overvote$/i.test(t) || /^\[.*\]$/.test(t)) return { kind: 'overvote' };
  if (declared && !declared.includes(t) && t !== WRITE_IN) throw new BallotSemanticError(`${rowLabel}: unknown candidate "${t}"`);
  return { kind: 'candidate', name: t };
}

function collectCandidates(ballots: BallotGroup[], declared?: string[]): string[] {
  if (declared) return declared;
  const seen: string[] = [];
  for (const b of ballots) for (const m of b.marks) if (m.kind === 'candidate') remember(seen, m.name, declared);
  return seen;
}

/** Parse a CSV file whose columns are ranks (optional header, optional count column). */
export function parseRankCsv(text: string, declared?: string[]): { ballots: BallotGroup[]; candidates: string[] } {
  const rows = parseCsvRows(text);
  const useful = rows.map((cells, index) => ({ cells, row: index + 1 })).filter(({ cells }) => {
    const trimmed = cells.map(c => c.trim());
    if (trimmed.every(c => c === '')) return false;
    if (trimmed[0].startsWith('#') && trimmed.slice(1).every(c => c === '')) return false;
    return true;
  });
  if (useful.length === 0) throw new BallotSemanticError('No valid ballots to count');
  const header = looksLikeRankHeader(useful[0].cells) ? useful[0].cells.map(c => c.trim()) : null;
  const data = header ? useful.slice(1) : useful;
  if (data.length === 0) throw new BallotSemanticError('No valid ballots to count');
  const countCol = header ? header.findIndex(c => COUNT_HEADER.test(c)) : -1;
  const rankCols = header
    ? header.map((c, i) => ({ c, i })).filter(({ c, i }) => i !== countCol && !IGNORE_HEADER.test(c)).map(({ i }) => i)
    : null;
  const ballots: BallotGroup[] = data.map(({ cells, row }) => {
    let count = 1;
    if (countCol >= 0) {
      const raw = (cells[countCol] ?? '').trim();
      if (!/^[1-9]\d*$/.test(raw)) throw new BallotSemanticError(`Row ${row}: count must be a positive integer`);
      count = Number(raw);
    }
    const indexes = rankCols ?? cells.map((_, i) => i);
    const marks = indexes.map(i => cellMark(cells[i] ?? '', declared, `Row ${row}`));
    return { count, marks };
  });
  return { ballots, candidates: collectCandidates(ballots, declared) };
}

function looksLikeRankHeader(row: string[]): boolean {
  const cells = row.map(c => c.trim()).filter(Boolean);
  if (cells.length === 0) return false;
  const known = (c: string) => RANK_HEADER.test(c) || COUNT_HEADER.test(c) || IGNORE_HEADER.test(c);
  return cells.every(known) && cells.some(c => RANK_HEADER.test(c) || COUNT_HEADER.test(c));
}

/** RFC-style CSV rows. Throws ParseError on an unterminated quote. */
export function parseCsvRows(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let line = 1;
  let quoteLine = 1;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; continue; }
        inQuotes = false; continue;
      }
      if (c === '\n') line++;
      cell += c; continue;
    }
    if (c === '"') { inQuotes = true; quoteLine = line; continue; }
    if (c === ',') { row.push(cell); cell = ''; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = ''; rows.push(row); row = []; cell = '';
      line++; continue;
    }
    cell += c;
  }
  if (inQuotes) throw new ParseError(quoteLine, 'unterminated quoted field');
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

/**
 * JSON ballots: a ranking string (`count,A>B`), an array of ballots, or `{ csv }`.
 * Array items are `["A","B"]`, `"A>B"`, or `{ count, ranks | ranking }`.
 */
export function parseBallotJson(ballots: unknown, declared?: string[]): { ballots: BallotGroup[]; candidates: string[] } {
  if (typeof ballots === 'string') return parseBallots(ballots, declared);
  if (!Array.isArray(ballots)) throw new BallotSemanticError('Field "ballots" must be a ranking string or an array of ballots');
  if (ballots.length === 0) throw new BallotSemanticError('No valid ballots to count');
  const groups: BallotGroup[] = ballots.map((item, i) => {
    const label = `Ballot ${i + 1}`;
    if (typeof item === 'string') return { count: 1, marks: marksFromRanking(item, declared, label) };
    if (Array.isArray(item)) {
      const marks = item.map((cell, j) => {
        if (cell == null || cell === '') return { kind: 'skip' } as Mark;
        if (typeof cell !== 'string') throw new BallotSemanticError(`${label}: rank ${j + 1} must be a string`);
        return cellMark(cell, declared, label);
      });
      return { count: 1, marks };
    }
    if (!item || typeof item !== 'object') throw new BallotSemanticError(`${label}: expected a ranking string, an array of ranks, or { count, ranks }`);
    const o = item as { count?: unknown; ranks?: unknown; ranking?: unknown };
    let count = 1;
    if (o.count !== undefined) {
      if (typeof o.count !== 'number' || !Number.isInteger(o.count) || o.count < 1) throw new BallotSemanticError(`${label}: count must be a positive integer`);
      count = o.count;
    }
    if (typeof o.ranking === 'string') return { count, marks: marksFromRanking(o.ranking, declared, label) };
    if (Array.isArray(o.ranks)) {
      const marks = o.ranks.map((cell, j) => {
        if (cell == null || cell === '') return { kind: 'skip' } as Mark;
        if (typeof cell !== 'string') throw new BallotSemanticError(`${label}: rank ${j + 1} must be a string`);
        return cellMark(cell, declared, label);
      });
      return { count, marks };
    }
    throw new BallotSemanticError(`${label}: expected "ranks" or "ranking"`);
  });
  return { ballots: groups, candidates: collectCandidates(groups, declared) };
}

/** Pattern TSV: `count \t rank1 \t ... ` with tokens `overvote`, `undervote`, or a candidate name. */
export function parsePatternTsv(text: string): BallotGroup[] {
  return text.split('\n').filter(Boolean).map(l => {
    const [c, ...ranks] = l.split('\t');
    return { count: Number(c), marks: ranks.map((r): Mark => r === 'undervote' ? { kind: 'skip' } : r === 'overvote' ? { kind: 'overvote' } : { kind: 'candidate', name: r }) };
  });
}
