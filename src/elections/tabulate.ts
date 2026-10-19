import { ENGINE_VERSION, ApiResult } from '../api.js';
import { tabulateIrv } from '../irv.js';
import { findElection } from './registry.js';

/** POST /api/elections/:id/tabulate — count a bundled election from its fixture, with no request body. */
export function handleElectionTabulate(method: string, id: string): ApiResult {
  if (method !== 'POST') return { status: 405, headers: { Allow: 'POST' }, body: { error: 'Method not allowed' } };
  const election = findElection(id);
  if (!election) return { status: 404, body: { error: `Unknown election "${id}"` } };
  const result = tabulateIrv(election.load(), election.candidates, election.rules);
  return {
    status: 200,
    body: {
      engineVersion: ENGINE_VERSION,
      method: 'irv',
      id: election.id,
      certifiedWinner: election.certifiedWinner,
      ...result,
    },
  };
}
