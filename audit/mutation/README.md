# Mutation testing (Stryker 9, vitest runner, run locally)

| File | Before (full run) | After test/mutation-gaps.test.ts |
|---|---|---|
| src/irv.ts | 89.50% | 93.15% |
| src/stv.ts | 92.39% | 95.65% |
| src/fraction.ts | 73.63% | 87.91% |
| engine total (irv+stv+fraction) | 86.57% | 92.54% |
| src/parse.ts | 66.78% | 78.95% (after test/parse-gaps.test.ts) |
| all four files | 74.65% | — |

Each new run writes `latest.html`/`latest.json` (gitignored); rename one to keep it. `full-before.*` is the full run (721 killed, 33 timeout, 205 survived, 51 no coverage). `engine-after.*` re-runs irv, stv and fraction only (338 killed, 34 timeout, 28 survived, 2 no coverage).

The new tests cover real behaviour that had no test before:
- Fraction: zero denominator, sign normalisation, cmp on equal values, negative toFixed.
- IRV: a tied final two goes to tiebreak instead of being declared a win; previous-round tiebreak vs lot tiebreak; fallback to lot in round 1; strict `<` boundary for batch elimination; all five inactive-reason labels; empty candidate list.
- STV: seats equal to the candidate count, an overvote exhausts the paper, ties eliminate the later-declared candidate.

Survivors left in the engine are mostly equivalent mutants. One example: `k <= asc.length + 2` in the batch loop can't change the result, because the sum of everyone below the leader being smaller than the leader means the leader already has a majority.

Survivors in parse.ts (164) are mainly error-message strings and regex alternatives. They are left for a separate pass, so this branch adds no padding tests.

## parse.ts follow-up

`test/parse-gaps.test.ts` (16 tests) covers parser behaviour, not message text: BOM, header only on line 1, anchored count/overvote/undervote tokens, quote stripping, write-in rule, CRLF/CR/escaped quotes in CSV, rank/count/ignored headers, count-column validation, blank and comment rows, headerless two-column files, and JSON ballot shapes and rejections. `parse-after.*` is the re-run (476 killed, 4 timeout, 114 survived, 14 no coverage). Most remaining survivors are regex alternatives in header detection that have equivalent behaviour.

Probing the same code found three real bugs (BUG-009..011). They are fixed red→green on the local branch `fix/upload-input`, not here.
