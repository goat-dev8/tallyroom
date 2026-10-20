# Final PR: TestSprite App check, red first and then green (running record)

Times are Cairo (UTC+3). Branch `s4-final`, cut from main at 98d523f.
- **Commit R′:** regression tests, the fail-closed gate (reads the UI and API runs separately), the CLI workflow fix, the strengthened `ui:hero-autoplay` plan and docs. There are no app fixes, so the preview still has BUG-008 and the 15 API bugs.
- **Commit G′:** the fix stack from ts-red-green through a1c10ee.

## PR #25 (first attempt): no usable result, so it doesn't count

PR #25 (branch `s4-red-green`, head a035369, pushed 01:09) was closed as superseded. Neither App run gave a real result:

- **UI run f6aad0ed: 34/34 passed. This is a weak test, not a real green.**
  - All 34 test runs targeted the PR preview `https://tallyroom-git-s4-red-green-goats-projects-3f023cc9.vercel.app`. The CLI shows this per run (`targetUrl`, and the first step navigates there).
  - The portal page lists the project's default URL (production), but the runs did not go there.
  - BUG-008 was live on that preview. A local Playwright check sampled `demo-round` every 2 s for 12 s after round 2 and saw `Round 1 / 2` again on 3/3 runs (`pr25/local-R-*.txt`).
  - The old plan waited for "Round 2 / 2" once and then asserted. In the loop, round 2 is on screen 4.2 s of every 7 s, so that plan usually passes even with the bug.
  - The exported test code (v29.0) only checked that the container contains "Golden, Jared F.", which is true in every round.
- **API run 2d783a09: 0/37. Infrastructure error, not reds.**
  - Every test failed in about 1.4 s with "TestSprite hit an internal error while running this test".
  - Each run shows `stepSummary.total: 0`, `codeVersion: null` and `failureKind: unknown`.
  - Its GitHub status stayed at "37 tests queued".
- **Credits.** The balance went from 251.2 to 222.4, which is 28.8 spent. That is consistent with UI 34 × 0.5 = 17, API 37 × 0.2 = 7.4, and the `testsprite-cli` `api:` runs on the preview, which passed. So the errored API run appears to have been charged. This is inferred from the balance only.
- **The old gate failed for its own reason.** It couldn't parse "All 34 tests passed", and since both runs share the "TestSprite V3" context, the newer UI status hid the API one. Fixed in `scripts/testsprite-gate.mjs` (vitest `test/testsprite-gate.test.ts`).

### Strengthened `ui:hero-autoplay`
The new plan (`testsprite/frontend/ui-hero-autoplay.json`):
1. Waits for round 2.
2. Reads `demo-round` 6 times, 2 s apart.
3. Requires every reading to be `Round 2 / 2`.

The local Playwright mirror (`pr25/hero-autoplay-strengthened.spec.ts`) failed 3/3 on the R preview and passed 3/3 on G (local `next dev`). The plan was stored with `test plan put` at 01:34 (free). Run history and balance were unchanged, so no run was triggered.

### Screenshots (`shots/`)
| File | What |
|---|---|
| `r-pr-checks.png` | PR #25 checks (UI "All 34 tests passed", gate red because it couldn't parse the text) |
| `r-merge-box.png` | PR #25 merge box |
| `r-portal-ui.png` | portal run f6aad0ed (shows the project default URL; the runs hit the preview) |
| `r-portal-api.png` | portal run 2d783a09 (internal error) |
| `trigger-*-before/after.png` | web and api PR triggers: pattern `https://tallyroom-git-{branch-slug}-goats-projects-3f023cc9.vercel.app`, event "Commit status · Vercel" (unchanged) |

## This PR
| Step | When | Check / run | Result | Screenshot |
|---|---|---|---|---|
| R′ pushed (e91c92e), PR #26 opened; #25 closed as superseded | 01:36 | | | |
| App UI check on R′ | 01:46 | [e34f1719](https://www.testsprite.com/dashboard-v3/o/dd10cd84-8b8f-5d0b-87b0-254e74a42770/projects/f312fcf5-741d-4116-bed4-c7ac9334859a/execution/e34f1719-cc5a-4eaf-a7ed-5f66b84b58f1), `ui:hero-autoplay` run 9c41c8b2 on the s4-final preview | **33/34 passed · 1 failed**: the replay showed `Round 1 / 2` again after round 2 (BUG-008) | |
| App API check on R′ | 01:37 | 4e933fb3 | **internal error again**: all 37 failed in about 2.6 s, 0 steps, status stuck at '37 tests queued'. Not reds. Balance 222.4 → 193.6 (28.8) | |
| Merge blocked while red | _pending_ | | | |
| G′ pushed | _pending_ | | expected 34/34 and 37/37 | |
| Merged | _pending_ | | | |
| Production | _pending_ | `/api/health`, `/proof` | 4 elections, 200 | |
| Branch protection | _pending_ | | gate required, admins enforced | |
