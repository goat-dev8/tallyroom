// Decides where the TestSprite CLI job may run, from the Vercel commit status of the PR head.
// Used by .github/workflows/testsprite-cli.yml; unit-tested in test/testsprite-preview.test.ts.
// Rule: tests only ever run against THIS commit's own preview. A skipped (ignoreCommand), missing or failed preview
// means "no preview, not run". It never falls back to production, whose code can differ from the PR head
// (PR #24, eed4977: the fallback ran 22 tests on production and reported 2 false failures).

/** @param {string} status "state|description" of the Vercel status, or "" when absent @param {string} branch */
export function previewDecision(status, branch) {
  const [state = '', desc = ''] = String(status ?? '').split('|');
  if (state === 'success' && /Ignored|Canceled/.test(desc)) return { run: false, reason: `no preview, not run (Vercel skipped the build: ${desc})` };
  if (state === 'success') {
    const slug = branch.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return { run: true, url: `https://tallyroom-git-${slug}-goats-projects-3f023cc9.vercel.app` };
  }
  if (state === 'pending') return { run: false, reason: 'no preview, not run (the Vercel build did not finish in time)' };
  if (state === 'failure' || state === 'error') return { run: false, reason: `no preview, not run (Vercel build ${state}: ${desc})`, buildFailed: true };
  return { run: false, reason: 'no preview, not run (no Vercel status on this commit)' };
}

/** The diff the job picks suites from: the latest push (before..head) when GitHub gives a usable `before`, else the whole PR. */
export function diffRange(event, before, head) {
  if (event === 'synchronize' && /^[0-9a-f]{40}$/.test(before ?? '') && !/^0+$/.test(before)) return { kind: 'push', range: `${before}..${head}` };
  return { kind: 'pr' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...a] = process.argv.slice(2);
  const out = cmd === 'preview' ? previewDecision(a[0] ?? '', a[1] ?? '') : diffRange(a[0], a[1], a[2]);
  console.log(JSON.stringify(out));
}
