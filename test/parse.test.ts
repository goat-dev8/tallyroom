import { describe, it, expect } from 'vitest';
import { parseBallots, tabulateIrv } from '../src/index.js';
describe('ballot parser', () => {
  it('T31 unknown candidate reports line number', () => {
    expect(() => parseBallots('1,A\n1,B\n1,C\n1,Zed>A', ['A', 'B', 'C'])).toThrow('Line 4: unknown candidate "Zed"');
  });
  it('T32 empty input', () => { expect(() => parseBallots('\n  \n')).toThrow('No valid ballots to count'); });
  it('T33 bad count', () => {
    expect(() => parseBallots('x,A>B')).toThrow('Line 1: count must be a positive integer');
    expect(() => parseBallots('0,A')).toThrow('count must be a positive integer');
    expect(() => parseBallots('1.5,A')).toThrow('count must be a positive integer');
  });
  it('T34 BOM, CRLF and quoted names with commas', () => {
    const { ballots, candidates } = parseBallots('\uFEFF3,"Smith, Jr.">Lee\r\n2,Lee');
    expect(candidates).toEqual(['Smith, Jr.', 'Lee']); expect(ballots[0].count).toBe(3);
    const r = tabulateIrv(ballots, candidates); expect(r.winner).toBe('Smith, Jr.'); expect(r.rounds.length).toBe(1);
  });
  it('T35 composed and decomposed names merge (NFC)', () => {
    const { candidates } = parseBallots('3,Jos\u00e9\n2,Jose\u0301'); expect(candidates).toEqual(['Jos\u00e9']);
  });
  it('marks overvotes and skips', () => {
    const { ballots } = parseBallots('1,_>[A=B]>C');
    expect(ballots[0].marks.map(m => m.kind)).toEqual(['skip', 'overvote', 'candidate']);
  });
  it('overvote and undervote tokens match the pattern-file convention', () => {
    const { ballots, candidates } = parseBallots('2,A>overvote>undervote');
    expect(ballots[0].marks.map(m => m.kind)).toEqual(['candidate', 'overvote', 'skip']);
    expect(candidates).toEqual(['A']);
  });
  it('Write-in is a mark, and a continuing candidate only when declared', () => {
    const passed = parseBallots('1,Write-in>A\n2,A', ['A', 'B']);
    expect(passed.candidates).toEqual(['A', 'B']);
    expect(passed.ballots[0].marks[0]).toEqual({ kind: 'candidate', name: 'Write-in' });
    const discovered = parseBallots('1,Write-in>A\n2,A');
    expect(discovered.candidates).toEqual(['A']);
    const counted = parseBallots('3,Write-in\n2,A', ['Write-in', 'A']);
    expect(counted.candidates).toEqual(['Write-in', 'A']);
  });
  it('ignores comment lines', () => { expect(parseBallots('# header\n2,A').ballots).toHaveLength(1); });
});
