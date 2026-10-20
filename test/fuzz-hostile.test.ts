import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkHostile } from '../fuzz/hostile.js';

// Frozen hostile corpus: `python3 fuzz/hostile.py 2026 120`. These are the shapes of bugs that were already fixed
// (BUG-002..004, BUG-009..011), with expectations from fuzz/oracle.py. One test; the failure message lists every
// case that disagrees.
const cases = readFileSync(new URL('./fuzz/hostile-2026.jsonl', import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

describe('hostile inputs (shapes of past bugs)', () => {
  it('all 120 frozen cases match their expectation, and every shape is present', () => {
    expect(cases.length).toBe(120);
    for (const s of ['reserved', 'unicode', 'big-safe', 'big-over', 'header-only', 'comments', 'json-as-csv', 'crlf-bom', 'bytes-over', 'bytes-under', 'tsv-endings'])
      expect(cases.some(c => c.shape === s), s).toBe(true);
    const bad = cases.map(c => ({ id: c.id, shape: c.shape, got: checkHostile(c) })).filter(x => x.got);
    expect(bad).toEqual([]);
  });
});
