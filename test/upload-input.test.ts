// BUG-010: the 4 MB limit counted characters, so a UTF-8 body over 4 MB of accented names was accepted.
// BUG-011: a JSON body sent as text/csv was counted as CSV, with candidates like "{ballots:[A".
import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';
import { MAX_BODY_BYTES } from '../src/errors.js';
describe('BUG-010 byte limit', () => {
  it('rejects a body over 4 MB in UTF-8 bytes even when it has fewer than 4M characters', () => {
    const line = '1,' + 'é'.repeat(1000) + '\n';
    const body = line.repeat(Math.ceil((MAX_BODY_BYTES + 1) / (2 * 1000)));
    expect(body.length).toBeLessThan(MAX_BODY_BYTES);
    const r = handleTabulate('POST', body, { contentType: 'text/csv' }) as any;
    expect(r.status).toBe(413); expect(r.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
  it('still accepts a body just under the limit', () => {
    expect(handleTabulate('POST', '3,A\n2,B', { contentType: 'text/csv' }).status).toBe(200);
  });
});
describe('BUG-011 JSON labelled text/csv', () => {
  it('is read as JSON, not as CSV cells', () => {
    const r = handleTabulate('POST', '{"ballots":["A>B","B","A"]}', { contentType: 'text/csv' }) as any;
    expect(r.status).toBe(200); expect(r.body.candidates).toEqual(['A', 'B']); expect(r.body.winner).toBe('A');
    const a = handleTabulate('POST', '[["A","B"],["B"],["A"]]', { contentType: 'text/csv; charset=utf-8' }) as any;
    expect(a.status).toBe(200); expect(a.body.candidates).toEqual(['A', 'B']);
  });
  it('a CSV that merely starts with "[" stays CSV', () => {
    const r = handleTabulate('POST', '[A=B],C\nC,A', { contentType: 'text/csv' }) as any;
    expect(r.status).toBe(200);
  });
});
