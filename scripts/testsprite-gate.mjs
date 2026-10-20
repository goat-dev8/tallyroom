// Fail-closed TestSprite V3 gate. The UI and API app runs both post the "TestSprite V3" context, and the newest one hides
// the other on the PR, so read every status and split them by the project id in target_url.
export const PROJECTS = { ui: 'f312fcf5-741d-4116-bed4-c7ac9334859a', api: 'a7aa06b0-0721-49ff-a7aa-0181ad8586d6' };

/** Parse a status description. Returns {passed,total,failed,blocked} or null when it carries no count. */
export function parseCounts(desc) {
  const d = String(desc ?? '');
  let m = d.match(/^\s*All\s+(\d+)\s+tests?\s+passed\b/i);
  if (m) return { passed: +m[1], total: +m[1], failed: 0, blocked: 0 };
  m = d.match(/^\s*(\d+)\s*(?:\/|of)\s*(\d+)\s+passed\b/i);
  if (!m) return null;
  const f = d.match(/(\d+)\s+failed/i), b = d.match(/(\d+)\s+blocked/i);
  return { passed: +m[1], total: +m[2], failed: f ? +f[1] : 0, blocked: b ? +b[1] : 0 };
}

/** statuses: GitHub /commits/{sha}/statuses (newest first). Returns the newest V3 status for each project. */
export function latestByProject(statuses) {
  const out = {};
  for (const s of statuses) {
    if (s.context !== 'TestSprite V3') continue;
    for (const [k, id] of Object.entries(PROJECTS)) if (String(s.target_url ?? '').includes(`/projects/${id}/`) && !out[k]) out[k] = s;
  }
  return out;
}

/** Verdict for one project: {ok, final, msg}. final=false means still pending (keep waiting). */
export function judge(s, previewSkipped = false) {
  if (!s) return { ok: false, final: false, msg: 'no status yet' };
  if (s.state === 'pending') return { ok: false, final: false, msg: `pending: ${s.description}` };
  const c = parseCounts(s.description);
  if (!c) return { ok: false, final: true, msg: `can't read a pass count from '${s.description}' (state ${s.state})` };
  if (c.total === 0) return { ok: false, final: true, msg: `ran 0 tests: ${s.description}` };
  if (c.passed === c.total) return { ok: true, final: true, msg: s.description };
  if (c.failed > 0 || c.passed + c.blocked !== c.total) return { ok: false, final: true, msg: `${c.passed} of ${c.total} passed: ${s.description}` };
  return previewSkipped ? { ok: true, final: true, msg: `${c.blocked} blocked, preview skipped by ignoreCommand` }
    : { ok: false, final: true, msg: `${c.blocked} blocked on a built preview: ${s.description}` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { execFileSync } = await import('node:child_process');
  const { appendFileSync } = await import('node:fs');
  const repo = process.env.GITHUB_REPOSITORY, sha = process.env.SHA, need = (process.env.NEED ?? 'ui,api').split(',');
  const get = () => JSON.parse(execFileSync('gh', ['api', '--paginate', `repos/${repo}/commits/${sha}/statuses?per_page=100`]).toString());
  let res = {};
  for (let i = 0; i < 330; i++) {
    const all = get(); const by = latestByProject(all);
    const v = all.find(s => s.context === 'Vercel'); const skipped = !!v && v.state === 'success' && /Ignored|Canceled/.test(v.description ?? '');
    res = Object.fromEntries(need.map(k => [k, { ...judge(by[k], skipped), url: by[k]?.target_url }]));
    if (need.every(k => res[k].final)) break;
    await new Promise(r => setTimeout(r, 10000));
  }
  const lines = need.map(k => `- ${k}: ${res[k].ok ? 'pass' : 'FAIL'}: ${res[k].msg} ${res[k].url ?? ''}`);
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### TestSprite V3 gate\n\nHead: \`${sha}\`\n\n${lines.join('\n')}\n`);
  const bad = need.filter(k => !res[k].ok);
  if (bad.length) { console.log(`::error::TestSprite V3 gate failed for: ${bad.join(', ')}`); process.exit(1); }
}
