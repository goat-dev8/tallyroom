import { BallotGroup, Mark } from './types.js';
export class ParseError extends Error {
  constructor(public line: number, msg: string, public column?: number, public candidate?: string) {
    super(`Line ${line}: ${msg}`);
    this.name = 'ParseError';
  }
}
const clean = (s: string) => s.trim().replace(/^"(.*)"$/s, '$1').normalize('NFC');

/** `[A=B]` keeps the names it lists (needed by overvote rule "continuing", BUG-012); bare `overvote` has none. */
function overvoteMark(t: string): Mark {
  const names = /^\[(.*)\]$/.exec(t)?.[1].split('=').map(clean).filter(Boolean);
  return names && names.length ? { kind: 'overvote', names } : { kind: 'overvote' };
}

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
/** Optional header line of the ranking format, e.g. `count,ranking` (BUG-002: it used to be read as a ballot). */
export const RANKING_FORMAT_HEADER = /^\s*"?(?:count|weight|ballots|votes|qty|quantity)"?\s*,\s*"?(?:ranking|rankings|ranks|order|preferences?|ballot)"?\s*$/i;

/** Counts are added up across ballots, so each one (and the total) must stay an exact JS integer (BUG-004). */
export function assertSafeCounts(ballots: BallotGroup[]): void {
  let total = 0;
  ballots.forEach((b, i) => {
    total += b.count;
    if (!Number.isSafeInteger(b.count) || !Number.isSafeInteger(total))
      throw new BallotSemanticError(`Ballot ${i + 1}: count must be a positive integer of at most ${Number.MAX_SAFE_INTEGER} in total`, i + 1, undefined, undefined, 'INVALID_COUNT');
  });
}

export function parseBallots(text: string, declared?: string[]): { ballots: BallotGroup[]; candidates: string[] } {
  const ballots: BallotGroup[] = []; const seen: string[] = [];
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  let first = true;
  const bad: ParseError[] = [];
  lines.forEach((raw, i) => { try { readLine(raw, i); } catch (e) { if (e instanceof ParseError) bad.push(e); else throw e; } });
  // Report every bad line (first 5 spelled out) so one upload shows all problems, not only the first.
  if (bad.length > 1) {
    const e = bad[0]; const shown = bad.slice(0, 5).map(x => x.message).join('; ');
    e.message = shown + (bad.length > 5 ? `; and ${bad.length - 5} more bad lines` : ''); (e as ParseError & { lines?: number[] }).lines = bad.map(x => x.line);
    throw e;
  }
  if (bad.length === 1) throw bad[0];
  function readLine(raw: string, i: number) {
    const line = raw.trim(); if (!line || line.startsWith('#')) return;
    if (first) { first = false; if (RANKING_FORMAT_HEADER.test(line)) return; }
    const comma = line.indexOf(','); if (comma < 0) throw new ParseError(i + 1, 'expected "count,ranking"');
    const countStr = line.slice(0, comma).trim();
    if (!/^[1-9]\d*$/.test(countStr)) throw new ParseError(i + 1, 'count must be a positive integer', 1);
    const marks: Mark[] = line.slice(comma + 1).split('>').map((tok, idx) => {
      const t = tok.trim();
      if (t === '_' || t === '' || /^undervote$/i.test(t)) return { kind: 'skip' } as Mark;
      if (/^\[.*\]$/.test(t) || /^overvote$/i.test(t)) return overvoteMark(t);
      const name = clean(t);
      if (declared && !declared.includes(name) && name !== WRITE_IN) throw new ParseError(i + 1, `unknown candidate "${name}"`, idx + 1, name);
      remember(seen, name, declared);
      return { kind: 'candidate', name } as Mark;
    });
    ballots.push({ count: Number(countStr), marks });
  }
  if (ballots.length === 0) throw new BallotSemanticError('No valid ballots to count');
  assertSafeCounts(ballots);
  return { ballots, candidates: declared ?? seen };
}

/** Well-formed ballot input that cannot be counted (empty file, bad count, unknown candidate). */
export class BallotSemanticError extends Error {
  constructor(message: string, public row?: number, public column?: number, public candidate?: string, public code?: string) {
    super(message);
    this.name = 'BallotSemanticError';
  }
}

