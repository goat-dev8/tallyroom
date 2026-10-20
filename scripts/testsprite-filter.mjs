// Maps a pull request's changed paths to the TestSprite suites worth paying for.
// Prints one line per suite: "<filter> <projectId>". No line = nothing to run.
// Used by .github/workflows/testsprite-cli.yml; unit-tested in test/testsprite-filter.test.ts.
export const PROJECTS = {
  'api:': 'a7aa06b0-0721-49ff-a7aa-0181ad8586d6', // tallyroom-api (backend)
  'ui:': 'f312fcf5-741d-4116-bed4-c7ac9334859a', // tallyroom-web (frontend)
};

const SKIP = /^(docs\/.*|audit\/.*|[^/]+\.md|LICENSE|testsprite\/.*|testsprite_tests\/.*|\.testsprite\/.*|DEPLOY_LEDGER\.md)$/;
const API = /^(app\/api\/|src\/|data\/|scripts\/(precompute-rounds|copy-fixtures)\.)/;
const UI = /^(app\/(?!api\/)|components\/|public\/|lib\/|styles\/|app\/globals\.css)/;
const BOTH = /^(package(-lock)?\.json|next\.config\.|tsconfig\.json|postcss\.config\.|vercel\.json|middleware\.|\.github\/workflows\/testsprite-cli\.yml|scripts\/testsprite-filter\.mjs)/;

/** @param {string[]} files @returns {string[]} filters, in stable order ("api:" before "ui:") */
export function suitesFor(files) {
  const out = new Set();
  for (const f of files.map(s => s.trim()).filter(Boolean)) {
    if (SKIP.test(f)) continue;
    if (BOTH.test(f)) { out.add('api:'); out.add('ui:'); continue; }
    // The browser runs the same engine (src/) on the same fixtures (data/), so they gate the UI too.
    if (API.test(f)) { out.add('api:'); if (/^(src|data)\//.test(f)) out.add('ui:'); continue; }
    if (UI.test(f)) { out.add('ui:'); continue; }
    if (f.startsWith('test/') || f.startsWith('scripts/') || f.startsWith('.github/')) continue; // local-only checks
    out.add('api:'); out.add('ui:'); // unknown path: run everything rather than miss a regression
  }
  return ['api:', 'ui:'].filter(s => out.has(s));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = (await new Promise(r => { let s = ''; process.stdin.on('data', d => (s += d)); process.stdin.on('end', () => r(s)); }));
  for (const s of suitesFor(input.split('\n'))) console.log(`${s} ${PROJECTS[s]}`);
}
