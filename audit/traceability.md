# Counting rules → tests

Every rule the counter implements, with the tests that pin it down. "Vitest" files are in `test/` and run on every PR (`ci.yml`) and in the Vercel build; TestSprite API tests are in `testsprite/backend/` (CLI gate on PRs, production after API merges and nightly); TestSprite UI tests are plans in `testsprite/frontend/` (V3 check on every PR). Defects are in [`defects.md`](defects.md).

| ID | Rule | Vitest | TestSprite | PRs |
|---|---|---|---|---|
| R1 | Each round counts every continuing ballot for its highest-ranked continuing candidate | `irv.test.ts`, `properties.test.ts` | `api:tabulate-maine`, `api:certified-rounds-*` | #1, #3 |
| R2 | A candidate with a majority of continuing ballots (`floor(continuing/2)+1`) wins; with two left the larger tally wins | `irv.test.ts`, `properties.test.ts`, `maine.parity.test.ts` | `api:tabulate-*`, `ui:dash-maine` | #1 |
| R3 | The last-place candidate is eliminated each round | `irv.test.ts`, `properties.test.ts` | `api:certified-rounds-nyc` (8 rounds), `ui:round-step` | #3 |
| R4 | Batch elimination (optional): all candidates whose combined votes cannot pass the next one are eliminated together | `irv.test.ts`, `maine.parity.test.ts`, `nyc.parity.test.ts` | `api:options` | #6 |
| R5 | Ties for last place break by the previous round's tallies (default) or by lot order | `irv.test.ts`, `api.test.ts`, `properties.test.ts` | `api:tie-break`, `ui:upload-tie` | #6 |
| R6 | Overvote rule `exhaust`: a ballot becomes inactive at an overvoted rank (Maine); `skip`: the rank is passed over | `irv.test.ts`, `parse.test.ts`, `maine.parity.test.ts` | `api:exhausted`, `ui:upload-overvote-skip` | #4, #6 |
| R7 | Skipped ranks: `continue` (default) or `two-exhaust` (two consecutive blanks end the ballot) | `irv-reasons.test.ts`, `irv.test.ts`, `options.api.test.ts` | `api:options` | #6 |
| R8 | A repeated candidate on one ballot counts as a skipped rank | `parse.test.ts`, `alaska.parity.test.ts` | `api:tabulate-alaska` | #6 |
| R9 | Unresolved write-ins are passed over unless declared as a candidate (Alaska vs NYC) | `irv-reasons.test.ts`, `alaska.api.test.ts`, `parse.test.ts` | `api:tabulate-alaska`, `api:tabulate-nyc` | #6 |
| R10 | Inactive ballots are split by reason (blank, overvote, skips, undervote, exhausted) and tallies + inactive = total ballots | `irv-reasons.test.ts`, `properties.test.ts` | `api:exhausted`, `api:certified-rounds-*` | #1, #3 |
| R11 | STV: Droop quota, surplus transferred as exact fractions, nothing created or lost | `stv.test.ts`, `stv.properties.test.ts` | `api:stv-multiseat`, `ui:upload-stv` | #12 |
| R12 | STV ties and elimination are deterministic | `stv.properties.test.ts` | `api:stv-multiseat` | #12 |
| R13 | Certified parity: Maine 2018 CD2, Alaska 2022 special and NYC 2021 DEM mayor match the official reports round by round | `maine.parity.test.ts`, `alaska.parity.test.ts`, `nyc.parity.test.ts` | `api:certified-rounds-maine/alaska/nyc`, `ui:parity-ledger`, nightly `parity-nightly.yml` (from raw CVRs) | #1, #3 |
| R14 | Input formats: `count,A>B` lines (optional `count,ranking` header), rank-column CSV, JSON ballots | `parse.test.ts`, `tabulate-upload.test.ts`, `input-edges.test.ts` | `api:tabulate-csv-and-presets`, `api:csv-single-choice`, `api:input-edges` | #4, #8, #13, #20 |
| R15 | Counts are positive safe integers, in total too | `input-edges.test.ts`, `api.test.ts` | `api:input-edges`, `api:err-validation-422` | #20 |
| R16 | Any candidate name is counted as-is (unicode NFC, `__proto__`, `constructor`) | `input-edges.test.ts`, `parse.test.ts` | `api:input-edges` | #20 |
| R17 | Errors have stable codes: 400 parse, 405 method, 413 too large, 422 semantic, 404 unknown election | `api.test.ts`, `election-tabulate.api.test.ts`, `tabulate-upload.test.ts` | `api:err-parse-400`, `api:err-method-405`, `api:err-too-large-413`, `api:err-validation-422`, `api:err-unknown-election` | #7 |
| R18 | Reports are shareable with a stable content hash | `report.api.test.ts` | `api:report-hash-stable` | #5 |
| R19 | Rule presets (Maine, Alaska, NYC) set R4–R9 | `presets.api.test.ts` | `api:tabulate-csv-and-presets` | #6 |
| R20 | The dashboard shows API errors by message and resets on a new sample | `tests/e2e/upload-fixes.spec.ts` | `ui:upload-malformed`, `ui:upload-no-ballots`, `ui:upload-empty-and-seats` | #22 |
