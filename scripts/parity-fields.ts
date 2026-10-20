/** Field-level parity: every numeric field and every elimination/election in the official round tables
 *  (parsed mechanically from the raw files by scripts/parity-extract.py into audit/parity/official/*.json)
 *  is compared with Tallyroom's own count of the cast vote records. Usage: tsx scripts/parity-fields.ts [--json out.json] */
import { readFileSync, writeFileSync } from 'node:fs';
import { tabulateIrv, maineCategories, dominionCategories } from '../src/index.js';
import type { Round } from '../src/types.js';
import { MAINE_2018_CD2 } from '../src/elections/maine-2018-cd2.js';
import { ALASKA_2022_SPECIAL } from '../src/elections/alaska-2022-special.js';
import { NYC_2021_DEM_MAYOR } from '../src/elections/nyc-2021-dem-mayor.js';
import { BURLINGTON_2009_MAYOR } from '../src/elections/burlington-2009-mayor.js';

type Row = { round: number | string; field: string; official: number | string; computed: number | string; ok: boolean };
const off = (slug: string) => JSON.parse(readFileSync(new URL(`../audit/parity/official/${slug}.json`, import.meta.url), 'utf8'));
const inact = (r?: Round) => (r ? Object.values(r.inactive).reduce((a, b) => a + b, 0) : 0);
const norm = (s: string) => s.replace(/^(DEM|REP) /, '').replace(/^Write-ins$/, 'Write-in').trim().toLowerCase();

function run(E: any, slug: string, extra: (o: any, r: any, add: (round: number | string, field: string, official: any, computed: any) => void) => void, notCompared: string[]) {
  const o = off(slug), r = tabulateIrv(E.load(), E.candidates, E.rules), rows: Row[] = [];
  const add = (round: number | string, field: string, official: any, computed: any) => rows.push({ round, field, official, computed, ok: official === computed });
  const name = (n: string) => { const m = r.candidates.find((c: string) => norm(c) === norm(n)); if (!m) throw new Error(`${slug}: no candidate for official name "${n}"`); return m; };
  const t = (i: number, c: string) => r.rounds[i]?.tallies[name(c)] ?? 0;
  o.rounds.forEach((or: any, i: number) => {
    if (or.formal) return;
    for (const [c, v] of Object.entries(or.tallies)) add(i + 1, `votes ${c}`, v, t(i, c));
    if (or.eliminated !== undefined && !or.skipEliminated) add(i + 1, 'eliminated', [...or.eliminated].map(name).sort().join('; '), [...(r.rounds[i]?.eliminated ?? [])].sort().join('; '));
  });
  add('-', 'winner', name(o.winner), r.winner);
  add('-', 'rounds', o.rounds.filter((x: any) => !x.formal).length, r.rounds.length);
  extra(o, r, add);
  return { slug, title: E.title, source: o.source, sha256: o.sha256, publisher: o.publisher, rows, notCompared, matched: rows.filter((x) => x.ok).length, compared: rows.length };
}
const transfersByDelta = (o: any, r: any, add: any, name: (c: string) => string, catDelta: Record<string, (i: number) => number>, outRound: (i: number) => number) => {
  o.rounds.forEach((or: any, i: number) => {
    for (const [k, v] of Object.entries(or.transfers ?? {})) {
      const j = outRound(i);  // transfer column describes the move from round j to j+1
      const got = k in catDelta ? catDelta[k](j) : (r.rounds[j + 1]?.tallies[name(k)] ?? 0) - (r.rounds[j]?.tallies[name(k)] ?? 0);
      add(i + 1, `transfer ${k}`, v, r.rounds[j + 1] ? got : 0);  // after the final round nothing moves
    }
  });
};
const nameOf = (r: any) => (n: string) => r.candidates.find((c: string) => norm(c) === norm(n));

