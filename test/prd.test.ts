import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// docs/PRD.md maps every requirement to tests. This keeps the map honest: each named file must exist.
const root = join(__dirname, '..');
const prd = readFileSync(join(root, 'docs/PRD.md'), 'utf8');
const rows = prd.split('\n').filter(l => /^\| R\d+ \|/.test(l));
const where = (f: string) => [f, `test/${f}`, `tests/e2e/${f}`, `testsprite/backend/${f}`, `testsprite/frontend/${f}`].find(p => existsSync(join(root, p)));

describe('PRD requirement map', () => {
  it('lists R1..R23 once each, in order', () => {
    expect(rows.map(r => r.split('|')[1].trim())).toEqual(Array.from({ length: 23 }, (_, i) => `R${i + 1}`));
  });
  it.each(rows.map(r => [r.split('|')[1].trim(), r]))('%s: every referenced file exists and at least one check is named', (_id, row) => {
    const files = [...(row as string).matchAll(/`([^`]+\.(?:ts|py|json|yml|txt))`/g)].map(m => m[1]);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(where(f), f).toBeDefined();
  });
});
