# Deploy ledger

Vercel Hobby allows about 100 deployments per rolling 24 h. Our own cap is **80 per 24 h** (20 kept in reserve for hotfixes).
Every push that builds a preview costs one deploy, and also re-runs the full TestSprite suite (0.5 credit per test).
Skipped builds (the `vercel.json` ignoreCommand: docs-only, test-plan-only, CI-only) cost nothing and are not counted.

Rules
- Before every push: count the last 24 h below. At 70, stop and batch. At 80, no pushes until the window rolls.
- One push per PR is the target; 2 max, 3 only for a red-then-green PR (red run must stay visible).
- No force-pushes to open PRs (each one is a new deploy and a full paid suite run).
- Record the count from the Vercel dashboard or `vercel ls` once a day as a cross-check.

| Date (Cairo, UTC+3) | Time | PR # | Commit | Built or skipped | Deploys in last 24 h | TestSprite tests run | Credits used | Note |
|---|---|---|---|---|---|---|---|---|
| 2026-10-19 | 22:22 | – (push to main) | f6405bf | Built: READY, production, dpl_4GgLHxvrbvXhkUipJ2tiN5caVpFj | 1 | 0 | 0 | First deploy. Project prj_yw32SAP9ZGvSOJ0bgeeUxdeTiwxc created and linked to goat-dev8/tallyroom. The earlier push of 567ba2b came before the project existed, so it made no deploy. |
| 2026-10-19 | 22:24 | – (push to main) | ad6094b | Skipped by ignoreCommand (CANCELED, docs-only), dpl_BCdNVAXuTsbSFQrZz8QZcx7AfUwW | 1 | 0 | 0 | Shows the ignoreCommand working. Not counted. |
| 2026-10-19 | 22:40 | #1 (ui/foundation) | d80d87b | Built: READY, preview, dpl_oVutvdyGfee5X5Jhxjz7tNBr26M6 | 2 | 0 | 0 | UI foundation preview. |
| 2026-10-19 | 23:18 | #2 | b9cf315 | Built: READY, preview, dpl_Bkqbj5fg1DbyRYxrPLjLftezY6oM | 3 | 0 | 0 | GET /api/elections. |
| 2026-10-19 | 23:18 | #3 | 1e73cf9 | Built, preview, dpl_71FhZzqcGvCi4AudoLkbBcbdAb1H | 4 | 0 | 0 | GET /api/elections/[id]/rounds. |
| 2026-10-19 | 23:18 | #4 | 3461630 | Built, preview, dpl_rmjfqtr1uFaKcEhKShTDSHwLJS4J | 5 | 0 | 0 | CSV/JSON on POST /api/tabulate. |
| 2026-10-19 | 23:18 | #5 | b9ce2fd | Built, preview, dpl_GwDJMvB6JvgAbth8xFYwu9nTkPyT | 6 | 0 | 0 | /api/report. |
| 2026-10-19 | 23:18 | #6 | 1b2d7d3 | Built, preview, dpl_ZZ455YntmrqssH18TbvFiL2k8w1Y | 7 | 0 | 0 | Options, write-ins, presets. |
| 2026-10-19 | 23:18 | #7 | 833093d | Built: READY, preview, dpl_FcoRAcFNev7vXk32LoE6X5eNGBNM | 8 | 0 | 0 | First push. POST /api/elections/[id]/tabulate returned 500 (fixture path via webpack URL). |
| 2026-10-19 | 23:35 | #7 | (this commit) | Built, preview | 9 | 0 | 0 | Second push: fixture path fix. |
| 2026-10-20 | ~02:00 | ci/api-base-url | backend TestSprite tests bound to the PR preview (script + 20 tests in repo) | Built: preview | ~24 | 21 (CLI, api) + V3 app | ~4.2 + V3 | One push. |
| 2026-10-20 | ~01:35 | fix/csv-single-choice (push 1, red) | BUG-001 test first (it.fails) + PR template + BUGS.md | Built: preview | ~20 | 1 (CLI) | 0.5 | Red TestSprite run on the buggy preview. |
| 2026-10-20 | ~01:55 | fix/csv-single-choice (push 2, green) | BUG-001 fix in src/parse.ts | Built: preview | ~22 | 1 (CLI) + V3 app | 0.5 + V3 | Green TestSprite run on the fixed preview. |
| 2026-10-19 | ~23:40 | #1 (ui/foundation) | this commit (landing redesign, worker dashboard, e2e) | Built: preview | 10 | 0 | 0 | One push for the whole redesign. Deployment id in the PR checks. |
| 2026-10-20 | 00:20 | test/frontend-testids (PR #10) | f131516 (testids, 404 page, 34 TestSprite UI plans) | Built: preview | — | 0 | 0 | One push. 24 h count well under the 80 cap; exact count from the Vercel list. |
| 2026-10-20 | ~00:35 | test/frontend-testids (PR #10) | this commit (tap-to-show Sankey tooltip, sample CSV, fixes from TestSprite run 1) | Built: preview | — | 0 | 0 | Triggered the TestSprite V3 GitHub App on PR #10 (34 UI + 18 API tests). |
| 2026-10-20 | ~00:45 | test/frontend-testids-r3 (no PR, avoids a paid auto re-run) | this commit (transfer list, aria-pressed, inline sample CSV) | Built: preview | — | 0 | 0 | Verified with a 3-test filtered run; PR #10 fast-forwards to this commit after approval. |
| 2026-10-20 | ~00:55 | test/frontend-testids (PR #10) | fast-forward to 1cb707b + this ledger commit | Built: preview | — | 0 | 0 | Approved paid TestSprite V3 auto run (web + api). |
| 2026-10-20 | ~01:00 | ci/testsprite-cli | this commit (TestSprite CLI workflow + path-to-suite filter) | Built: preview (scripts/ + test/ change is not skipped) | ~16 | 34 (V3 app) | ~17 | One push. Workflow-only would be skipped by ignoreCommand, so the filter script ships with it. |
| 2026-10-20 | ~01:12 | test/frontend-testids (PR #10) | this commit (window-level arrow keys, cell test ids, sankey-link class) | Built: preview | — | 0 | 0 | Fixes the 3 failures from TestSprite V3 run 6128d201. |
| 2026-10-20 | ~01:05 | test/stv-props | this commit (exact STV fractions in output + STV property tests) | Built: preview | ~18 | 34 + 3 reruns (CLI) | ~18.5 | Push 1 got no Vercel webhook; deployed via API (dpl_7557ULR9vnMHWBUU5V7FVioz8Mmw, no commit status, so no V3 app run). CLI run 31/34: 3 failures came from plan updates on the base branch. |
| 2026-10-20 | ~01:30 | test/stv-props | merge of base 2f8c6ee | Built: preview | ~19 | 34 (V3 app) | ~17 | Push 2: picks up the base's sankey-link class and arrow-key handling. |
| 2026-10-20 | ~01:15 | test/frontend-testids (PR #10) | 2f8c6ee via Vercel API (dpl_CS6TwXwdBhEEScS7uM1jNhAB3nk5) | Built: READY | — | 0 | 0 | Git webhook did not create a deployment for 2f8c6ee; deployed once via API. |
| 2026-10-20 | ~01:25 | test/frontend-testids (PR #10) | this commit (ledger only) | Built: preview | — | 0 | 0 | Ledger-only, so the ignore step skipped it (CANCELED). |
| 2026-10-20 | ~01:30 | test/frontend-testids (PR #10) | this commit (e2e for window arrow keys, BUGS.md) | Built: preview | — | 0 | 0 | Builds, so the Vercel status and TestSprite V3 check attach to the PR head. |

| 2026-10-20 | 01:36 | ui/dash-bars (PR #14) | first push | Built: preview | ~25 | 34 (V3 app) | ~17 | Missed row (added 10:00): dashboard redesign push 1/3. |
| 2026-10-20 | 01:36 | ui/dash-sankey (PR #15) | first push | Built: preview | ~26 | 34 (V3 app) | ~17 | Missed row: redesign push 2/3. |
| 2026-10-20 | 01:37 | ui/dash-cards (PR #16) | first push | Built: preview | ~27 | 34 (V3 app) | ~17 | Missed row: redesign push 3/3. |
| 2026-10-20 | 08:13 | feat/api-elections-list (PR #2) | 9f723ad (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~28 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 08:20 | – (squash-merge of #2 to main) | f1eea74 | Built: READY, production | ~29 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 08:20 | feat/api-rounds (PR #3) | cb050ee (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~30 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 08:25 | – (squash-merge of #3 to main) | e79555d | Built: READY, production | ~31 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 08:25 | feat/api-tabulate-formats (PR #4) | 5d6ddc9 (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~32 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 08:27 | – (squash-merge of #4 to main) | 29831ce | Built: READY, production | ~33 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 08:27 | feat/api-report (PR #5) | 9e4f5af (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~34 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 08:33 | – (squash-merge of #5 to main) | 7ef135f | Built: READY, production | ~35 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 08:33 | feat/api-options-presets (PR #6) | 7c7daaf (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~36 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 08:38 | – (squash-merge of #6 to main) | b3ac979 | Built: READY, production | ~37 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 08:40 | feat/api-server-tabulate (PR #7) | 2ceac2d (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~38 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 08:45 | – (squash-merge of #7 to main) | 8563ea7 | Built: READY, production | ~39 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 08:45 | feat/csv-count-ranking (PR #8) | ceae659 (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~40 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 08:51 | – (squash-merge of #8 to main) | f93daaf | Built: READY, production | ~41 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 08:52 | fix/csv-single-choice (PR #13) | 51525f7 (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~42 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 08:57 | – (squash-merge of #13 to main) | 99c4409 | Built: READY, production | ~43 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 09:06 | ci/api-base-url (PR #17) | 40352a6 (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~44 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 09:11 | – (squash-merge of #17 to main) | 9d3e379 | Built: READY, production | ~45 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 09:12 | test/frontend-testids (PR #10) | 4fca0e9 (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~46 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 09:19 | – (squash-merge of #10 to main) | d137b6a | Built: READY, production | ~47 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 09:19 | ci/testsprite-cli (PR #11) | f84d40c (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~48 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 09:26 | – (squash-merge of #11 to main) | 39ff831 | Built: READY, production | ~49 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 09:26 | test/stv-props (PR #12) | f4a078c (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~50 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 09:33 | – (squash-merge of #12 to main) | 7a9e65d | Built: READY, production | ~51 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 09:33 | ui/dash-bars (PR #14) | a4dbd65 (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~52 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 09:40 | – (squash-merge of #14 to main) | ed2c536 | Built: READY, production | ~53 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 09:40 | ui/dash-sankey (PR #15) | ec19b0c (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~54 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 09:46 | – (squash-merge of #15 to main) | 29cbb23 | Built: READY, production | ~55 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 09:46 | ui/dash-cards (PR #16) | 3c8cd17 (merge of main into the PR, needed after the base was squash-merged) | Built: preview | ~56 | 34 (V3 app) | ~17 | One push per PR during the bottom-up merge. |
| 2026-10-20 | 09:57 | – (squash-merge of #16 to main) | 07f1900 | Built: READY, production | ~57 | 0 | 0 | Bottom-up merge of the stack. |
| 2026-10-20 | 08:12 | – (squash-merge of #1 to main) | 335e2da | Built: READY, production | ~58 | 0 | 0 | First merge to main (logged out of order). |
| 2026-10-20 | ~10:00 | ci/workflows | CI-only (workflows, lint config, ignore rules) | Skipped by ignoreCommand | — | api: via CLI on production | ~10 | No deploy spent; proves the CLI Action + JUnit. |

| 2026-10-20 | ~10:25 | fix/api-input (PR #20) | BUG-002..004 fix + tests (red run was on production, no deploy) | Built: preview | ~54 (Vercel count 53 at 10:05) | 22 (CLI api) + V3 app | ~11 + V3 | One push. |

| 2026-10-20 | 10:25 | – (squash-merge of #20 to main) | 7a1c46e | Built: READY, production | ~55 | 22 (prod API suite) | ~11 | |
| 2026-10-20 | ~10:30 | ci/prod-paths | CI/docs/plan-only (prod suite paths filter, defects links, ui:rounds-table-maine plan) | Skipped by ignoreCommand | — | 0 | 0 | No deploy. |

| 2026-10-20 | ~10:50 | fix/ui-errors (PR #22) | BUG-005..007 UI fixes + e2e (red runs were Playwright on production, no deploy) | Built: preview | ~56 | 34 (V3 app) | ~17 | One push. Note: the V3 app also runs (and bills) on deploy-free PRs (#21 cost ~17-26). |

## Daily totals
| Date (Cairo) | Deploys built | Builds skipped | Peak 24 h count | Credits used |
|---|---|---|---|---|
| 2026-10-19 | 10 | 1 | 10 | 0 |
| 2026-10-20 (to 10:00) | ~58 | ≥3 | ~58 (under the 80 cap) | V3 app ~17 per UI run; balance 156.8 at 09:55 |
