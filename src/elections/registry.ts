import { BallotGroup, Rules } from '../types.js';
import { ALASKA_2022_SPECIAL } from './alaska-2022-special.js';
import { MAINE_2018_CD2 } from './maine-2018-cd2.js';
import { NYC_2021_DEM_MAYOR } from './nyc-2021-dem-mayor.js';

/** Public metadata for one bundled election. `source` is the official results link. */
export interface ElectionMetadata {
  id: string;
  name: string;
  jurisdiction: string;
  year: number;
  method: 'IRV';
  seats: number;
  candidates: string[];
  ballotCount: number;
  certifiedWinner: string;
  source: string;
}

export interface BundledElection extends ElectionMetadata {
  /** Alternate ids accepted by the rounds and report routes. */
  aliases: string[];
  rules: Partial<Rules>;
  load: () => BallotGroup[];
}

/**
 * Official result pages for the three certified elections.
 * Maine: Secretary of State updated CD2 summary report (file name matches data/SHA256SUMS.maine-2018-cd2.txt).
 * Alaska: Division of Elections 2022 special general results.
 * NYC: Board of Elections election-results summary (2021 primary recap).
 */
export const BUNDLED_ELECTIONS: BundledElection[] = [
  {
    id: 'maine-2018-cd2',
    aliases: [],
    name: MAINE_2018_CD2.title,
    jurisdiction: 'Maine',
    year: 2018,
    method: 'IRV',
    seats: 1,
    candidates: MAINE_2018_CD2.candidates,
    ballotCount: MAINE_2018_CD2.certified.totalBallots,
    certifiedWinner: 'DEM Golden, Jared F.',
    source: 'https://www.maine.gov/sos/cec/elec/results/2018/updated-summary-report-CD2.xls',
    rules: MAINE_2018_CD2.rules,
    load: () => MAINE_2018_CD2.load(),
  },
  {
    id: 'alaska-2022',
    aliases: ['alaska-2022-special'],
    name: ALASKA_2022_SPECIAL.title,
    jurisdiction: 'Alaska',
    year: 2022,
    method: 'IRV',
    seats: 1,
    candidates: ALASKA_2022_SPECIAL.candidates,
    ballotCount: ALASKA_2022_SPECIAL.certified.totalBallots,
    certifiedWinner: 'Peltola, Mary S.',
    source: 'https://www.elections.alaska.gov/results/22SSPG/',
    rules: ALASKA_2022_SPECIAL.rules,
    load: () => ALASKA_2022_SPECIAL.load(),
  },
  {
    id: 'nyc-2021',
    aliases: ['nyc-2021-dem-mayor'],
    name: NYC_2021_DEM_MAYOR.title,
    jurisdiction: 'New York City',
    year: 2021,
    method: 'IRV',
    seats: 1,
    candidates: NYC_2021_DEM_MAYOR.candidates,
    // Ballots with a mark in this contest (PARITY.md). Blank contest marks are excluded, as in the official recap.
    ballotCount: 947932,
    certifiedWinner: 'Eric L. Adams',
    source: 'https://vote.nyc/page/election-results-summary',
    rules: NYC_2021_DEM_MAYOR.rules,
    load: () => NYC_2021_DEM_MAYOR.load(),
  },
];

export function listElectionMetadata(): ElectionMetadata[] {
  return BUNDLED_ELECTIONS.map(({ id, name, jurisdiction, year, method, seats, candidates, ballotCount, certifiedWinner, source }) => ({
    id, name, jurisdiction, year, method, seats, candidates, ballotCount, certifiedWinner, source,
  }));
}

export function findElection(id: string): BundledElection | undefined {
  return BUNDLED_ELECTIONS.find(e => e.id === id || e.aliases.includes(id));
}
