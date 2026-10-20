import { ApiResult } from '../api.js';
import { fail } from '../errors.js';
import { listElectionMetadata } from './registry.js';

/** GET /api/elections — bundled elections and their certified metadata. */
export function handleElectionList(method: string): ApiResult {
  if (method !== 'GET') return fail(405, 'METHOD_NOT_ALLOWED', 'Method not allowed', null, { Allow: 'GET' });
  return { status: 200, body: { elections: listElectionMetadata() } };
}
