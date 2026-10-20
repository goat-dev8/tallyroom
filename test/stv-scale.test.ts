import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';

// BUG-026: exact Gregory STV on many distinct full rankings ran for minutes (production: 504 FUNCTION_INVOCATION_TIMEOUT
// after 300 s). Same generator as audit/bugs/round3/stv-scale-probe.ts.
function body(nc: number, seats: number, groups: number, skip: number) {
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < skip; i++) rnd();
  const C = Array.from({ length: nc }, (_, k) => 'C' + k);
  const lines = Array.from({ length: groups }, () => { const r = [...C].sort(() => rnd() - 0.5); return `${1 + Math.floor(rnd() * 997)},${r.join('>')}`; });
  return JSON.stringify({ ballots: lines.join('\n'), seats, quota: 'droop' });
}
const run = (b: string) => { const t = Date.now(); const r = handleTabulate('POST', b, { contentType: 'application/json' }) as { status: number; body: any }; return { ...r, ms: Date.now() - t }; };

describe('BUG-026: STV cost is bounded', () => {
  it('a count whose exact fractions explode is refused quickly with 422 STV_TOO_COMPLEX', () => {
    // After BUG-029 (one surplus per stage) this 30-candidate case stays under the bound (200 in ~0.2 s); 40 candidates
    // for 20 seats still crosses it.
    const r = run(body(40, 20, 3000, 0));
    expect(r.status).toBe(422); expect(r.body.error.code).toBe('STV_TOO_COMPLEX');
    expect(r.ms).toBeLessThan(5000);
  }, 20000);
  it('a large count that fits is still counted exactly and quickly', () => {
    const r = run(body(51, 10, 3000, 1));
    expect(r.status).toBe(200); expect(r.body.winners).toHaveLength(10);
    expect(r.ms).toBeLessThan(5000);
  }, 20000);
});
