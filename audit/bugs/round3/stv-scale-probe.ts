/** BUG-026 probe: time multi-seat STV on random full rankings. Run: npx tsx audit/bugs/round3/stv-scale-probe.ts [onlyIndex] */
import { writeFileSync } from 'node:fs';
import { handleTabulate } from '../../../src/api.js';
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const only = process.argv[2] === undefined ? -1 : Number(process.argv[2]);
const shapes = [[12, 6, 2000, 12], [30, 15, 3000, 30], [51, 25, 3000, 51], [51, 50, 3000, 51], [51, 25, 20000, 51], [51, 10, 20000, 51], [20, 10, 50000, 20], [30, 15, 20000, 30], [40, 20, 20000, 40], [30, 14, 3000, 30], [30, 12, 3000, 30], [25, 12, 30000, 25]] as const;
shapes.forEach(([nc, seats, groups, len], i) => {
  const C = Array.from({ length: nc }, (_, k) => 'C' + k);
  const lines = Array.from({ length: groups }, () => { const r = [...C].sort(() => rnd() - 0.5).slice(0, len); return `${1 + Math.floor(rnd() * 997)},${r.join('>')}`; });
  const body = JSON.stringify({ ballots: lines.join('\n'), seats, quota: 'droop' });
  writeFileSync(`/tmp/stv-case-${i}.json`, body);
  if (only >= 0 && only !== i) return;
  const t = Date.now(); const r: any = handleTabulate('POST', body, { contentType: 'application/json' });
  const digits = r.status === 200 ? Math.max(...r.body.rounds.flatMap((x: any) => Object.values(x.exact.tallies).map((v: any) => v.split('/')[1].length))) : 0;
  console.log(`case ${i}: candidates ${nc}, seats ${seats}, ballot lines ${groups}, body ${body.length} B -> status ${r.status} ${r.body.error?.code ?? ''} rounds ${r.body.rounds?.length ?? '-'}, ${Date.now() - t} ms, response ${JSON.stringify(r.body).length} B, largest denominator ${digits} digits`);
});
