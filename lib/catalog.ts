import type { Rules } from '../src/types';
/** Browser-safe metadata for the bundled, certified elections (mirrors src/elections/*). */
export interface CatalogEntry {
  slug: string; short: string; title: string; jurisdiction: string; year: number; method: 'IRV';
  file: string; bytes: number; candidates: string[]; rules: Partial<Rules>; certifiedWinner: string; source: string;
}
export const CATALOG: CatalogEntry[] = [
  {
    slug: 'maine-2018-cd2', short: 'Maine CD2', title: 'Maine 2018, U.S. House District 2', jurisdiction: 'Maine', year: 2018, method: 'IRV',
    file: '/data/maine-2018-cd2.patterns.tsv', bytes: 133106,
    candidates: ['REP Poliquin, Bruce', 'DEM Golden, Jared F.', 'Bond, Tiffany L.', 'Hoar, William R.S.'],
    rules: { overvote: 'exhaust', skips: 'two-exhaust', batch: true, tiebreak: 'lot' },
    certifiedWinner: 'DEM Golden, Jared F.',
    source: 'Maine Secretary of State, CVR spreadsheets #1–#8 (final), certified 11/26/2018',
  },
  {
    slug: 'alaska-2022-special', short: 'Alaska special', title: 'Alaska 2022, U.S. Representative special general', jurisdiction: 'Alaska', year: 2022, method: 'IRV',
    file: '/data/alaska-2022-special.patterns.tsv', bytes: 28628,
    candidates: ['Begich, Nick', 'Palin, Sarah', 'Peltola, Mary S.'],
    rules: { overvote: 'exhaust', skips: 'two-exhaust', duplicates: 'skip', batch: false, tiebreak: 'lot' },
    certifiedWinner: 'Peltola, Mary S.',
    source: 'Alaska Division of Elections, CVR export (contest 69) and RCV detailed report, official 9/2/2022',
  },
  {
    slug: 'nyc-2021-dem-mayor', short: 'NYC mayor', title: 'New York City 2021 Democratic primary, Mayor', jurisdiction: 'New York City', year: 2021, method: 'IRV',
    file: '/data/nyc-2021-dem-mayor.patterns.tsv', bytes: 6024345,
    candidates: ['Eric L. Adams', 'Maya D. Wiley', 'Kathryn A. Garcia', 'Andrew Yang', 'Scott M. Stringer', 'Dianne Morales', 'Raymond J. McGuire',
      'Shaun Donovan', 'Aaron S. Foldenauer', 'Art Chang', 'Paperboy Love Prince', 'Joycelyn Taylor', 'Isaac Wright Jr.', 'Write-in'],
    rules: { overvote: 'exhaust', skips: 'continue', duplicates: 'ignore', batch: true, tiebreak: 'lot' },
    certifiedWinner: 'Eric L. Adams',
    source: 'NYC Board of Elections, PE2021 final CVR and official ranked-choice rounds, certified 7/20/2021',
  },
];
/** Certified figures shown on the landing; e2e tests assert the live engine reproduces each one. */
export const CERTIFIED: Record<string, { rounds: number; ballots: number; final: [string, number][]; continuing: number }> = {
  'maine-2018-cd2': { rounds: 2, ballots: 296077, final: [['Golden', 142440], ['Poliquin', 138931]], continuing: 281371 },
  'alaska-2022-special': { rounds: 2, ballots: 192289, final: [['Peltola', 91266], ['Palin', 86026]], continuing: 177292 },
  'nyc-2021-dem-mayor': { rounds: 8, ballots: 947932, final: [['Adams', 404513], ['Garcia', 397316]], continuing: 801829 },
};
// Candidate colours: 14 distinct hues chosen to stay clear of the brand accents (amber = majority/focus, green = verified, iris = transfers).
export const PALETTE = ['#4CC9F0', '#C084FC', '#FF8A5B', '#2DD4BF', '#F472B6', '#A3E635', '#60A5FA', '#E879F9', '#94A3B8', '#D6C6A5', '#F87171', '#A5F3FC', '#FDBA74', '#9F7AEA'];
export const colorFor = (candidates: string[], name: string) => PALETTE[Math.max(0, candidates.indexOf(name)) % PALETTE.length];
export const fmt = (n: number) => n.toLocaleString('en-US');
export const pct = (n: number, d: number) => (d ? (100 * n / d).toFixed(1) : '0.0') + '%';
