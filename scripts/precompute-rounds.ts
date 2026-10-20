/** Writes data/rounds/<id>.json so the rounds route does not retabulate on the server. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { BUNDLED_ELECTIONS } from '../src/elections/registry.js';
import { buildRoundsPayload } from '../src/rounds-build.js';

mkdirSync('data/rounds', { recursive: true });
for (const e of BUNDLED_ELECTIONS) {
  const payload = buildRoundsPayload(e);
  const path = `data/rounds/${e.id}.json`;
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n');
  console.log(`${e.id}: ${payload.rounds.length} rounds, ${payload.totalBallots} ballots -> ${path}`);
}
