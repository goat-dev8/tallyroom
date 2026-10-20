/** One mark at one rank: a candidate name, an overvote (2+ candidates at the same rank), or a skip (blank rank). */
export type Mark = { kind: 'candidate'; name: string } | { kind: 'overvote'; names?: string[] } | { kind: 'skip' };
export interface BallotGroup { count: number; marks: Mark[] }

export interface Rules {
  /** exhaust: ballot becomes inactive when an overvote is reached (Maine). skip: treat overvoted rank as blank.
   *  continuing: an overvote counts for the one continuing candidate it names, is passed over if it names none, and exhausts if it names 2+ (ChoicePlus, Burlington 2009). */
  overvote: 'exhaust' | 'skip' | 'continuing';
  /** continue: any number of blank ranks is skipped (NYC). two-exhaust: two consecutive blanks exhaust (Maine). */
  skips: 'continue' | 'two-exhaust';
  /** ignore: a repeated candidate is passed over (resets the skip run). skip: a repeated candidate counts as a skipped rank (Dominion). */
  duplicates?: 'ignore' | 'skip';
  /** Eliminate every candidate who cannot mathematically win in one round (Maine 21-A §723). */
  batch: boolean;
  /** previous-round: break elimination ties by looking back at earlier rounds, then lot order. lot: lot order only. */
  tiebreak: 'previous-round' | 'lot';
  /** Declared lot order; on a tie the candidate appearing LAST is eliminated. Defaults to declaration order. */
  lotOrder?: string[];
}
export const DEFAULT_RULES: Rules = { overvote: 'exhaust', skips: 'continue', batch: false, tiebreak: 'previous-round' };

/** blank: no candidate marked at any rank. overvote: reached an overvoted rank (exhaust rule).
 *  skips: hit two consecutive skipped ranks with a later mark still present (two-exhaust rule).
 *  undervote: ran out of candidates with at least one blank rank. exhausted: ran out with every rank marked. */
export type InactiveReason = 'blank' | 'overvote' | 'skips' | 'undervote' | 'exhausted';
export interface Round {
  round: number;
  tallies: Record<string, number>;        // continuing candidates only
  continuing: number;                     // ballots counting for a continuing candidate
  inactive: Record<InactiveReason, number>; // cumulative, never decreases
  threshold: number;
  eliminated: string[];                   // eliminated at end of this round
  tieNote?: 'previous-round' | 'lot';
  transfers?: Record<string, number>;     // votes gained this round vs previous round
}
export interface IrvResult { candidates: string[]; rules: Rules; rounds: Round[]; winner: string; totalBallots: number }
