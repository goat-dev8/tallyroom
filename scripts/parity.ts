/** Prints computed vs certified for every real election and exits non-zero on any gap. Usage: tsx scripts/parity.ts [slug] */
import { tabulateIrv, maineCategories, dominionCategories } from '../src/index.js';
import { MAINE_2018_CD2 } from '../src/elections/maine-2018-cd2.js';
import { ALASKA_2022_SPECIAL } from '../src/elections/alaska-2022-special.js';
import { NYC_2021_DEM_MAYOR } from '../src/elections/nyc-2021-dem-mayor.js';
import { BURLINGTON_2009_MAYOR } from '../src/elections/burlington-2009-mayor.js';
let bad = 0;
const line = (round: number | string, item: string, got: number, want: number) => { const g = got - want; if (g) bad++; console.log(`| ${round} | ${item} | ${got.toLocaleString('en-US')} | ${want.toLocaleString('en-US')} | ${g} |`); };
const only = process.argv[2];
if (!only || only === 'maine') {
  const E = MAINE_2018_CD2, r = tabulateIrv(E.load(), E.candidates, E.rules);
  console.log(`\n## ${E.title}\n| Round | Item | Computed | Certified | Gap |\n|---|---|---|---|---|`);
  for (const [k, v] of Object.entries(E.certified.round1)) line(1, k, r.rounds[0].tallies[k], v);
  const c1 = maineCategories(r.rounds[0]); line(1, 'overvotes', c1.overvotes, 435); line(1, 'undervotes', c1.undervotes, 6018); line(1, 'exhausted choices', c1.exhaustedChoices, 0); line(1, 'continuing', c1.continuing, 289624);
  for (const [k, v] of Object.entries(E.certified.final)) line(2, k, r.rounds[1]?.tallies[k] ?? 0, v);
  const c2 = maineCategories(r.rounds[1]); line(2, 'overvotes', c2.overvotes, 533); line(2, 'undervotes', c2.undervotes, 13838); line(2, 'exhausted choices', c2.exhaustedChoices, 335); line(2, 'continuing', c2.continuing, 281371);
  line('-', 'total ballots', r.totalBallots, 296077); line('-', 'rounds', r.rounds.length, 2);
}
if (!only || only === 'alaska') {
  const E = ALASKA_2022_SPECIAL, r = tabulateIrv(E.load(), E.candidates, E.rules);
  console.log(`\n## ${E.title}\n| Round | Item | Computed | Certified | Gap |\n|---|---|---|---|---|`);
  E.certified.rounds.forEach((cr, i) => {
    for (const [k, v] of Object.entries(cr.tallies)) line(i + 1, k, r.rounds[i]?.tallies[k] ?? 0, v);
    const c = dominionCategories(r.rounds, i); line(i + 1, 'continuing', c.continuing, cr.continuing); line(i + 1, 'blanks', c.blanks, cr.blanks); line(i + 1, 'exhausted', c.exhausted, cr.exhausted); line(i + 1, 'overvotes', c.overvotes, cr.overvotes);
  });
  line('-', 'total ballots', r.totalBallots, E.certified.totalBallots); line('-', 'rounds', r.rounds.length, 2);
}
if (!only || only === 'nyc') {
  const E = NYC_2021_DEM_MAYOR, r = tabulateIrv(E.load(), E.candidates, E.rules);
  console.log(`\n## ${E.title}\n| Round | Item | Computed | Certified | Gap |\n|---|---|---|---|---|`);
  const base = (i: number) => Object.values(r.rounds[i].inactive).reduce((a, b) => a + b, 0);
  E.certified.rounds.forEach((cr, i) => {
    for (const [k, v] of Object.entries(cr.tallies)) line(i + 1, k, r.rounds[i]?.tallies[k] ?? 0, v);
    if (r.rounds[i]) line(i + 1, 'inactive since R1', base(i) - base(0), cr.inactive);
    const ge = [...(r.rounds[i]?.eliminated ?? [])].sort().join('; '), we = [...cr.eliminated].sort().join('; ');
    if (ge !== we) { bad++; console.log(`| ${i + 1} | eliminated | ${ge} | ${we} | MISMATCH |`); }
  });
  line('-', 'rounds', r.rounds.length, 8);
  console.log(`(ballots with a mark in this race: ${r.totalBallots.toLocaleString('en-US')}; inactive in R1: ${base(0)})`);
}
if (!only || only === 'burlington') {
  const E = BURLINGTON_2009_MAYOR, r = tabulateIrv(E.load(), E.candidates, E.rules);
  console.log(`\n## ${E.title}\n| Round | Item | Computed | Certified | Gap |\n|---|---|---|---|---|`);
  E.certified.rounds.forEach((cr, i) => {
    for (const [k, v] of Object.entries(cr.tallies)) line(i + 1, k, r.rounds[i]?.tallies[k] ?? 0, v);
    line(i + 1, 'exhausted pile', Object.values(r.rounds[i]?.inactive ?? {}).reduce((a, b) => a + b, 0), cr.exhausted);
  });
  line('-', 'total ballots', r.totalBallots, E.certified.totalBallots); line('-', 'rounds', r.rounds.length, 3);
}
console.log(bad ? `\nPARITY: MISMATCH (${bad} gaps)` : '\nPARITY: EXACT'); process.exit(bad ? 1 : 0);
