import { describe, it, expect } from 'vitest';
import { previewDecision, diffRange } from '../scripts/testsprite-preview.mjs';

describe('TestSprite CLI job: where tests may run', () => {
  it('a built preview runs against that preview', () => expect(previewDecision('success|Deployment has completed', 'ts-red-green')).toEqual({ run: true, url: 'https://tallyroom-git-ts-red-green-goats-projects-3f023cc9.vercel.app' }));
  for (const s of ['success|Canceled by Ignored Build Step', 'success|Ignored', '', 'pending|Building', 'failure|Build failed', 'error|x'])
    it(`"${s}" is not run and never targets production`, () => { const d = previewDecision(s, 'b'); expect(d.run).toBe(false); expect(JSON.stringify(d)).not.toContain('tallyroom-rosy'); expect(d.reason).toMatch(/^no preview, not run/); });
});
describe('TestSprite CLI job: which diff picks the suites', () => {
  const a = 'a'.repeat(40), b = 'b'.repeat(40);
  it('a push to an open PR uses only that push', () => expect(diffRange('synchronize', a, b)).toEqual({ kind: 'push', range: `${a}..${b}` }));
  it('opening or reopening uses the whole PR', () => { expect(diffRange('opened', a, b)).toEqual({ kind: 'pr' }); expect(diffRange('reopened', '', b)).toEqual({ kind: 'pr' }); });
  it('a missing or all-zero before uses the whole PR', () => { expect(diffRange('synchronize', '0'.repeat(40), b)).toEqual({ kind: 'pr' }); expect(diffRange('synchronize', undefined, b)).toEqual({ kind: 'pr' }); });
});
