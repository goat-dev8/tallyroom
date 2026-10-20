/** Runs fuzz/hostile.py cases through handleTabulate (the code behind POST /api/tabulate) and checks each against
 *  its expectation. Usage: tsx fuzz/hostile.ts cases.jsonl [report.json]. Exit 1 on any mismatch. */
import { readFileSync, writeFileSync } from 'node:fs';
import * as localApi from '../src/api.js';
import * as localParse from '../src/parse.js';
import * as localIrv from '../src/irv.js';
const local = { ...localApi, ...localParse, ...localIrv };
// HOSTILE_SRC=/abs/path/to/src runs the same cases against another build of src/ (used to check it finds old bugs).
const S = process.env.HOSTILE_SRC;
const api: typeof local = S ? { ...(await import(S + '/api.ts')), ...(await import(S + '/parse.ts')), ...(await import(S + '/irv.ts')) } : local;
const handleTabulate = api.handleTabulate;
const norm = (x: any) => JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);

export function checkHostile(c: any): null | Record<string, unknown> {
  if (c.tsv !== undefined) {
    const r = api.tabulateIrv(api.parsePatternTsv(c.tsv), c.candidates);
    const got = { winner: r.winner, rounds: r.rounds.map((x: any) => ({ tallies: { ...x.tallies }, continuing: x.continuing, eliminated: x.eliminated })) };
    return norm(got) === norm(c.expect.result) ? null : { engine: got };
  }
  const body = c.repeat ? c.repeat.prefix + c.repeat.char.repeat(c.repeat.n) : c.body;
  const r = handleTabulate('POST', body, { contentType: c.contentType });
  const b = r.body as any;
  if (r.status !== c.expect.status) return { status: r.status, error: b?.error, winner: b?.winner };
  if (c.expect.code && b?.error?.code !== c.expect.code) return { status: r.status, error: b?.error };
  if (c.expect.winnerLength !== undefined && b?.winner?.length !== c.expect.winnerLength) return { status: r.status, winnerLength: b?.winner?.length };
  if (c.expect.result) {
    const got = { winner: b.winner, rounds: b.rounds.map((x: any) => ({ tallies: { ...x.tallies }, continuing: x.continuing, eliminated: x.eliminated })) };
    if (norm(got) !== norm(c.expect.result)) return { engine: got };
  }
  return null;
}

if (process.argv[1]?.endsWith('hostile.ts')) {
  const [file, out] = process.argv.slice(2);
  const cases = readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const diffs: unknown[] = []; const shapes: Record<string, number> = {};
  for (const c of cases) {
    shapes[c.shape] = (shapes[c.shape] ?? 0) + 1;
    const d = checkHostile(c);
    if (d) diffs.push({ id: c.id, shape: c.shape, expect: c.expect, got: d, body: c.repeat ? c.repeat : c.body });
  }
  const summary = { cases: cases.length, shapes, divergences: diffs.length };
  console.log(JSON.stringify(summary));
  if (out) writeFileSync(out, JSON.stringify({ summary, divergences: diffs }, null, 1));
  process.exit(diffs.length ? 1 : 0);
}
