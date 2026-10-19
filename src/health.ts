import { ENGINE_VERSION } from './api.js';
import { listElectionMetadata } from './elections/registry.js';

/** GET /api/health. Keeps ok and engineVersion, and adds status, version, and bundled election ids. */
export function healthBody() {
  return {
    ok: true as const,
    engineVersion: ENGINE_VERSION,
    status: 'ok' as const,
    version: ENGINE_VERSION,
    elections: listElectionMetadata().map(e => e.id),
  };
}