const RANK_HEADER = /^(?:rank|choice|preference|pref)\s*\d+$|^\d+\s*(?:(?:st|nd|rd|th)(?:\s*(?:choice|rank|preference|pref))?|\s+(?:choice|rank|preference|pref))$|^(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)(?:\s+(?:choice|rank|preference))?$/i;
const COUNT_HEADER = /^(?:count|weight|ballots|votes|qty|quantity)$/i;
const IGNORE_HEADER = /^(?:id|ballot|ballot[_\s-]?id|#|precinct|style)$/i;
const SKIP_CELL = /^(?:_|undervote|skip|blank)$/i;

function marksFromRanking(ranking: string, declared: string[] | undefined, row: number): Mark[] {
  let parsed: { ballots: BallotGroup[] };
  try { parsed = parseBallots(`1,${ranking}`, declared); }
  catch (e) {
    if (e instanceof ParseError) throw new BallotSemanticError(`Ballot ${row}: ${e.message.replace(/^Line \d+: /, '')}`, row, e.column, e.candidate);
    throw e;
  }
  return parsed.ballots[0].marks;
}

function cellMark(cell: string, declared: string[] | undefined, row: number, column: number): Mark {
  const t = clean(cell);
  if (t === '' || SKIP_CELL.test(t)) return { kind: 'skip' };
  if (/^overvote$/i.test(t) || /^\[.*\]$/.test(t)) return overvoteMark(t);
  if (declared && !declared.includes(t) && t !== WRITE_IN) {
    throw new BallotSemanticError(`Row ${row}, column ${column}: unknown candidate "${t}"`, row, column, t);
  }
  return { kind: 'candidate', name: t };
}

function collectCandidates(ballots: BallotGroup[], declared?: string[]): string[] {
  if (declared) return declared;
  const seen: string[] = [];
  for (const b of ballots) for (const m of b.marks) if (m.kind === 'candidate') remember(seen, m.name, declared);
  return seen;
}

const COLUMN_HINT = 'count,rank1,rank2,...';
const POSITIVE_INT = /^[1-9]\d*$/;
const PURE_NUMBER = /^\d+$/;

function arrowColumn(cells: string[]): number | undefined {
  const i = cells.findIndex(c => c.includes('>'));
  return i < 0 ? undefined : i + 1;
}

function ambiguousCsv(row: number, column: number | undefined, why: string) {
  throw new BallotSemanticError(
    `Row ${row}${column ? `, column ${column}` : ''}: ${why} Use ranking lines such as "5,A>B", or one candidate per column: ${COLUMN_HINT}`,
    row,
    column,
    undefined,
    'CSV_FORMAT_AMBIGUOUS',
  );
}

/**
 * Parse a CSV file whose columns are ranks (optional header, optional count column).
 * A headerless file of `count,A>B` lines is the ranking format, not two candidate names.
 */
export function parseRankCsv(text: string, declared?: string[]): { ballots: BallotGroup[]; candidates: string[] } {
  const rows = parseCsvRows(text);
  const useful = rows.map((cells, index) => ({ cells, row: index + 1 })).filter(({ cells }) => {
    const trimmed = cells.map(c => c.trim());
    if (trimmed.every(c => c === '')) return false;
    // BUG-009: a "#" line is a comment even when it contains commas. A lone "#" cell followed by more cells is the
    // ballot-number header column (IGNORE_HEADER), not a comment.
    if (trimmed[0].startsWith('#') && (trimmed[0] !== '#' || trimmed.slice(1).every(c => c === ''))) return false;
    return true;
  });
  if (useful.length === 0) throw new BallotSemanticError('No valid ballots to count');
  if (RANKING_FORMAT_HEADER.test(useful[0].cells.join(','))) return parseBallots(text, declared);
  const header = looksLikeRankHeader(useful[0].cells) ? useful[0].cells.map(c => c.trim()) : null;
  const data = header ? useful.slice(1) : useful;
  if (data.length === 0) throw new BallotSemanticError('No valid ballots to count');
  if (!header) {
    const ranking = data.every(({ cells }) => cells.length === 2 && PURE_NUMBER.test(cells[0].trim()));
    // Every row is "count,ranking". A single-choice line ("3,A") has no ">", but a headerless rank-column file
    // can never start with a numeric candidate (rejected below), so a leading integer always means a count (parseBallots rejects 0 with a line number).
    const numericNames = ranking && data.some(({ cells }) => cells[1].split('>').some(t => PURE_NUMBER.test(t.trim())));
    if (ranking && !numericNames) return parseBallots(text, declared);
  }
  for (const { cells, row } of data) {
    const column = arrowColumn(cells);
    if (column !== undefined) ambiguousCsv(row, column, '">" joins ranks inside one cell, so this is not one candidate per column.');
  }
  if (!header) {
    for (const { cells, row } of data) {
      const name = cells[0]?.trim() ?? '';
      if (PURE_NUMBER.test(name)) {
        throw new BallotSemanticError(
          `Row ${row}, column 1: candidate name "${name}" is purely numeric. With no header, a leading count belongs in ${COLUMN_HINT}`,
          row,
          1,
          name,
          'CSV_FORMAT_AMBIGUOUS',
        );
      }
    }
  }
  const countCol = header ? header.findIndex(c => COUNT_HEADER.test(c)) : -1;
  const rankCols = header
    ? header.map((c, i) => ({ c, i })).filter(({ c, i }) => i !== countCol && !IGNORE_HEADER.test(c)).map(({ i }) => i)
    : null;
  const ballots: BallotGroup[] = data.map(({ cells, row }) => {
    let count = 1;
    if (countCol >= 0) {
      const raw = (cells[countCol] ?? '').trim();
      if (!/^[1-9]\d*$/.test(raw)) throw new BallotSemanticError(`Row ${row}, column ${countCol + 1}: count must be a positive integer`, row, countCol + 1);
      count = Number(raw);
    }
    const indexes = rankCols ?? cells.map((_, i) => i);
    const marks = indexes.map(i => cellMark(cells[i] ?? '', declared, row, i + 1));
    return { count, marks };
  });
  assertSafeCounts(ballots);
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
  let col = 1;
  let quoteLine = 1;
  let quoteCol = 1;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; col += 2; continue; }
        inQuotes = false; col++; continue;
      }
      cell += c;
      if (c === '\n') { line++; col = 1; } else col++;
      continue;
    }
    if (c === '"') { inQuotes = true; quoteLine = line; quoteCol = col; col++; continue; }
    if (c === ',') { row.push(cell); cell = ''; col++; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = ''; rows.push(row); row = []; cell = '';
      line++; col = 1; continue;
    }
    cell += c; col++;
  }
  if (inQuotes) throw new ParseError(quoteLine, 'unterminated quoted field', quoteCol);
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
    const row = i + 1;
    if (typeof item === 'string') return { count: 1, marks: marksFromRanking(item, declared, row) };
    if (Array.isArray(item)) {
      const marks = item.map((cell, j) => {
        if (cell == null || cell === '') return { kind: 'skip' } as Mark;
        if (typeof cell !== 'string') throw new BallotSemanticError(`${label}: rank ${j + 1} must be a string`, row, j + 1);
        return cellMark(cell, declared, row, j + 1);
      });
      return { count: 1, marks };
    }
    if (!item || typeof item !== 'object') throw new BallotSemanticError(`${label}: expected a ranking string, an array of ranks, or { count, ranks }`, row);
    const o = item as { count?: unknown; ranks?: unknown; ranking?: unknown };
    let count = 1;
    if (o.count !== undefined) {
      if (typeof o.count !== 'number' || !Number.isSafeInteger(o.count) || o.count < 1) throw new BallotSemanticError(`${label}: count must be a positive integer`, row);
      count = o.count;
    }
    if (typeof o.ranking === 'string') return { count, marks: marksFromRanking(o.ranking, declared, row) };
    if (Array.isArray(o.ranks)) {
      const marks = o.ranks.map((cell, j) => {
        if (cell == null || cell === '') return { kind: 'skip' } as Mark;
        if (typeof cell !== 'string') throw new BallotSemanticError(`${label}: rank ${j + 1} must be a string`, row, j + 1);
        return cellMark(cell, declared, row, j + 1);
      });
      return { count, marks };
    }
    throw new BallotSemanticError(`${label}: expected "ranks" or "ranking"`, row);
  });
  assertSafeCounts(groups);
  return { ballots: groups, candidates: collectCandidates(groups, declared) };
}

/** Pattern TSV: `count \t rank1 \t ... ` with tokens `overvote`, `overvote:A|B` (names kept), `undervote`, or a candidate name. */
export function parsePatternTsv(text: string): BallotGroup[] {
  return text.split('\n').filter(Boolean).map(l => {
    const [c, ...ranks] = l.split('\t');
    return { count: Number(c), marks: ranks.map((r): Mark => r === 'undervote' ? { kind: 'skip' } : r === 'overvote' ? { kind: 'overvote' } : r.startsWith('overvote:') ? { kind: 'overvote', names: r.slice(9).split('|') } : { kind: 'candidate', name: r }) };
  });
}
