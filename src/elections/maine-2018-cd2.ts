import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePatternTsv } from '../parse.js';
import { Rules } from '../types.js';

export const MAINE_2018_CD2 = {
  slug: 'maine-2018-cd2',
  title: 'Maine 2018, U.S. House District 2 (general)',
  source: 'Maine Secretary of State, 2018 election results: CVR spreadsheets #1–#8 (FINAL); certified 11/26/2018',
  candidates: ['REP Poliquin, Bruce', 'DEM Golden, Jared F.', 'Bond, Tiffany L.', 'Hoar, William R.S.'],
  // Maine rules: overvote exhausts, two consecutive skipped ranks exhaust, batch elimination.
  rules: { overvote: 'exhaust', skips: 'two-exhaust', batch: true, tiebreak: 'lot' } satisfies Partial<Rules>,
  certified: {
    totalBallots: 296077,
    round1: { 'REP Poliquin, Bruce': 134184, 'DEM Golden, Jared F.': 132013, 'Bond, Tiffany L.': 16552, 'Hoar, William R.S.': 6875 },
    final: { 'DEM Golden, Jared F.': 142440, 'REP Poliquin, Bruce': 138931 },
    rounds: 2,
  },
  load() {
    const p = join(process.cwd(), 'data', 'fixtures', 'maine-2018-cd2.patterns.tsv');
    return parsePatternTsv(readFileSync(p, 'utf8'));
  },
};
