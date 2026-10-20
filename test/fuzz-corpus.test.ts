import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { handleTabulate } from '../src/api.js';

// Frozen slice of the differential fuzz run: 600 elections from `python3 fuzz/gen.py 2026 600`, each with the
// answer of the independent Python counter (fuzz/oracle.py). No Python needed at test time.
const cases = readFileSync(new URL('./fuzz/corpus-2026.jsonl', import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const sortKeys = (x: unknown) => JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);

describe('engine agrees with the Python counter on the frozen fuzz corpus', () => {
  it('corpus exercises IRV and STV, every overvote rule, every input format', () => {
    expect(cases.length).toBe(600);
    expect(cases.some(c => c.seats)).toBe(true);
    for (const o of ['exhaust', 'skip', 'continuing']) expect(cases.some(c => c.rules?.overvote === o)).toBe(true);
    for (const f of ['text', 'spaced', 'columns']) expect(cases.some(c => c.format === f)).toBe(true);
  });
  it('all 600 frozen cases match the Python counter', () => {
    const bad: unknown[] = [];
    for (const c of cases) {
        const body: Record<string, unknown> = c.csv !== undefined ? { csv: c.csv, candidates: c.candidates } : { ballots: c.ballots, candidates: c.candidates };
        if (c.seats) { body.seats = c.seats; body.quota = c.quota; } body.rules = c.rules;
        const r = handleTabulate('POST', JSON.stringify(body), { contentType: 'application/json' });
        if (r.status !== 200) { if (sortKeys({ status: r.status, error: (r.body as any)?.error?.code }) !== sortKeys(c.expected)) bad.push({ id: c.id, status: r.status }); continue; }
        const b = r.body as any;
        const got = c.seats
          ? { winners: b.winners, quotaExact: b.quotaExact, rounds: b.rounds.map((x: any) => ({ tallies: x.exact.tallies, exhausted: x.exact.exhausted, elected: x.elected, eliminated: x.eliminated, ...(x.surplusTransferred ? { surplusTransferred: x.surplusTransferred } : {}) })) }
          : { winner: b.winner, rounds: b.rounds.map((x: any) => ({ tallies: { ...x.tallies }, continuing: x.continuing, eliminated: x.eliminated })) };
        if (sortKeys(got) !== sortKeys(c.expected)) bad.push({ id: c.id, engine: got, oracle: c.expected });
    }
    expect(bad).toEqual([]);
  });
});
