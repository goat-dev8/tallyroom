import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';

// Defects found by the differential fuzz run (fuzz/), each reduced to the smallest request that shows it.
const post = (body: unknown) => handleTabulate('POST', JSON.stringify(body), { contentType: 'application/json' });

describe('BUG-028: overvote rule "continuing" through the public API', () => {
  // Reduced from fuzz seed 1 case 24. Burlington 2009 is certified under this rule, but the API refused it.
  it('accepts rules.overvote = "continuing"', () => {
    const r = post({ ballots: '22,Bo>Ada\n8,Ada', candidates: ['Ada', 'Bo'], rules: { overvote: 'continuing' } });
    expect(r.status).toBe(200);
    expect((r.body as any).winner).toBe('Bo');
  });
  it('an overvote [A=B] reached after B is eliminated counts for A (names are kept from the text format)', () => {
    const r = post({ ballots: '4,Ada\n4,Bo\n1,Dee>[Ada=Dee]', candidates: ['Ada', 'Bo', 'Dee'], rules: { overvote: 'continuing' } });
    expect(r.status).toBe(200);
    const b = r.body as any;
    expect(b.rounds[0].tallies).toEqual({ Ada: 4, Bo: 4, Dee: 1 });
    expect(b.rounds[0].eliminated).toEqual(['Dee']);
    expect(b.rounds[1].tallies).toEqual({ Ada: 5, Bo: 4 });
    expect(b.winner).toBe('Ada');
  });
});
