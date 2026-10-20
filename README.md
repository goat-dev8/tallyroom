# Tallyroom

Exact ranked-choice (IRV) and multi-seat STV counting, checked against government-certified results.

**Live:** https://tallyroom-rosy.vercel.app (landing with a live count of Maine 2018, and a dashboard at `/app` for the certified elections or your own ballot file)

```bash
curl -s https://tallyroom-rosy.vercel.app/api/tabulate -H 'content-type: application/json' \
  -d '{"ballots":"5,Ada>Bo\n4,Bo>Ada\n2,Cy>Bo"}'
```

## What is counted, and how we know it is right

| Election | Ballots | Source | Result |
|---|---|---|---|
| Maine 2018, U.S. House District 2 | 296,077 | official cast vote records | every round, candidate and inactive category matches the certified report |
| Alaska 2022, U.S. House special | 192,289 | official cast vote records | same |
| NYC 2021, Democratic mayor primary | 947,932 | official cast vote records | same |
| Burlington VT 2009, mayor | 8,980 | PrefLib conversion of the city's ballot file | same (certified under the overvote rule "continuing") |

4 of 4 elections are exact: 119 compared figures, 0 gaps (`audit/parity/README.md`). The tables are in `PARITY.md`, and `npm run parity` exits non-zero on any gap. The raw files are pinned by SHA-256 in the [`raw-cvr-v1`](https://github.com/goat-dev8/tallyroom/releases/tag/raw-cvr-v1) release. `parity-nightly.yml` rebuilds everything from those files. It has run once, started by hand ([run 39385031100](https://github.com/goat-dev8/tallyroom/actions/runs/39385031100), exact). Its cron has not fired yet.

- `src/irv.ts`: single-winner IRV with configurable overvote, skipped-rank and duplicate rules, batch elimination, and previous-round or lot tie-breaks.
- `src/stv.ts`: STV with Droop or Hare quota and Gregory surplus transfer, in exact BigInt rationals (`src/fraction.ts`).
- `src/parse.ts`: ranking text (`5,A>B`), one-rank-per-column CSV and JSON.

## Tests and what runs them

| Suite | Size (in this repo) | Runs on |
|---|---|---|
| TestSprite UI (`testsprite/frontend/`) | 34 plans, the same 34 tests in the TestSprite project | every PR preview, through the TestSprite V3 GitHub check |
| TestSprite API (`testsprite/backend/`) | 22 tests, the same 22 `api:` tests in the TestSprite project | PR previews that touch API code (`testsprite-cli.yml`), and production after merges that touch app code (`testsprite-prod.yml`) |
| Vitest (`test/`) | 247 tests (the 600-case fuzz corpus and the 120-case hostile corpus are 1 test each) | every PR and every push to main (`ci.yml`) |
| Playwright (`tests/e2e/`) | 44 tests × 2 viewports | every PR (`ci.yml`, `playwright e2e` job) |

Plans written but not yet created in TestSprite are in `testsprite/planned/`, and they aren't counted above. The V3 bot says it queued 23 API tests. That is because the TestSprite project still holds one old smoke test, `smoke:api-health-pr1-preview`, which isn't in this repo.

**What blocks a merge.** `main` is protected and requires `TestSprite V3` and `lint + typecheck + vitest`. The V3 status reads "success" even when tests fail. For example, PR #22 merged with `ui:hero-autoplay` failing. So `testsprite-gate.yml` reads that status on each PR head and fails when it reports any failed test. It doesn't start a run.

## More checks

- **Differential fuzz.** `fuzz/oracle.py` is a second counter written separately in Python. Random elections and hostile inputs (the shapes of past bugs: `__proto__`, totals above 2^53, header-only files, `#` comments, multi-byte bodies at the size limit, JSON sent as CSV) are checked against it. On old builds, hostile mode finds every one of those past bugs; on this one it finds none (`audit/fuzz/hostile/seed1-by-build.md`). The random mode found BUG-012. `fuzz-nightly.yml` is scheduled but hasn't run yet.
- **Mutation testing.** Stryker scores 92.54% on the engine files (`irv.ts`, `stv.ts`, `fraction.ts`) and 78.95% on `parse.ts`, measured locally (`audit/mutation/`).
- **Requirements.** `docs/PRD.md` maps R1–R23 to tests, and `test/prd.test.ts` fails if a named test file is missing. `audit/traceability.md` covers the counting rules R1–R20.

## Use it from code or an AI agent

- REST: `POST /api/tabulate`. The contract is `GET /api/openapi` (OpenAPI 3.1), and `test/openapi.test.ts` checks it against the handlers.
- MCP: `/api/mcp` (streamable HTTP), or `npx tsx mcp/stdio.ts` locally. Tools: `count_ballots`, `list_elections`, `election_rounds`, `counting_rules` (`audit/api-mcp/`). Neither has a TestSprite test yet.

The `/proof` page sums up the checks above.

## Bugs, with red and green evidence

`audit/defects.md` has one row per bug: what caught it (TestSprite, Vitest, Playwright or manual QA, named honestly), the failing evidence, the fix PR and the passing evidence. `audit/LEDGER.md` has one row per PR. Rows are corrected in place and never deleted. Manual-QA findings are listed separately, as two batches (QA-1, QA-2), and aren't counted as TestSprite catches.

## Develop

```bash
npm ci
npm test             # Vitest: engine, parity, properties, API
npm run parity       # computed vs certified tables; non-zero exit on any gap
npm run e2e          # Playwright against http://localhost:3100 (start with: npm run build && npx next start -p 3100)
```

Deploys: `scripts/vercel-ignore.sh` skips builds for docs, test-plan and CI-only changes. `audit/vercel-deployments.md` is the deploy record, exported from the Vercel API.
