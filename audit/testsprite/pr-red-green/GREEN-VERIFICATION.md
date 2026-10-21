# Were the 15 PR #24 green runs real? (checked 2026-10-21, no credits spent)

**Question.** Every `green/regress-bug-*.json` has `status: passed`, `stepSummary.total: 0`, an empty `trace` and `targetUrl: null`. Did TestSprite actually run the assertions, or are these greens hollow?

**Answer.** They are not hollow, but the proof is indirect.
- TestSprite ran the same stored test code as in the red runs, against the same preview alias, about 2 minutes after the fixed build went live. It finished without an assertion error.
- No TestSprite-side record shows the HTTP responses of the green runs. The code prints nothing, and TestSprite keeps no failure bundle for a passing run.

## What was checked

1. **History.** Each test's run history (`testsprite test result <test-id> --history`) is saved in `verify-2026-10-21/regress-bug-NNN-history.json`.
   - For all 15 tests, the red run and the green run carry the same `codeVersion`, so the stored code did not change between red and green.
   - Example for `regress:bug-009`: red 5f241c35 and green 679af9f0 are both v-8ac664a727ed.
2. **The stored code.** It is in each red failure bundle (`red/failure-regress-bug-NNN/code.py`).
   - All 15 files have the base URL bound to `https://tallyroom-git-ts-red-green-goats-projects-3f023cc9.vercel.app`.
   - None has a `try`/`except`.
   - Every assertion is unconditional, so a run can only pass if the request returns and every `assert` holds.
   - `targetUrl` is null on the red runs too, because these backend tests carry the URL in their code, not in a run setting.
3. **`stepSummary.total: 0` is normal for these tests.** It is 0 on the red runs as well: backend tests have no plan steps.
   - The red runs have a trace only because a failed `assert` raises. The trace shows `runner.py` calling `exec(code)` and the `AssertionError` with the preview's real response (for example, 422 CSV_FORMAT_AMBIGUOUS for BUG-009).
   - A passing run has nothing to trace.
4. **Timing.** GitHub commit statuses from Vercel (all times UTC):

| Time | Event |
|---|---|
| 21:05:16Z | b387c23 (buggy head): deployment complete |
| 21:05:48–21:07:21Z | 15 reds |
| 21:08:56Z | aea3fce (fixes merged): deployment complete |
| 21:09:22–21:10:03Z | 15 greens |
| 21:11:01Z | eed4977: "Canceled by Ignored Build Step" |

   - 6fbb0f7 and 7d3cec8 have no Vercel status at all, so no other build could have taken the alias during the green window.
   - Each green run took 1.2–2.2 s; each red took 4–7 s.
5. **Independent probe.** A box-side probe hit the same alias directly with curl.
   - The original probe script threw on BUG-010 (a `.get` on a non-JSON body) and sent an oversized body. Both are fixed.
   - Re-run on 2026-10-21 (alias still serving aea3fce): `verify-2026-10-21/preview-probe-fixed.txt`. BUG-010 now returns 413 PAYLOAD_TOO_LARGE on the preview; production still returns 200.

## What is still weak, and a re-run plan that would close it

- **The weakness.** The greens prove "no assertion failed", not "these exact responses came back".
- **The risk.** The alias can move, so a later reader cannot confirm which build answered.
- **The plan:**
  1. Bind each test to the immutable deployment URL of the fixed build, not the branch alias.
  2. Add `print(st, json.dumps(j)[:500])` before the asserts, so `apiOutput` records the response.
  3. Re-run all 15 against the fixed build.
  4. Optionally, re-run all 15 against the immutable buggy deployment too, so the red and green pairs share that code.
- **Cost:** backend runs cost 0.2 credits each (measured).
  - Green only: 15 × 0.2 = 3.0 credits.
  - Red and green: 30 × 0.2 = 6.0 credits.
- **Balance:** `testsprite auth status` reported `credits: 251.2` on 2026-10-21. Nothing was run, as ordered.
- **Needed first:** the immutable deployment URLs. The Vercel connection on this box has no access to the `goats-projects-3f023cc9` team, and GitHub has no deployment records for these commits, so the URLs have to come from the Vercel dashboard.
