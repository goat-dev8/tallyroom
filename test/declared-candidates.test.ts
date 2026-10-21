import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';

// BUG-013: the declared `candidates` list was not validated or normalised the way ballot names are.
const post = (o: unknown) => handleTabulate('POST', JSON.stringify(o), { contentType: 'application/json' });

describe('BUG-013: declared candidates', () => {
  it('a duplicate name is refused, so it cannot raise the seat limit', () => {
    const r = post({ ballots: '3,A\n1,B', candidates: ['A', 'A', 'B'], seats: 3 });
    expect(r.status).toBe(422);
    expect((r.body as any).error.code).toBe('DUPLICATE_CANDIDATE');
  });
  it('blank and non-string entries are refused instead of becoming phantom candidates', () => {
    for (const bad of ['', '  ', {}, 5, null]) {
      const r = post({ ballots: '3,A\n1,B', candidates: [bad, 'A', 'B'] });
      expect(r.status, JSON.stringify(bad)).toBe(422);
      expect((r.body as any).error.code).toBe('INVALID_CANDIDATES');
    }
  });
  it('declared names are trimmed and NFC-normalised like ballot names', () => {
    const nfd = post({ ballots: '3,Zo\u00eb\n1,B', candidates: ['Zoe\u0308', 'B'] });
    expect(nfd.status).toBe(200); expect((nfd.body as any).winner).toBe('Zo\u00eb');
    const pad = post({ ballots: '3,A\n1,B', candidates: [' A ', 'B'] });
    expect(pad.status).toBe(200); expect((pad.body as any).candidates).toEqual(['A', 'B']);
  });
  it('the CSV route checks declared names the same way', () => {
    const r = post({ csv: 'count,rank1\n3,A\n1,B', candidates: ['A', 'A', 'B'] });
    expect(r.status).toBe(422);
  });
});
