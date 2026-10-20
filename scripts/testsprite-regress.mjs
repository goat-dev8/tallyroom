// Ledger regression guards (testsprite/regress/*.py, TestSprite names "regress:bug-NNN"), one per ledger bug that
// reproduced on production. They assert the correct behaviour, so they fail on a build that still has the bug.
// Usage: node scripts/testsprite-regress.mjs --base <url> [--out <dir>]
//   Binds <url> into each stored test's code (free), then runs every guard once (backend run, billed per test) and
//   writes one JSON line per test (bug, test id, run id, status) to <out>/runs.jsonl.
// Kept out of the `api:` suite on purpose, so testsprite-cli.yml doesn't pay for them on every PR.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const API_PROJECT = 'a7aa06b0-0721-49ff-a7aa-0181ad8586d6';
const MARK = '# tallyroom: bound base URL';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const base = (arg('--base', '') || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/.test(base)) { console.error('--base must be an https origin'); process.exit(2); }
const out = arg('--out', 'reports/regress'); mkdirSync(out, { recursive: true });
const bin = process.env.TESTSPRITE_BIN ?? 'testsprite';
const pre = (process.env.TESTSPRITE_ARGS ?? '').split(' ').filter(Boolean);
const ts = (...a) => { try { return execFileSync(bin, [...pre, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }); } catch (e) { return e.stdout?.toString() ?? ''; } };
const stored = new Map(JSON.parse(ts('--output', 'json', 'test', 'list', '--project', API_PROJECT)).items.map(t => [t.name, t.id]));
const dir = 'testsprite/regress'; const tmp = `/tmp/ts-regress-${process.pid}.py`;
for (const f of readdirSync(dir).filter(f => f.endsWith('.py')).sort()) {
  const code = readFileSync(join(dir, f), 'utf8'); const name = /^#\s*(regress:[a-z0-9-]+)/.exec(code)?.[1];
  const id = name && stored.get(name); if (!id) { console.error(`no stored test for ${f}`); process.exit(1); }
  const lines = code.split('\n').filter(l => !l.endsWith(MARK));
  lines.splice(1, 0, `import os; os.environ["TALLYROOM_BASE_URL"] = "${base}"  ${MARK}`);
  writeFileSync(tmp, lines.join('\n'));
  ts('test', 'code', 'put', id, '--code-file', tmp, '--force');
  const r = JSON.parse(ts('--output', 'json', 'test', 'run', id, '--wait', '--timeout', '600') || '{}');
  const run = r.runs?.[0] ?? r.run ?? r;
  const row = { name, testId: id, runId: run.runId ?? run.id, status: run.status, failureKind: run.failureKind ?? null, base };
  appendFileSync(join(out, 'runs.jsonl'), JSON.stringify(row) + '\n'); console.log(JSON.stringify(row));
  writeFileSync(join(out, `${name.replace(':', '-')}.json`), JSON.stringify(r, null, 1));
}
