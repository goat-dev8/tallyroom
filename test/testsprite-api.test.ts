import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { bindBaseUrl, checkBaseUrl, testName } from '../scripts/testsprite-api.mjs';

const dir = 'testsprite/backend';
const files = readdirSync(dir).filter(f => f.endsWith('.py'));
const P = 'https://tallyroom-git-fix-x-goats-projects-3f023cc9.vercel.app';

describe('backend TestSprite tests follow the PR preview', () => {
  it('every backend test is named and reads TALLYROOM_BASE_URL (no hard-coded target)', () => {
    expect(files.length).toBeGreaterThanOrEqual(20);
    const names = files.map(f => testName(readFileSync(`${dir}/${f}`, 'utf8')));
    expect(new Set(names).size).toBe(names.length);
    for (const f of files) expect(() => bindBaseUrl(readFileSync(`${dir}/${f}`, 'utf8'), P)).not.toThrow();
  });
  it('binding puts the preview URL first and is idempotent', () => {
    const code = readFileSync(`${dir}/api_health.py`, 'utf8');
    const once = bindBaseUrl(code, P), twice = bindBaseUrl(once, 'https://other.vercel.app');
    expect(once.split('\n')[1]).toBe(`import os; os.environ["TALLYROOM_BASE_URL"] = "${P}"  # tallyroom: bound base URL`);
    expect(twice.match(/bound base URL/g)).toHaveLength(1);
    expect(twice).toContain('"https://other.vercel.app"');
    expect(twice.split('\n')[0]).toBe('# api:health');
  });
  it('rejects URLs that are not a bare https origin (nothing odd reaches the Python source)', () => {
    expect(checkBaseUrl(P + '/')).toBe(P);
    for (const bad of ['http://x.vercel.app', 'https://x.vercel.app/api', 'https://x.vercel.app?a=1', 'https://u:p@x.vercel.app', 'nope', 'https://x"; import os;#.app'])
      expect(() => checkBaseUrl(bad)).toThrow();
  });
  it('refuses a test that ignores the variable', () => {
    expect(() => bindBaseUrl('# api:x\nBASE = "https://a.vercel.app"\n', P)).toThrow('does not read TALLYROOM_BASE_URL');
  });
});
