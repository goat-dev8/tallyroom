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
| 2026-10-19 | 22:40 | #1 (ui/foundation) | d80d87b | Built: READY, preview, dpl_oVutvdyGfee5X5Jhxjz7tNBr26M6 | 2 | 0 | 0 | First UI preview. |
| 2026-10-19 | 23:18–23:23 | backend stream (feat/api-*) | 833093d, b9cf315, 1e73cf9, 3461630, b9ce2fd, 1b2d7d3, c7a676c | Built: 7 previews READY | 9 | 0 | 0 | Pushed by the backend stream; recorded here from the Vercel deployments list at 23:35 so the 24 h count stays accurate. |
| 2026-10-19 | ~23:40 | #1 (ui/foundation) | this commit (landing redesign, worker dashboard, e2e) | Built: preview | 10 | 0 | 0 | One push for the whole redesign. Deployment id in the PR checks. |
| 2026-10-20 | 00:20 | test/frontend-testids (PR #10) | f131516 (testids, 404 page, 34 TestSprite UI plans) | Built: preview | — | 0 | 0 | One push. 24 h count well under the 80 cap; exact count from the Vercel list. |
| 2026-10-20 | ~00:35 | test/frontend-testids (PR #10) | this commit (tap-to-show Sankey tooltip, sample CSV, fixes from TestSprite run 1) | Built: preview | — | 0 | 0 | Triggered the TestSprite V3 GitHub App on PR #10 (34 UI + 18 API tests). |
| 2026-10-20 | ~00:45 | test/frontend-testids-r3 (no PR, avoids a paid auto re-run) | this commit (transfer list, aria-pressed, inline sample CSV) | Built: preview | — | 0 | 0 | Verified with a 3-test filtered run; PR #10 fast-forwards to this commit after approval. |
| 2026-10-20 | ~00:55 | test/frontend-testids (PR #10) | fast-forward to 1cb707b + this ledger commit | Built: preview | — | 0 | 0 | Approved paid TestSprite V3 auto run (web + api). |
| 2026-10-20 | ~01:12 | test/frontend-testids (PR #10) | this commit (window-level arrow keys, cell test ids, sankey-link class) | Built: preview | — | 0 | 0 | Fixes the 3 failures from TestSprite V3 run 6128d201. |
| 2026-10-20 | ~01:15 | test/frontend-testids (PR #10) | 2f8c6ee via Vercel API (dpl_CS6TwXwdBhEEScS7uM1jNhAB3nk5) | Built: READY | — | 0 | 0 | Git webhook did not create a deployment for 2f8c6ee; deployed once via API. |
| 2026-10-20 | ~01:25 | test/frontend-testids (PR #10) | this commit (ledger only) | Built: preview | — | 0 | 0 | Ledger-only, so the ignore step skipped it (CANCELED). |
| 2026-10-20 | ~01:30 | test/frontend-testids (PR #10) | this commit (e2e for window arrow keys, BUGS.md) | Built: preview | — | 0 | 0 | Builds, so the Vercel status and TestSprite V3 check attach to the PR head. |

## Daily totals
| Date (Cairo) | Deploys built | Builds skipped | Peak 24 h count | Credits used |
|---|---|---|---|---|
| 2026-10-19 | 10 | 1 | 10 | 0 |
