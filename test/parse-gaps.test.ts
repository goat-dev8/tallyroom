// Parser behaviour that Stryker showed was untested (surviving mutants in src/parse.ts, not message text).
import { describe, it, expect } from 'vitest';
import { parseBallots, parseRankCsv, parseCsvRows, parseBallotJson, writeInContinues, WRITE_IN } from '../src/parse.js';
const names = (r: { ballots: { marks: { kind: string; name?: string }[] }[] }) => r.ballots.map(b => b.marks.map(m => m.kind === 'candidate' ? m.name : m.kind).join('>'));

describe('ranking lines', () => {
  it('strips a byte-order mark and reads the header only on the first line', () => {
    expect(names(parseBallots('\uFEFF3,A>B'))).toEqual(['A>B']);
    expect(parseBallots('count,ranking\n2,A').ballots).toEqual([{ count: 2, marks: [{ kind: 'candidate', name: 'A' }] }]);
    expect(() => parseBallots('2,A\ncount,ranking')).toThrow(/Line 2/);
  });
  it('a count must be a whole positive number with nothing after it', () => {
    for (const bad of ['10abc,A', '012,A', '0,A', 'x1,A']) expect(() => parseBallots(bad)).toThrow(/Line 1/);
  });
  it('a line without a comma is rejected', () => { expect(() => parseBallots('A>B')).toThrow(/Line 1/); });
  it('special tokens must be the whole cell; spaces around them are trimmed', () => {
    expect(names(parseBallots('1, overvote >A> undervote >B'))).toEqual(['overvote>A>skip>B']);
    expect(names(parseBallots('1,undervoteX>[A=B]x>overvotes'))).toEqual(['undervoteX>[A=B]x>overvotes']);
    expect(names(parseBallots('1,[A=B]>_>>B'))).toEqual(['overvote>skip>skip>B']);
  });
  it('quotes around a name are removed, quotes inside are kept', () => {
    expect(names(parseBallots('1,"Smith, Jr.">Lee'))).toEqual(['Smith, Jr.>Lee']);
    expect(names(parseBallots('1,"A"B">C'))).toEqual(['A"B>C']);
  });
  it('write-in continues only when the declared list includes it', () => {
    expect(writeInContinues(WRITE_IN, [WRITE_IN, 'A'])).toBe(true);
    expect(writeInContinues(WRITE_IN, ['A'])).toBe(false);
    expect(writeInContinues(WRITE_IN)).toBe(false);
    expect(writeInContinues('A', ['A', WRITE_IN])).toBe(false);
  });
});

describe('CSV rows', () => {
  it('handles CRLF, bare CR, escaped quotes, BOM and a trailing newline', () => {
    expect(parseCsvRows('a,b\r\nc,d\r\n')).toEqual([['a', 'b'], ['c', 'd']]);
    expect(parseCsvRows('a,b\rc,d')).toEqual([['a', 'b'], ['c', 'd']]);
    expect(parseCsvRows('"a""b",c')).toEqual([['a"b', 'c']]);
    expect(parseCsvRows('\uFEFFa,"x\ny"')).toEqual([['a', 'x\ny']]);
    expect(parseCsvRows('a,\n')).toEqual([['a', '']]);
  });
  it('rejects an unterminated quote', () => { expect(() => parseCsvRows('"abc')).toThrow(); });
});

describe('rank-column CSV', () => {
  it('recognises rank, count and ignored headers', () => {
    expect(parseRankCsv('count,rank1,rank2\n2,A,B').ballots).toEqual([{ count: 2, marks: [{ kind: 'candidate', name: 'A' }, { kind: 'candidate', name: 'B' }] }]);
    expect(names(parseRankCsv('id,Rank 1,Rank 2\n7,A,B'))).toEqual(['A>B']);
    expect(names(parseRankCsv('1st choice,2nd choice\nA,B\nB,'))).toEqual(['A>B', 'B>skip']);
  });
  it('a header row that is only a header is not a ballot', () => { expect(() => parseRankCsv('rank1,rank2\n')).toThrow(/No valid ballots/); });
  it('rejects a count column value that is not a plain positive integer', () => {
    for (const bad of ['1e3', '012', '-1', '']) expect(() => parseRankCsv(`count,rank1\n${bad},A`)).toThrow(/count must be a positive integer/);
  });
  it('skips blank rows and comment-only rows', () => {
    expect(names(parseRankCsv('\n,,\n# note,,\nA,B'))).toEqual(['A>B']);
  });
  it('headerless two-column file: a leading integer is a count, two names are two ranks', () => {
    expect(parseRankCsv('3,A\n2,B').ballots.map(b => b.count)).toEqual([3, 2]);
    expect(names(parseRankCsv('A,B\nB,A'))).toEqual(['A>B', 'B>A']);
  });
  it('a purely numeric candidate in column 1 without a header is ambiguous', () => {
    expect(() => parseRankCsv('3,A,B')).toThrow(/purely numeric/);
  });
});

describe('JSON ballots', () => {
  it('accepts strings, arrays and { count, ranks | ranking }; null and "" are skipped ranks', () => {
    expect(names(parseBallotJson(['A>B', ['A', '', 'B'], { count: 2, ranks: ['B', null, 'A'] }, { count: 1, ranking: 'B>A' }]))).toEqual(['A>B', 'A>skip>B', 'B>skip>A', 'B>A']);
    expect(names(parseBallotJson('2,A>B'))).toEqual(['A>B']);
  });
  it('rejects non-string ranks, bad counts, non-object items and non-arrays', () => {
    expect(() => parseBallotJson([['A', 5]])).toThrow(/rank 2/);
    expect(() => parseBallotJson([{ count: 1, ranks: ['A', 5] }])).toThrow(/rank 2/);
    for (const count of [0, 1.5, '2', -1]) expect(() => parseBallotJson([{ count, ranks: ['A'] }])).toThrow(/count/);
    expect(() => parseBallotJson([null])).toThrow(/Ballot 1/);
    expect(() => parseBallotJson([7])).toThrow(/Ballot 1/);
    expect(() => parseBallotJson({ a: 1 })).toThrow(/must be a ranking string or an array/);
    expect(() => parseBallotJson([])).toThrow(/No valid ballots/);
  });
});
