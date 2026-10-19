import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parsePatternTsv } from '../parse.js';
import { Rules } from '../types.js';

export const ALASKA_2022_SPECIAL = {
  slug: 'alaska-2022-special',
  title: 'Alaska 2022, U.S. Representative special general (Aug 16)',
  source: 'Alaska Division of Elections: CVR_Export_20220908084311.zip (contest 69) and RCV Detailed Report, official 9/2/2022',
  cvrSha256: '3d9ea12a0fa12064028057e02ad855ad63d349ccfb3b031afcdeb2eebfd1beab',
  // "Write-in" is NOT a continuing candidate: unresolved write-ins are excluded, so those marks are passed over.
  candidates: ['Begich, Nick', 'Palin, Sarah', 'Peltola, Mary S.'],
  // Report options: overvote not skipped (exhausts), "Exhausted on Two or More Ranks Skipped", single elimination.
  // A repeated candidate counts as a skipped rank (Dominion), required for exact parity.
  rules: { overvote: 'exhaust', skips: 'two-exhaust', duplicates: 'skip', batch: false, tiebreak: 'lot' } satisfies Partial<Rules>,
  certified: {
    totalBallots: 192289,
    rounds: [
      { tallies: { 'Begich, Nick': 53810, 'Palin, Sarah': 58973, 'Peltola, Mary S.': 75799 }, continuing: 188582, blanks: 3412, exhausted: 0, overvotes: 295 },
      { tallies: { 'Palin, Sarah': 86026, 'Peltola, Mary S.': 91266 }, continuing: 177292, blanks: 3412, exhausted: 11243, overvotes: 342 },
    ],
    begichTransfers: { 'Palin, Sarah': 27053, 'Peltola, Mary S.': 15467, exhausted: 11243, overvotes: 47 },
  },
  load() {
    return parsePatternTsv(readFileSync(fileURLToPath(new URL('../../data/fixtures/alaska-2022-special.patterns.tsv', import.meta.url)), 'utf8'));
  },
};
