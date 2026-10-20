import { describe, it, expect } from 'vitest';
// @ts-ignore
import { parseCounts, latestByProject, judge, PROJECTS } from '../scripts/testsprite-gate.mjs';
const u = (p: string, e = 'x') => `https://www.testsprite.com/dashboard-v3/o/o/projects/${p}/execution/${e}`;
describe('testsprite gate', () => {
  it('parses both formats', () => {
    expect(parseCounts('All 34 tests passed')).toEqual({ passed: 34, total: 34, failed: 0, blocked: 0 });
    expect(parseCounts('33/34 passed · 1 failed')).toEqual({ passed: 33, total: 34, failed: 1, blocked: 0 });
    expect(parseCounts('0 of 37 passed · 37 failed')?.failed).toBe(37);
    expect(parseCounts('37 tests queued')).toBeNull();
  });
  it('splits UI and API by project, newest first', () => {
    const s = [
      { context: 'TestSprite V3', state: 'success', description: 'All 34 tests passed', target_url: u(PROJECTS.ui, 'b') },
      { context: 'TestSprite V3', state: 'pending', description: '37 tests queued', target_url: u(PROJECTS.api) },
      { context: 'TestSprite V3', state: 'pending', description: '34 tests queued', target_url: u(PROJECTS.ui, 'a') },
    ];
    const by: any = latestByProject(s);
    expect(by.ui.description).toBe('All 34 tests passed');
    expect(judge(by.ui)).toMatchObject({ ok: true, final: true });
    expect(judge(by.api)).toMatchObject({ ok: false, final: false });
  });
  it('fails closed', () => {
    expect(judge({ state: 'success', description: '33/34 passed · 1 failed' }).ok).toBe(false);
    expect(judge({ state: 'failure', description: 'internal error' })).toMatchObject({ ok: false, final: true });
    expect(judge({ state: 'success', description: '0/0 passed' }).ok).toBe(false);
    expect(judge({ state: 'success', description: '32/34 passed · 2 blocked' }).ok).toBe(false);
    expect(judge({ state: 'success', description: '32/34 passed · 2 blocked' }, true).ok).toBe(true);
    expect(judge(undefined).final).toBe(false);
  });
});
