import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('..', import.meta.url).pathname;
describe('field-level parity against official round tables', () => {
  it('source files match their recorded SHA-256 sums', () => {
    for (const dir of ['audit/parity/sources/', 'audit/parity/sources/scotland/'])
      for (const line of readFileSync(root + dir + 'SHA256SUMS.txt', 'utf8').trim().split('\n')) {
        const [sum, file] = line.split(/\s+/);
        expect(createHash('sha256').update(readFileSync(root + dir + file)).digest('hex'), file).toBe(sum);
      }
  });
  it('differs from the official tables only in the Burlington threshold', () => {
    const p = spawnSync('npx', ['tsx', 'scripts/parity-fields.ts'], { cwd: root, encoding: 'utf8' });
    const bad = p.stdout.split('\n').filter((l) => l.includes('MISMATCH'));
    expect(bad).toEqual(['| - | winning threshold | 4491 | 4489 | **MISMATCH** |']);
    expect(p.stdout).toContain('TOTAL: 4344/4345 fields match; 33/34 elections match on every compared field.');
    expect(p.stdout).toContain('Scottish wards with exact fractions instead of rule 48(3) (not in the totals): 2247/4082 fields match at 5 dp');
    expect(p.stdout).toContain('non-numeric mismatches (stages, actions, elected): 0.');
  }, 120000);
});
