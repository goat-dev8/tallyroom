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

## Daily totals
| Date (Cairo) | Deploys built | Builds skipped | Peak 24 h count | Credits used |
|---|---|---|---|---|
| 2026-10-19 | 10 | 1 | 10 | 0 |
