import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('..', import.meta.url).pathname;
describe('field-level parity against official round tables', () => {
  it('source files match their recorded SHA-256 sums', () => {
    for (const line of readFileSync(root + 'audit/parity/sources/SHA256SUMS.txt', 'utf8').trim().split('\n')) {
      const [sum, file] = line.split(/\s+/);
      expect(createHash('sha256').update(readFileSync(root + 'audit/parity/sources/' + file)).digest('hex'), file).toBe(sum);
    }
  });
  it('differs from the official tables only in the Burlington threshold', () => {
    const p = spawnSync('npx', ['tsx', 'scripts/parity-fields.ts'], { cwd: root, encoding: 'utf8' });
    const bad = p.stdout.split('\n').filter((l) => l.includes('MISMATCH'));
    expect(bad).toEqual(['| - | winning threshold | 4491 | 4489 | **MISMATCH** |']);
    expect(p.stdout).toContain('TOTAL: 262/263 fields match; 3/4 elections match on every compared field.');
  }, 120000);
});
