import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parsePatternTsv } from '../parse.js';
import { Rules } from '../types.js';

const N = ['Eric L. Adams', 'Maya D. Wiley', 'Kathryn A. Garcia', 'Andrew Yang', 'Scott M. Stringer', 'Dianne Morales', 'Raymond J. McGuire',
  'Shaun Donovan', 'Aaron S. Foldenauer', 'Art Chang', 'Paperboy Love Prince', 'Joycelyn Taylor', 'Isaac Wright Jr.', 'Write-in'] as const;
const row = (...v: number[]) => Object.fromEntries(v.map((x, i) => [N[i], x]));

export const NYC_2021_DEM_MAYOR = {
  slug: 'nyc-2021-dem-mayor',
  title: 'New York City 2021 Democratic primary, Mayor',
  source: 'NYC Board of Elections: PE2021_CVR_Final.zip and "Official Ranked Choice Rounds" recap, certified July 20, 2021',
  cvrSha256: 'f4becbe827da4c1002552919840fbc50040407a257817a64bf39fed652087472',
  // NYC counts write-ins as one aggregate row in round 1 ("Write-ins"), eliminated first.
  candidates: [...N],
  // Overvote exhausts at that rank; skipped ranks are passed over; duplicates ignored; batch elimination.
  rules: { overvote: 'exhaust', skips: 'continue', duplicates: 'ignore', batch: true, tiebreak: 'lot' } satisfies Partial<Rules>,
  certified: {
    // tallies per round (only continuing candidates); inactive = ballots inactive since round 1 (recap "Inactive ballots").
    rounds: [
      { tallies: row(289403, 201127, 184463, 115130, 51778, 26495, 25242, 23167, 7742, 7048, 3964, 2662, 2242, 1568), inactive: 0, eliminated: ['Write-in'] },
      { tallies: row(289603, 201193, 184571, 115301, 51850, 26534, 25272, 23189, 7758, 7064, 4007, 2683, 2254), inactive: 752, eliminated: ['Isaac Wright Jr.'] },
      { tallies: row(290055, 201518, 184669, 115502, 51951, 26645, 25418, 23314, 7819, 7093, 4060, 2780), inactive: 1207, eliminated: ['Paperboy Love Prince', 'Aaron S. Foldenauer', 'Art Chang', 'Joycelyn Taylor'] },
      { tallies: row(291806, 206013, 186731, 118008, 53599, 30157, 26361, 24042), inactive: 5314, eliminated: ['Shaun Donovan'] },
      { tallies: row(295798, 209108, 191876, 121597, 56723, 30933, 27934), inactive: 8062, eliminated: ['Raymond J. McGuire', 'Dianne Morales', 'Scott M. Stringer'] },
      { tallies: row(317092, 239174, 223634, 135686), inactive: 26445, eliminated: ['Andrew Yang'] },
      { tallies: { 'Eric L. Adams': 354657, 'Maya D. Wiley': 254728, 'Kathryn A. Garcia': 266932 }, inactive: 65714, eliminated: ['Maya D. Wiley'] },
      { tallies: { 'Eric L. Adams': 404513, 'Kathryn A. Garcia': 397316 }, inactive: 140202, eliminated: [] },
    ],
  },
  load() {
    return parsePatternTsv(readFileSync(fileURLToPath(new URL('../../data/fixtures/nyc-2021-dem-mayor.patterns.tsv', import.meta.url)), 'utf8'));
  },
};
