# Deploy ledger

Vercel Hobby allows 100 deployments per rolling 24 h. Our own cap is **80 per 24 h** (20 kept in reserve for hotfixes).
Every push that builds a preview costs one deploy, and also re-runs the full TestSprite suite (0.5 credit per test).
Skipped builds (the `vercel.json` ignoreCommand: docs-only, test-plan-only, CI-only) cost nothing and are not counted.

Rules
- Before every push: re-export `audit/vercel-deployments.md` from the Vercel API and read its 24 h total. At 70, stop and batch. At 80, no pushes until the window rolls.
- One push per PR is the target; 2 max, 3 only for a red-then-green PR (red run must stay visible).
- No force-pushes to open PRs (each one is a new deploy and a full paid suite run).
- Skipped builds still get a TestSprite V3 comment: the UI tests show as blocked (PRs #18, #19, #21), and no credits are spent.

## Record

The record is `audit/vercel-deployments.md`: every deployment of this project, exported from the Vercel API with its exact time, state, branch and commit. It replaces the hand-written table that used to be here, whose times and counts were estimates. That table is still in git history.

Latest export: 75 deployments, 63 built, 12 skipped. 63 were built in the 24 h before 2026-10-20 21:40 Cairo (UTC+3).
