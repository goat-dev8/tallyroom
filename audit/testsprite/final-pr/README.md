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
| Regress guards by CLI on the R′ preview | 02:05 | 301b2e15, ed8b2c98, f4e9d9b2, f2d67159, 220f0dfb, 1c337be7, 8110c4d0, 938169f0, 6ba281ca, 4f2ec48c, 20ab7501, cfcafa91, a233b485, 997a84ac, e0bb13d0 (bug-009..030, `regress-rp/runs.jsonl`) | **0/15 passed: all 15 failed on assertions** (the bugs are live on R′). 3.0 credits | |
| Merge blocked while red | 02:00 | PR #26 | merge box shows failing checks | `shots/rp-pr-checks.png`, `shots/rp-merge-box.png`, `shots/rp-portal-ui.png`, `shots/rp-portal-ui-hero.png`, `shots/rp-portal-api.png` |
| G′ pushed (9d01828) | 02:05 | | | |
| App UI check on G′ | 02:09 | fb723d72 | **33/34 passed · 1 failed**: `ui:hero-autoplay` now passes; `ui:rounds-table-maine` (run 1fe56bcf) failed. All the numbers matched, but the agent couldn't read Bond's R2 em dash (rendered as a span titled "Eliminated"). This is test fragility, not an app bug | |
| testsprite-cli on G′ | 02:08 | `api:` 22/22 passed; regress 15/15 passed (40b1a449, c798bdcd, 7a149137, 64365c9b, a09960b9, 569c9d6d, bb634546, ddd4677c, 10acda51, ee6f5be9, e07d7dc4, e7d10329, 96e825f5, 3c91f3ea, efecaa05) | green | |
| Gate on G′ | 02:10 | testsprite-v3-gate | red (correctly: UI 33/34) | |
| Merged | 03:00 | merge 876052f | see the table below | |
| Production | after 03:00 | `/api/health`, `/proof` | 200 | |
| Branch protection | after merge | GitHub API | requires `testsprite-v3-gate`, `testsprite-cli`, `lint + typecheck + vitest`, `playwright e2e`; admins enforced | |

## API App trigger: disabled after two internal errors
Both API App runs failed every test in about 2 s with "TestSprite hit an internal error while running this test". Each showed 0 steps and `codeVersion: null`, and the GitHub status stayed at "37 tests queued".
- 2d783a09 on PR #25
- 4e933fb3 on PR #26

These were not test results. Each appears to have been billed: the balance fell by the same 28.8 on both pushes. The api trigger was disabled at about 02:00 (`shots/api-trigger-disabled.png`); the web trigger stays active.

From G′ on, the API side runs in our `testsprite-cli` job on the PR preview:
- the `api:` suite
- the 15 `regress:bug-*` guards, failing closed unless 15/15 pass

The gate (`scripts/testsprite-gate.mjs`) requires the UI App run at N/N and a green `testsprite-cli` check on the same head.

## Fix for the `ui:rounds-table-maine` fragility (pushed after G′)
The eliminated cell now carries the plain "—" as its text, and the hover title "Eliminated" sits on the `<td>`; before, the dash was inside a span that had the title. `data-testid="cell-out"` is kept. The local Playwright check (`gp/bond-r2-emdash.spec.ts`) passed 3/3.

The full local e2e run under `next dev` showed the same dev-mode failures with and without this change: 4 with it, 7 without, including hero-hold, the reduced-motion landing test and the timing-sensitive tests. None of them touch the rounds table.

| Step | When | Check / run | Result |
|---|---|---|---|
| em-dash fix pushed (d8847a9) | 02:26 | | |
| App UI check | 02:28 | 28a96482 | **All 34 tests passed** |
| testsprite-cli | 02:27 | UI-only diff, so no API suites picked | success |
| testsprite-v3-gate | 02:28 | | success |
| lint + typecheck + vitest | 02:25 | | **failure**: an oxlint error in `scripts/testsprite-gate.mjs:65` (a comma expression), also red on G′ 9d01828. Fixed in ef08f17 |

Credits after this round: 149.2. The redo has used 73.2 (28.8 + 3.0 + 24.4 + 17.0).

## After the lint fix: one more real bug, then 34/34 and the merge
Times from the GitHub commit statuses, converted to Cairo.

| Step | When | Check / run | Result |
|---|---|---|---|
| lint fix pushed (ef08f17) | 02:32 | App UI check [adac70d0](https://www.testsprite.com/dashboard-v3/o/dd10cd84-8b8f-5d0b-87b0-254e74a42770/projects/f312fcf5-741d-4116-bed4-c7ac9334859a/execution/adac70d0-8e0a-48bb-be69-90a18639f145) | **31/34 passed · 2 failed · 1 blocked** (finished 02:35). `ui:sankey-render` failed on a real bug, BUG-041 (the Sankey label had no `·` between name and count); the other two were a restart/autoplay race in the test path and a table below the fold, both fixed in the plans or the app. Gate red; CI, Playwright and testsprite-cli green |
| fixes pushed (76e67ce) | 02:56 | App UI check [f118839c](https://www.testsprite.com/dashboard-v3/o/dd10cd84-8b8f-5d0b-87b0-254e74a42770/projects/f312fcf5-741d-4116-bed4-c7ac9334859a/execution/f118839c-f6b3-4ad0-8d2c-12275d9754e2) | **All 34 tests passed** (03:00). Gate, testsprite-cli, lint + typecheck + vitest and playwright e2e all success |
| PR #26 merged | 03:00:56 | merge commit 876052f | PR #24 was marked merged two seconds later, because its head was already in main |
