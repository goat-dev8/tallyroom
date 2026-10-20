# Tallyroom: product requirements

## Why it exists
Ranked-choice results are published as round tables that almost nobody can re-check. Officials, journalists, campaign
staff and civic-tech developers need a counter that (a) gives the certified answer for real elections, to the ballot,
(b) shows why each round went the way it did, and (c) can be driven by people, scripts and AI agents alike.

## Who uses it
| Person | Job to be done | Surface |
|---|---|---|
| Election analyst | Re-run a certified count from the official ballot file and see each round | `/app` dashboard, `/api/elections/*` |
| Campaign or newsroom data desk | Upload ballots, try other rule sets, share a fixed result | Upload panel, `POST /api/tabulate`, `/api/report` |
| Developer / AI agent | Count without a UI, with a machine-readable contract | `GET /api/openapi`, MCP at `/api/mcp` or `mcp/stdio.ts` |

## Out of scope
Ballot design, voter identity, casting votes, and any claim of legal certification.

## Requirements and the tests that hold them
Paths: Vitest in `test/`, Playwright in `tests/e2e/`, TestSprite API tests in `testsprite/backend/`, TestSprite UI plans in
`testsprite/frontend/`. `test/prd.test.ts` fails the build if any file named in this table disappears.

| ID | The product must... | Vitest | Other automated checks |
|---|---|---|---|
| R1 | give each ballot to its highest-ranked candidate still in the race, every round | `irv.test.ts`, `properties.test.ts`, `fuzz-corpus.test.ts` | `api_maine.py`, `api_certified_rounds_maine.py` |
| R2 | declare a winner at a strict majority of continuing ballots, or the larger of the final two | `irv.test.ts`, `properties.test.ts`, `fuzz-corpus.test.ts` | `api_maine.py`, `ui-dash-maine.json` |
| R3 | drop the last-place candidate when nobody has a majority | `irv.test.ts`, `fuzz-corpus.test.ts` | `api_certified_rounds_nyc.py`, `ui-round-step.json` |
| R4 | optionally drop, together, every candidate who can no longer catch the one above | `irv.test.ts`, `nyc.parity.test.ts`, `fuzz-corpus.test.ts` | `api_options.py` |
| R5 | settle last-place ties by earlier rounds, then by a declared lot order | `irv.test.ts`, `api.test.ts`, `fuzz-corpus.test.ts` | `api_tie.py`, `ui-upload-tie.json` |
| R6 | treat an overvote by the chosen rule: end the ballot, pass the rank, or count the one live name | `irv.test.ts`, `parse.test.ts`, `fuzz-findings.test.ts`, `fuzz-corpus.test.ts`, `burlington.parity.test.ts` | `api_exhausted.py`, `ui-upload-overvote-skip.json` |
| R7 | treat blank ranks by the chosen rule: skip any number, or end the ballot after two in a row | `irv-reasons.test.ts`, `options.api.test.ts`, `fuzz-corpus.test.ts` | `api_options.py` |
| R8 | handle a candidate ranked twice on one ballot by the chosen rule | `parse.test.ts`, `alaska.parity.test.ts`, `fuzz-corpus.test.ts` | `api_alaska.py` |
| R9 | pass over unresolved write-ins unless the count declares them as a candidate | `irv-reasons.test.ts`, `alaska.api.test.ts` | `api_alaska.py`, `api_nyc.py` |
| R10 | say why every inactive ballot stopped counting, and keep tallies + inactive = all ballots | `irv-reasons.test.ts`, `properties.test.ts` | `api_exhausted.py` |
| R11 | fill several seats by STV with exact fractions, never creating or losing a vote | `stv.test.ts`, `stv.properties.test.ts`, `fuzz-corpus.test.ts` | `api_stv.py`, `ui-upload-stv.json` |
| R12 | make STV order and exclusions repeatable for the same input | `stv.properties.test.ts` | `api_stv.py` |
| R13 | reproduce certified results of real elections, figure for figure | `maine.parity.test.ts`, `alaska.parity.test.ts`, `nyc.parity.test.ts`, `burlington.parity.test.ts` | `api_certified_rounds_alaska.py`, `ui-parity-ledger.json`, `.github/workflows/parity-nightly.yml` |
| R14 | read ranking lines, rank-per-column CSV and JSON ballots | `parse.test.ts`, `tabulate-upload.test.ts`, `input-edges.test.ts`, `fuzz-corpus.test.ts` | `api_formats.py`, `api_csv_single_choice.py` |
| R15 | refuse counts that are not positive whole numbers or that overflow exact arithmetic | `input-edges.test.ts`, `api.test.ts` | `api_input_edges.py`, `api_err_422.py` |
| R16 | count any candidate name exactly as written | `input-edges.test.ts`, `parse.test.ts` | `api_input_edges.py` |
| R17 | answer bad requests with stable error codes and the right HTTP status | `api.test.ts`, `election-tabulate.api.test.ts`, `openapi.test.ts` | `api_err_400.py`, `api_err_405.py`, `api_err_413.py`, `api_err_election.py` |
| R18 | produce shareable reports whose hash changes only when the result does | `report.api.test.ts` | `api_report.py` |
| R19 | offer the certified rule sets of each bundled election as one-word presets | `presets.api.test.ts`, `mcp.test.ts` | `api_options.py` |
| R20 | show upload errors in words and clear old results when new data loads | (UI) | `upload-fixes.spec.ts`, `ui-upload-malformed.json`, `ui-upload-no-ballots.json` |
| R21 | publish a machine-readable contract that matches what the API really does | `openapi.test.ts` | |
| R22 | let AI agents count through MCP with the same answers as the REST API | `mcp.test.ts` | `audit/api-mcp/sdk-interop-2026-10-20.txt` |
| R23 | agree with an independently written counter on random elections | `fuzz-corpus.test.ts`, `fuzz-findings.test.ts` | `.github/workflows/fuzz-nightly.yml` |

R1-R20 keep the numbering of `audit/traceability.md`. R21-R23 are new with the API, MCP and fuzz work.

## Measures of success (measured, with where to find them)
- Certified parity: 4 of 4 elections, 119 of 119 compared figures exact (`audit/parity/`).
- Differential fuzz: 100,000 random elections, 0 divergences after BUG-028 was fixed (`audit/fuzz/`).
- Every defect has a failing test, a fix and a passing run (`audit/defects.md`).
