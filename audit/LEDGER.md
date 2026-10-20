# Audit ledger

Every artifact a pull request produced (TestSprite reports, JUnit, before/after screenshots) lives under `audit/pr-<n>/`, named after the PR that produced it. Files are moved, never deleted. Defects caught by tests are in [`defects.md`](defects.md).

| PR | What it proved | Artifacts |
|---|---|---|
| [#13](https://github.com/goat-dev8/tallyroom/pull/13) | BUG-001: headerless single-choice CSV (`3,A`) rejected; red run, fix, green run | [`pr-13/`](pr-13/) (`before.txt`: the 422 response before the fix) |
| [#14](https://github.com/goat-dev8/tallyroom/pull/14) | Round bars v2: transfer segment, majority gate, distinct palette | [`pr-14/`](pr-14/) (before/after at 1440 px, NYC round 8 mid-animation) |
| [#15](https://github.com/goat-dev8/tallyroom/pull/15) | Sankey v2: vote-ordered (Peltola above Palin), pointer tooltip | [`pr-15/`](pr-15/) (before/after, hover tooltip) |
| [#16](https://github.com/goat-dev8/tallyroom/pull/16) | Dashboard cards + round rail v2 | [`pr-16/`](pr-16/) (before/after at 1440 and 390 px) |
| [#17](https://github.com/goat-dev8/tallyroom/pull/17) | Backend TestSprite tests bound to the PR preview, not a hard-coded deployment; 21/21 green | [`pr-17/`](pr-17/) (`testsprite-api.xml` JUnit, `testsprite-api.json` summary) |
| [#20](https://github.com/goat-dev8/tallyroom/pull/20) | BUG-002..004: count,ranking header, `__proto__` candidate, unsafe counts; red TestSprite run on production, fix, green CLI gate | [`pr-20/`](pr-20/) (`before-production.txt`, `red-failure-bundle/`) |
| [#22](https://github.com/goat-dev8/tallyroom/pull/22) | BUG-005..007: upload error text, samples clear old results, 404 tab title | [`pr-22/`](pr-22/) (red screenshots on production, red/green Playwright summaries) |

CI artifacts (JUnit from the TestSprite CLI gate, production API suite, Vitest, parity report) are attached to each GitHub Actions run; see the Actions tab.
