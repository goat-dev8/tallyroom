import { ENGINE_VERSION, ApiResult } from '../api.js';
import { fail } from '../errors.js';
import { tabulateIrv } from '../irv.js';
import { findElection } from './registry.js';

/** POST /api/elections/:id/tabulate — count a bundled election from its fixture, with no request body. */
export function handleElectionTabulate(method: string, id: string): ApiResult {
  if (method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'Method not allowed', null, { Allow: 'POST' });
  const election = findElection(id);
  if (!election) return fail(404, 'UNKNOWN_ELECTION', `Unknown election "${id}"`, { id });
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
