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
| 2026-10-19 | ~23:40 | #1 (ui/foundation) | this commit (landing redesign, worker dashboard, e2e) | Built: preview | 10 | 0 | 0 | One push for the whole redesign. Deployment id in the PR checks. |

## Daily totals
| Date (Cairo) | Deploys built | Builds skipped | Peak 24 h count | Credits used |
|---|---|---|---|---|
| 2026-10-19 | 10 | 1 | 10 | 0 |
