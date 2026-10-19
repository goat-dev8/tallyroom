import { tabulateIrv } from './irv.js';
import { BundledElection } from './elections/registry.js';
import { eliminationTransfers, TransferEdge } from './transfers.js';
import { BallotGroup, InactiveReason, Round, Rules } from './types.js';

export interface RoundView {
  round: number;
  tallies: Record<string, number>;
  continuing: number;
  inactive: Record<InactiveReason, number>;
  threshold: number;
  eliminated: string[];
  tieNote?: 'previous-round' | 'lot';
  transfers: TransferEdge[];
}

export interface RoundsPayload {
  id: string;
  name: string;
  method: 'IRV';
  seats: number;
  winner: string;
  totalBallots: number;
  rounds: RoundView[];
}

/** Round records with from→to transfers attached. Shared by the rounds file and the shareable report. */
export function toRoundViews(ballots: BallotGroup[], candidates: string[], rules: Rules, rounds: Round[]): RoundView[] {
  return rounds.map((rd, i) => {
    const view: RoundView = {
      round: rd.round,
      tallies: rd.tallies,
      continuing: rd.continuing,
      inactive: rd.inactive,
      threshold: rd.threshold,
      eliminated: rd.eliminated,
      transfers: eliminationTransfers(ballots, candidates, rules, rounds, i),
    };
    if (rd.tieNote) view.tieNote = rd.tieNote;
    return view;
  });
}

/** Full round-by-round view, including from→to transfers, for one bundled election. */
export function buildRoundsPayload(e: BundledElection): RoundsPayload {
  const ballots = e.load();
  const result = tabulateIrv(ballots, e.candidates, e.rules);
  return {
    id: e.id,
    name: e.name,
    method: 'IRV',
    seats: e.seats,
    winner: result.winner,
    totalBallots: result.totalBallots,
    rounds: toRoundViews(ballots, e.candidates, { ...result.rules }, result.rounds),
  };
}
