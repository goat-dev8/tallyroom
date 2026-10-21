// BUG-009: a "#" comment line that contains a comma was read as data in CSV uploads.
import { describe, it, expect } from 'vitest';
import { parseRankCsv } from '../src/parse.js';
describe('BUG-009 CSV comment lines with commas', () => {
  it('a ranking file with "# exported ..., Ward 3" on top still counts', () => {
    const r = parseRankCsv('# exported 2024-10-01, Ward 3\n3,A>B\n2,B');
    expect(r.ballots.map(b => b.count)).toEqual([3, 2]); expect(r.candidates).toEqual(['A', 'B']);
  });
  it('a comment above a rank-column header is not a ballot and the header is still a header', () => {
    const r = parseRankCsv('# source: county, state\nrank1,rank2\nA,B');
    expect(r.ballots).toEqual([{ count: 1, marks: [{ kind: 'candidate', name: 'A' }, { kind: 'candidate', name: 'B' }] }]);
  });
  it('a comment between data rows is skipped', () => {
    expect(parseRankCsv('rank1,rank2\nA,B\n# recount, batch 2\nB,A').ballots.length).toBe(2);
  });
});
describe('BUG-009 guard: "#" as a header column is still a header', () => {
  it('#,rank1,rank2 header', () => {
    expect(parseRankCsv('#,rank1,rank2\n1,A,B').ballots).toEqual([{ count: 1, marks: [{ kind: 'candidate', name: 'A' }, { kind: 'candidate', name: 'B' }] }]);
  });
});
