import { ApiResult } from './api.js';
import { findElection } from './elections/registry.js';
import type { RoundsPayload } from './rounds-build.js';
import maine from '../data/rounds/maine-2018-cd2.json';
import alaska from '../data/rounds/alaska-2022.json';
import nyc from '../data/rounds/nyc-2021.json';

const PRECOMPUTED: Record<string, RoundsPayload> = {
  'maine-2018-cd2': maine as RoundsPayload,
  'alaska-2022': alaska as RoundsPayload,
  'nyc-2021': nyc as RoundsPayload,
};

/** GET /api/elections/:id/rounds — precomputed tallies, eliminations, and from→to transfers. */
export function handleElectionRounds(method: string, id: string): ApiResult {
  if (method !== 'GET') return { status: 405, headers: { Allow: 'GET' }, body: { error: 'Method not allowed' } };
  const election = findElection(id);
  if (!election) return { status: 404, body: { error: `Unknown election "${id}"` } };
  const payload = PRECOMPUTED[election.id];
  if (!payload) return { status: 404, body: { error: `Unknown election "${id}"` } };
  return { status: 200, body: structuredClone(payload) };
}
