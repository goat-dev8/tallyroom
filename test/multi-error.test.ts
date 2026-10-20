import { describe, it, expect } from 'vitest';
import { parseBallots } from '../src/parse.js';
import { handleTabulate } from '../src/api.js';
describe('every bad line is reported', () => {
  it('lists all bad lines, first one keeps its position', () => {
    try { parseBallots('3,A\nx,B\n2,C\n0,D'); throw new Error('no throw'); }
    catch (e: any) { expect(e.message).toBe('Line 2: count must be a positive integer; Line 4: count must be a positive integer'); expect(e.line).toBe(2); expect(e.lines).toEqual([2, 4]); }
  });
  it('caps the list at 5 and says how many more', () => {
    expect(() => parseBallots(Array.from({ length: 8 }, () => 'x,A').join('\n'))).toThrow(/Line 5: [^;]*; and 3 more bad lines$/);
  });
  it('a single bad line keeps the old message', () => {
    expect(() => parseBallots('3,A\nx,B')).toThrow(/^Line 2: count must be a positive integer$/);
    expect((handleTabulate('POST', JSON.stringify({ ballots: '3,A\nx,B\n0,C' })) as any).body.error.message).toContain('Line 3');
  });
});