const results = [
  run(MAINE_2018_CD2, 'maine-2018-cd2', (o, r, add) => {
    o.rounds.forEach((or: any, i: number) => {
      const c = maineCategories(r.rounds[i]);
      add(i + 1, 'overvotes', or.categories.overvotes, c.overvotes); add(i + 1, 'undervotes', or.categories.undervotes, c.undervotes);
      add(i + 1, 'exhausted choices', or.categories.exhaustedChoices, c.exhaustedChoices); add(i + 1, 'continuing', or.categories.continuing, c.continuing);
      add(i + 1, 'total', or.categories.total, c.continuing + inact(r.rounds[i])); add(i + 1, 'winning threshold', or.threshold, r.rounds[i].threshold);
    });
    const cat = (k: 'overvotes' | 'undervotes' | 'exhaustedChoices') => (j: number) => r.rounds[j + 1] ? maineCategories(r.rounds[j + 1])[k] - maineCategories(r.rounds[j])[k] : 0;
    transfersByDelta(o, r, add, nameOf(r), { overvotes: cat('overvotes'), undervotes: cat('undervotes'), exhaustedChoices: cat('exhaustedChoices') }, (i) => i);
  }, ['percentages (derived from the compared counts)']),
  run(ALASKA_2022_SPECIAL, 'alaska-2022-special', (o, r, add) => {
    o.rounds.forEach((or: any, i: number) => {
      const c = dominionCategories(r.rounds, i);
      add(i + 1, 'continuing', or.categories.continuing, c.continuing); add(i + 1, 'blanks', or.categories.blanks, c.blanks);
      add(i + 1, 'exhausted', or.categories.exhausted, c.exhausted); add(i + 1, 'overvotes', or.categories.overvotes, c.overvotes);
      add(i + 1, 'non-transferable total', or.categories.nonTransferable, c.blanks + c.exhausted + c.overvotes);
    });
    const cat = (k: 'exhausted' | 'overvotes') => (j: number) => dominionCategories(r.rounds, j + 1)[k] - dominionCategories(r.rounds, j)[k];
    transfersByDelta(o, r, add, nameOf(r), { Exhausted: cat('exhausted'), Overvotes: cat('overvotes') }, (i) => i);
    add(2, 'elected', nameOf(r)(o.rounds[1].elected[0]), r.winner);
  }, ['round 2 "Palin is eliminated because not elected in the last round" (a report formality after the winner is known; the winner is compared instead)', '"Remainder Points" (fractional remainders; counts here are whole ballots)', 'percentages']),
  run(NYC_2021_DEM_MAYOR, 'nyc-2021-dem-mayor', (o, r, add) => {
    o.rounds.forEach((or: any, i: number) => { if (i) add(i + 1, 'inactive since round 1', or.inactiveSinceR1, inact(r.rounds[i]) - inact(r.rounds[0])); });
    transfersByDelta(o, r, add, nameOf(r), { inactive: (j) => inact(r.rounds[j + 1]) - inact(r.rounds[j]) }, (i) => i);
    add(8, 'elected', nameOf(r)(o.rounds[7].elected[0]), r.winner);
  }, ['round 1 inactive (the BOE table starts inactive counting after round 1)', 'percentages']),
  run(BURLINGTON_2009_MAYOR, 'burlington-2009-mayor', (o, r, add) => {
    add('-', 'winning threshold', o.threshold, r.rounds[0].threshold); add('-', 'valid ballots', o.validBallots, r.totalBallots);
    o.rounds.forEach((or: any, i: number) => {
      if (or.formal) return;
      add(i + 1, 'exhausted pile', or.exhaustedPile, inact(r.rounds[i])); add(i + 1, 'totals', or.totals, r.rounds[i].continuing + inact(r.rounds[i]));
    });
    // ChoicePlus "THIS ROUND" column = change into round i from round i-1 (round 1 = first choices)
    o.rounds.forEach((or: any, i: number) => {
      if (or.formal) return;
      for (const [k, v] of Object.entries(or.transfers)) {
        const got = k === 'exhausted' ? inact(r.rounds[i]) - (i ? inact(r.rounds[i - 1]) : 0) : (r.rounds[i]?.tallies[nameOf(r)(k)] ?? 0) - (i ? r.rounds[i - 1]?.tallies[nameOf(r)(k)] ?? 0 : 0);
        add(i + 1, `this-round ${k}`, v, got);
      }
    });
    const el = o.rounds.findIndex((x: any) => x.elected?.length); add(el + 1, 'elected', nameOf(r)(o.rounds[el].elected[0]), r.winner);
  }, ['round 4 (ChoicePlus prints a closing round that only marks Kurt Wright defeated after the seat is filled; no votes move)', 'round 3 "eliminated" (none; compared via the elected field)', 'invalid ballots (4) — not in the cast vote record']),
];
let tm = 0, tc = 0, em = 0;
for (const x of results) {
  tm += x.matched; tc += x.compared; if (x.matched === x.compared) em++;
  console.log(`\n## ${x.title}\nSource: ${x.source} (sha256 ${x.sha256}) — ${x.publisher}\n| Round | Field | Official | Tallyroom | |\n|---|---|---|---|---|`);
  for (const w of x.rows) console.log(`| ${w.round} | ${w.field} | ${w.official} | ${w.computed} | ${w.ok ? 'match' : '**MISMATCH**'} |`);
  console.log(`Fields: ${x.matched}/${x.compared} match. Not compared: ${x.notCompared.join('; ')}.`);
}
console.log(`\nTOTAL: ${tm}/${tc} fields match; ${em}/${results.length} elections match on every compared field.`);
const j = process.argv.indexOf('--json'); if (j > 0) writeFileSync(process.argv[j + 1], JSON.stringify({ fieldsMatched: tm, fieldsCompared: tc, electionsMatched: em, elections: results.length, results }, null, 1) + '\n');
process.exit(tm === tc ? 0 : 1);
