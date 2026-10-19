import { describe, it, expect } from 'vitest';
import { suitesFor, PROJECTS } from '../scripts/testsprite-filter.mjs';

describe('TestSprite suite selection from changed paths', () => {
  it('API route changes run only the api: suite', () => {
    expect(suitesFor(['app/api/tabulate/route.ts', 'app/api/health/route.ts'])).toEqual(['api:']);
  });
  it('UI changes run only the ui: suite', () => {
    expect(suitesFor(['components/sankey.tsx', 'app/app/page.tsx', 'app/globals.css'])).toEqual(['ui:']);
  });
  it('engine and fixtures gate both suites (the browser runs the same engine)', () => {
    expect(suitesFor(['src/stv.ts'])).toEqual(['api:', 'ui:']);
    expect(suitesFor(['data/fixtures/maine-2018-cd2.patterns.tsv'])).toEqual(['api:', 'ui:']);
  });
  it('build config runs everything', () => {
    expect(suitesFor(['package.json'])).toEqual(['api:', 'ui:']);
    expect(suitesFor(['next.config.ts'])).toEqual(['api:', 'ui:']);
  });
  it('docs, ledger and test-plan changes run nothing (no credits spent)', () => {
    expect(suitesFor(['README.md', 'DEPLOY_LEDGER.md', 'docs/x.md', 'testsprite/frontend/ui-nav-cta.json', ''])).toEqual([]);
  });
  it('local unit tests alone run nothing', () => {
    expect(suitesFor(['test/stv.test.ts'])).toEqual([]);
  });
  it('an unknown top-level path runs everything rather than miss a regression', () => {
    expect(suitesFor(['middleware/edge.ts', 'weird/file.txt'])).toEqual(['api:', 'ui:']);
  });
  it('maps each suite to its TestSprite project', () => {
    expect(PROJECTS['api:']).toBe('a7aa06b0-0721-49ff-a7aa-0181ad8586d6');
    expect(PROJECTS['ui:']).toBe('f312fcf5-741d-4116-bed4-c7ac9334859a');
  });
});
