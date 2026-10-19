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
| – | – | – | – | – | 0 | 0 | 0 | No deploys yet: repo is local only, no remote, no Vercel project. |

## Daily totals
| Date (Cairo) | Deploys built | Builds skipped | Peak 24 h count | Credits used |
|---|---|---|---|---|
| – | 0 | 0 | 0 | 0 |
