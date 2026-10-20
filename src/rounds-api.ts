import { ApiResult } from './api.js';
import { fail } from './errors.js';
import { findElection } from './elections/registry.js';
import type { RoundsPayload } from './rounds-build.js';
import maine from '../data/rounds/maine-2018-cd2.json';
import alaska from '../data/rounds/alaska-2022.json';
import nyc from '../data/rounds/nyc-2021.json';
import burlington from '../data/rounds/burlington-2009.json';

const PRECOMPUTED: Record<string, RoundsPayload> = {
  'maine-2018-cd2': maine as RoundsPayload,
  'alaska-2022': alaska as RoundsPayload,
  'nyc-2021': nyc as RoundsPayload,
  'burlington-2009': burlington as RoundsPayload,
};

/** GET /api/elections/:id/rounds — precomputed tallies, eliminations, and from→to transfers. */
export function handleElectionRounds(method: string, id: string): ApiResult {
  if (method !== 'GET') return fail(405, 'METHOD_NOT_ALLOWED', 'Method not allowed', null, { Allow: 'GET' });
  const election = findElection(id);
  if (!election) return fail(404, 'UNKNOWN_ELECTION', `Unknown election "${id}"`, { id });
  const payload = PRECOMPUTED[election.id];
  if (!payload) return fail(404, 'UNKNOWN_ELECTION', `Unknown election "${id}"`, { id });
  return { status: 200, body: structuredClone(payload) };
}
