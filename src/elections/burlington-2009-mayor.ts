import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePatternTsv } from '../parse.js';
import { Rules } from '../types.js';

export const BURLINGTON_2009_MAYOR = {
  slug: 'burlington-2009-mayor',
  title: 'Burlington VT 2009, Mayor (Mar 3)',
  // Ballots: PrefLib 00005-00000002.toi, a conversion of the city's published ballot file (2009 Mayor Reports.zip,
  // burlingtonvotes.org). Certified rounds: ChoicePlus Pro 2.3.2 Round Detail Report, copy at rangevoting.org/BurlOfficialTallies.html.
  source: 'PrefLib 00005-00000002.toi (from burlingtonvotes.org ballot file) and ChoicePlus Pro Round Detail Report 3/3/2009',
  ballotsSha256: 'e229686d5c74152028974f0626172c95b08175fc3660dfd3bfccb096ebc2c1fb',
  candidates: ['Bob Kiss', 'Andy Montroll', 'James Simpson', 'Dan Smith', 'Kurt Wright', 'Write-In'],
  // ChoicePlus: simultaneous drop "when mathematically inevitable"; an overvote naming one continuing candidate counts for them.
  rules: { overvote: 'continuing', skips: 'continue', batch: true, tiebreak: 'previous-round' } satisfies Partial<Rules>,
  certified: {
    totalBallots: 8980,
    rounds: [
      { tallies: { 'Kurt Wright': 2951, 'Bob Kiss': 2585, 'Andy Montroll': 2063, 'Dan Smith': 1306, 'Write-In': 36, 'James Simpson': 35 }, exhausted: 4, eliminated: ['Dan Smith', 'James Simpson', 'Write-In'] },
      { tallies: { 'Kurt Wright': 3294, 'Bob Kiss': 2981, 'Andy Montroll': 2554 }, exhausted: 151, eliminated: ['Andy Montroll'] },
      { tallies: { 'Bob Kiss': 4313, 'Kurt Wright': 4061 }, exhausted: 606, eliminated: [] },
    ],
    winner: 'Bob Kiss',
  },
  load() {
    return parsePatternTsv(readFileSync(join(process.cwd(), 'data', 'fixtures', 'burlington-2009-mayor.patterns.tsv'), 'utf8'));
  },
};
