/** Scottish council STV wards: Tallyroom's STV count of the council's own preference-profile (.blt) file is compared
 *  field by field with the council's "Candidate Votes Per Stage" report (parsed by scripts/parity-extract-scotland.py). */
import { readFileSync, readdirSync } from 'node:fs';
import { tabulateStv, Fraction } from '../src/index.js';
import type { BallotGroup } from '../src/types.js';

const DIR = new URL('../audit/parity/', import.meta.url);
export function readBlt(text: string) {
  const L = text.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  const [nc, seats] = L[0].split(/\s+/).map(Number);
  let i = 1; if (L[i].startsWith('-')) i++; // withdrawn candidates line
  const raw: number[][] = [];
  for (; L[i] !== '0'; i++) { const v = L[i].split(/\s+/).map(Number); if (v.at(-1) !== 0) throw new Error(`bad ballot line: ${L[i]}`); raw.push(v.slice(0, -1)); }
  const names = L.slice(i + 1, i + 1 + nc).map((l) => /^"(.*?)"/.exec(l)![1]);
  const ballots: BallotGroup[] = raw.map(([count, ...prefs]) => ({ count, marks: prefs.map((p) => ({ kind: 'candidate' as const, name: names[p - 1] })) }));
  return { names, seats, ballots };
}
type Row = { round: number | string; field: string; official: number | string; computed: number | string; ok: boolean };
const f5 = (f: Fraction) => f.toFixed(5); // half-up; exact when the value has at most 5 places
const dec5 = (s: string) => Number(s).toFixed(5);

export function scotlandResults(transferDecimals: number | undefined) {
  const files = readdirSync(new URL('official/scotland/', DIR)).filter((f) => f.endsWith('.json')).sort();
  return files.map((file) => {
    const o = JSON.parse(readFileSync(new URL(`official/scotland/${file}`, DIR), 'utf8'));
    const { names, seats, ballots } = readBlt(readFileSync(new URL(`sources/scotland/${o.ballotSource}`, DIR), 'utf8'));
    const r = tabulateStv(ballots, names, seats, 'droop', transferDecimals === undefined ? {} : { transferDecimals });
    const rows: Row[] = [];
    const add = (round: number | string, field: string, official: any, computed: any) => rows.push({ round, field, official, computed, ok: official === computed });
    const quota = new Fraction(BigInt(r.quotaExact.split('/')[0]), BigInt(r.quotaExact.split('/')[1]));
    const valid = Fraction.of(ballots.reduce((s, b) => s + b.count, 0));
    add('-', 'seats', o.seats, seats); add('-', 'valid votes', o.validVotes, Number(valid.n)); add('-', 'quota', o.quota, Number(quota.n / quota.d));
    add('-', 'stages', o.stages.length, r.rounds.length);
    add('-', 'elected (set)', [...o.stages.flatMap((s: any) => s.elected)].sort().join('; '), [...r.winners].sort().join('; '));
    // Value of every candidate at round i: continuing/pending from the tallies; elected and surplus gone = quota; else 0.
    const doneElected = new Set<string>();
    const val: Fraction[][] = []; const nt: Fraction[] = []; const loss: Fraction[] = [];
    r.rounds.forEach((rd, i) => {
      if (i > 0 && r.rounds[i - 1].surplusTransferred) doneElected.add(r.rounds[i - 1].surplusTransferred!);
      const fr = (s: string) => { const [n, d] = s.split('/'); return new Fraction(BigInt(n), BigInt(d)); };
      val[i] = names.map((c) => (c in rd.exact.tallies ? fr(rd.exact.tallies[c]) : doneElected.has(c) ? quota : Fraction.ZERO));
      nt[i] = fr(rd.exact.exhausted);
      loss[i] = valid.sub(val[i].reduce((a, b) => a.add(b), Fraction.ZERO)).sub(nt[i]);
    });
    o.stages.forEach((st: any, i: number) => {
      const s = st.stage; if (!r.rounds[i]) { add(s, 'stage exists', 'yes', 'no'); return; }
      names.forEach((c, k) => {
        add(s, `votes ${c}`, dec5(st.votes[c]), f5(val[i][k]));
        if (i > 0) add(s, `transfer ${c}`, dec5(st.transferred[c]), f5(val[i][k].sub(val[i - 1][k])));
      });
      if (i > 0) {
        add(s, 'transfer non-transferable', dec5(st.transferred.nonTransferable), f5(nt[i].sub(nt[i - 1])));
        add(s, 'transfer lost to rounding', dec5(st.transferred.rounding), f5(loss[i].sub(loss[i - 1])));
        const prev = r.rounds[i - 1];
        const kind = prev.surplusTransferred ? 'surplus' : prev.eliminated.length ? 'exclusion' : 'none';
        const who = prev.surplusTransferred ?? prev.eliminated[0] ?? '';
        add(s, 'action', `${st.action.kind} of ${st.action.candidate}`, `${kind} of ${who}`);
        const k = names.indexOf(who);
        add(s, 'action amount', dec5(st.action.amount), k < 0 ? '' : f5(kind === 'surplus' ? val[i - 1][k].sub(quota) : val[i - 1][k]));
      }
      add(s, 'not with a candidate (non-transferable + rounding)', dec5(String(Number(st.votes.nonTransferable) + Number(st.votes.rounding))), f5(nt[i].add(loss[i])));
      add(s, 'elected this stage', [...st.elected].sort().join('; '), [...r.rounds[i].elected].sort().join('; '));
    });
    const matched = rows.filter((x) => x.ok).length;
    return { slug: file.replace('.json', ''), title: `${o.council} ${o.year} — ${o.ward}`, source: o.source, sha256: o.sha256, publisher: `${o.council} Council, Candidate Votes Per Stage report; ballots from the council's preference profile ${o.ballotSource} (sha256 ${o.ballotSha256})`, rows, matched, compared: rows.length,
      notCompared: ['ballot papers received (includes rejected papers, which are not in the preference profile)', 'the "Non-transferable votes" and "due to rounding" running columns separately (the report folds one stage\'s rounding into the next stage\'s non-transferable figure; their sum is compared)', 'the per-stage Total line (always the valid vote)'] };
  });
}
