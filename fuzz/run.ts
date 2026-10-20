/** Differential fuzz: every generated case goes through the public request handler (handleTabulate, the same code
 *  as POST /api/tabulate) and is compared with the Python oracle. Usage: tsx fuzz/run.ts cases.jsonl [report.json] */
import { readFileSync, writeFileSync } from 'node:fs';
import { handleTabulate } from '../src/api.js';
import { handleReport } from '../src/report-api.js';

const [file, out] = process.argv.slice(2);
const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
const diffs: unknown[] = []; let irv = 0, stv = 0, rounds = 0, ties = 0, batch = 0;
const fr = (s: string) => s; // exact strings compared as-is ("n/d")
for (const l of lines) {
  const c = JSON.parse(l);
  const body: Record<string, unknown> = c.csv !== undefined ? { csv: c.csv } : { ballots: c.ballots };
  if (!c.inferred) body.candidates = c.candidates;
  if (c.seats) { body.seats = c.seats; body.quota = c.quota; } body.rules = c.rules;
  const res = handleTabulate('POST', JSON.stringify(body), { contentType: 'application/json' });
  const b = res.body as any; let got: unknown;
  if (res.status !== 200) got = { status: res.status, error: b?.error?.code ?? b?.error };
  else if (c.seats) { stv++; got = { winners: b.winners, quotaExact: b.quotaExact, rounds: b.rounds.map((r: any) => ({ tallies: Object.fromEntries(Object.entries(r.exact.tallies).map(([k, v]) => [k, fr(v as string)])), exhausted: r.exact.exhausted, elected: r.elected, eliminated: r.eliminated, ...(r.surplusTransferred ? { surplusTransferred: r.surplusTransferred } : {}) })) }; }
  else { irv++;
    // Transfers come from the report handler (same code as POST /api/report); the oracle tracks them per round (BUG-022).
    const rep = handleReport('POST', { rawBody: JSON.stringify(body), contentType: 'application/json' }) as any;
    const tr = (i: number) => rep.status === 200 ? [...(rep.body.rounds[i]?.transfers ?? [])].map((e: any) => ({ from: e.from, to: e.to, count: e.count })).sort((x, y) => x.from < y.from ? -1 : x.from > y.from ? 1 : x.to < y.to ? -1 : x.to > y.to ? 1 : 0) : { reportStatus: rep.status };
    got = { winner: b.winner, rounds: b.rounds.map((r: any, i: number) => ({ tallies: { ...r.tallies }, continuing: r.continuing, eliminated: r.eliminated, transfers: tr(i) })) };
    if (b.rounds.some((r: any) => r.tieNote)) ties++; if (b.rounds.some((r: any) => r.eliminated.length > 1)) batch++; }
  rounds += (c.expected.rounds ?? []).length;
  const norm = (x: any) => JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
  // STV oracle writes integer fractions as "n/1"; engine reduces the same way, so compare verbatim.
  if (norm(got) !== norm(c.expected)) diffs.push({ id: c.id, request: body, engine: got, oracle: c.expected });
}
const summary = { cases: lines.length, irv, stv, rounds, irvCasesWithTieBreak: ties, irvCasesWithBatch: batch, divergences: diffs.length };
console.log(JSON.stringify(summary));
if (out) writeFileSync(out, JSON.stringify({ summary, divergences: diffs }, null, 1));
process.exit(diffs.length ? 1 : 0);
