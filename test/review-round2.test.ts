import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';
import { handleReport } from '../src/report-api.js';

const tab = (body: string, contentType = 'application/json') => handleTabulate('POST', body, { contentType }) as { status: number; body: any };
const last = (r: any) => r.body.rounds.at(-1);

describe('BUG-021: names inside [A=B] are candidates', () => {
  const ballots = '2,[A=B]\n2,C\n1,A';
  it('inferred and declared candidates give the same count', () => {
    const inferred = tab(JSON.stringify({ ballots, rules: { overvote: 'continuing' } }));
    const declared = tab(JSON.stringify({ ballots, candidates: ['A', 'B', 'C'], rules: { overvote: 'continuing' } }));
    expect(inferred.body.winner).toBe('C'); expect(declared.body.winner).toBe('C');
    expect(last(inferred).inactive.overvote).toBe(2);
    expect(inferred.body.candidates).toEqual(['A', 'B', 'C']);
  });
  it('an unknown name inside brackets is 422 UNKNOWN_CANDIDATE', () => {
    const r = tab(JSON.stringify({ ballots: '1,[A=Zed]', candidates: ['A', 'B'] }));
    expect(r.status).toBe(422); expect(r.body.error.code).toBe('UNKNOWN_CANDIDATE');
  });
});

describe('BUG-022: report transfers skip ballots that are already inactive', () => {
  it('round-3 edge B to exhausted is 1, not 4', () => {
    const r: any = handleReport('POST', { rawBody: JSON.stringify({ ballots: '3,[A=B]\n1,B\n4,C\n4,D', candidates: ['A', 'B', 'C', 'D'], rules: { overvote: 'continuing' } }), contentType: 'application/json' });
    expect(r.status).toBe(200);
    expect(r.body.rounds[2].transfers).toEqual([{ from: 'B', to: 'exhausted', count: 1, exhausted: true }]);
  });
});

describe('BUG-023: JSON body with a BOM (regression from the BUG-011 fix)', () => {
  for (const ct of ['text/csv', 'application/json']) it(`counts it when sent as ${ct}`, () => {
    const r = tab('\uFEFF{"ballots":"1,A\\n2,B"}', ct);
    expect(r.status).toBe(200); expect(r.body.winner).toBe('B');
  });
});
