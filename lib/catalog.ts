import type { Rules } from '../src/types';
/** Browser-safe metadata for the bundled, certified elections (mirrors src/elections/*). */
export interface CatalogEntry {
  slug: string; short: string; title: string; jurisdiction: string; year: number; method: 'IRV';
  file: string; candidates: string[]; rules: Partial<Rules>; certifiedWinner: string; source: string;
}
export const CATALOG: CatalogEntry[] = [
  {
    slug: 'maine-2018-cd2', short: 'Maine CD2', title: 'Maine 2018, U.S. House District 2', jurisdiction: 'Maine', year: 2018, method: 'IRV',
    file: '/data/maine-2018-cd2.patterns.tsv',
    candidates: ['REP Poliquin, Bruce', 'DEM Golden, Jared F.', 'Bond, Tiffany L.', 'Hoar, William R.S.'],
    rules: { overvote: 'exhaust', skips: 'two-exhaust', batch: true, tiebreak: 'lot' },
    certifiedWinner: 'DEM Golden, Jared F.',
    source: 'Maine Secretary of State, CVR spreadsheets #1–#8 (final), certified 11/26/2018',
  },
  {
    slug: 'alaska-2022-special', short: 'Alaska special', title: 'Alaska 2022, U.S. Representative special general', jurisdiction: 'Alaska', year: 2022, method: 'IRV',
    file: '/data/alaska-2022-special.patterns.tsv',
    candidates: ['Begich, Nick', 'Palin, Sarah', 'Peltola, Mary S.'],
    rules: { overvote: 'exhaust', skips: 'two-exhaust', duplicates: 'skip', batch: false, tiebreak: 'lot' },
    certifiedWinner: 'Peltola, Mary S.',
    source: 'Alaska Division of Elections, CVR export (contest 69) and RCV detailed report, official 9/2/2022',
  },
  {
    slug: 'nyc-2021-dem-mayor', short: 'NYC mayor', title: 'New York City 2021 Democratic primary, Mayor', jurisdiction: 'New York City', year: 2021, method: 'IRV',
    file: '/data/nyc-2021-dem-mayor.patterns.tsv',
    candidates: ['Eric L. Adams', 'Maya D. Wiley', 'Kathryn A. Garcia', 'Andrew Yang', 'Scott M. Stringer', 'Dianne Morales', 'Raymond J. McGuire',
      'Shaun Donovan', 'Aaron S. Foldenauer', 'Art Chang', 'Paperboy Love Prince', 'Joycelyn Taylor', 'Isaac Wright Jr.', 'Write-in'],
    rules: { overvote: 'exhaust', skips: 'continue', duplicates: 'ignore', batch: true, tiebreak: 'lot' },
    certifiedWinner: 'Eric L. Adams',
    source: 'NYC Board of Elections, PE2021 final CVR and official ranked-choice rounds, certified 7/20/2021',
  },
];
export const PALETTE = ['#F5B83D', '#7C8CFF', '#3DDC97', '#FF6B6B', '#4CC9F0', '#C77DFF', '#FF9F68', '#A3E635', '#F472B6', '#94A3B8', '#FACC15', '#2DD4BF', '#FB7185', '#818CF8'];
export const colorFor = (candidates: string[], name: string) => PALETTE[Math.max(0, candidates.indexOf(name)) % PALETTE.length];
export const fmt = (n: number) => n.toLocaleString('en-US');
export const pct = (n: number, d: number) => (d ? (100 * n / d).toFixed(1) : '0.0') + '%';
