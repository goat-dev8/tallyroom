// Runs the backend TestSprite suite against ONE preview URL.
// TestSprite backend tests run the code stored with each test and get no target URL, so a hard-coded base
// always tests the same old deployment. This script binds the URL into the stored code first:
//   1. reads testsprite/backend/*.py (first line "# api:<name>" is the TestSprite test name),
//   2. prepends `os.environ["TALLYROOM_BASE_URL"] = "<url>"` (every test reads BASE from that variable),
//   3. creates or updates the test in the tallyroom-api project (free), then
//   4. runs `testsprite ci run --filter api:` once (paid: 0.5 credit/test) with a JUnit report.
// Usage: node scripts/testsprite-api.mjs --base https://<preview> [--filter api:] [--junit file] [--bind-only]
// CI must serialize callers (one concurrency group), because the stored code is shared between PRs.
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export const API_PROJECT = 'a7aa06b0-0721-49ff-a7aa-0181ad8586d6';
const MARK = '# tallyroom: bound base URL';

/** Validate a deployment URL: https only, no path/query/credentials, so it can be pasted into Python safely. */
export function checkBaseUrl(raw) {
  let u; try { u = new URL(raw); } catch { throw new Error(`not a URL: ${raw}`); }
  if (u.protocol !== 'https:') throw new Error('base URL must be https');
  if (u.username || u.password || u.search || u.hash || (u.pathname !== '/' && u.pathname !== '')) throw new Error('base URL must be an origin like https://host');
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(u.host)) throw new Error(`unexpected host: ${u.host}`);
  return `https://${u.host}`;
}

/** Name from the first line, e.g. "# api:health" -> "api:health". */
export function testName(code) {
  const m = /^#\s*(api:[a-z0-9:-]+)\s*$/m.exec(code.split('\n', 1)[0]);
  if (!m) throw new Error('first line must be "# api:<name>"');
  return m[1];
}

/** Bind the base URL into a test's code. Idempotent: an earlier binding is replaced, never stacked. */
export function bindBaseUrl(code, base) {
  const url = checkBaseUrl(base);
  if (!/os\.environ(\.get)?\(\s*["']TALLYROOM_BASE_URL["']|os\.environ\[\s*["']TALLYROOM_BASE_URL["']\]/.test(code))
    throw new Error(`${testName(code)} does not read TALLYROOM_BASE_URL`);
  const lines = code.split('\n').filter(l => !l.endsWith(MARK));
  lines.splice(1, 0, `import os; os.environ["TALLYROOM_BASE_URL"] = "${url}"  ${MARK}`);
  return lines.join('\n');
}

function arg(name, dflt) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; }

async function main() {
  const bin = process.env.TESTSPRITE_BIN ?? 'testsprite';
  const pre = (process.env.TESTSPRITE_ARGS ?? '').split(' ').filter(Boolean);
  const ts = (...a) => execFileSync(bin, [...pre, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const base = checkBaseUrl(arg('--base', process.env.TALLYROOM_BASE_URL ?? ''));
  const dir = 'testsprite/backend';
  const existing = new Map(JSON.parse(ts('--output', 'json', 'test', 'list', '--project', API_PROJECT)).items.map(t => [t.name, t.id]));
  const tmp = `/tmp/ts-bound-${process.pid}.py`;
  const { writeFileSync } = await import('node:fs');
  for (const f of readdirSync(dir).filter(f => f.endsWith('.py')).sort()) {
    const code = readFileSync(join(dir, f), 'utf8'); const name = testName(code);
    writeFileSync(tmp, bindBaseUrl(code, base));
    const id = existing.get(name);
    if (id) ts('test', 'code', 'put', id, '--code-file', tmp, '--force');
    else ts('test', 'create', '--project', API_PROJECT, '--type', 'backend', '--name', name, '--code-file', tmp);
    console.log(`${id ? 'bound ' : 'created'} ${name} -> ${base}`);
  }
  if (process.argv.includes('--bind-only')) return;
  const junit = arg('--junit', 'testsprite-api.xml');
  execFileSync(bin, [...pre, 'ci', 'run', '--project', API_PROJECT, '--env', 'default', '--filter', arg('--filter', 'api:'),
    '--fail-on-skipped', '--report', 'junit', '--report-file', junit, '--report-suite-name', 'testsprite:api',
    '--summary-file', junit.replace(/\.xml$/, '.json')], { stdio: 'inherit' });
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e.message); process.exit(1); });
