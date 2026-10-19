import { ApiResult } from '../api.js';
import { listElectionMetadata } from './registry.js';

/** GET /api/elections — bundled elections and their certified metadata. */
export function handleElectionList(method: string): ApiResult {
  if (method !== 'GET') return { status: 405, headers: { Allow: 'GET' }, body: { error: 'Method not allowed' } };
  return { status: 200, body: { elections: listElectionMetadata() } };
}
