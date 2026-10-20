# Differential fuzz: Tallyroom vs a second, independent counter

`fuzz/oracle.py` is a separate IRV + STV counter in plain Python (standard library `fractions`, no shared code).
It was written from the rule descriptions, not from `src/`. `fuzz/gen.py` makes seeded random elections:
2-7 candidates, 1-25 ballot lines, small counts so ties are common, blank ranks, repeated names, overvotes
`[A=B]`, ballots that run out, all three overvote rules, both skip and duplicate rules, batch elimination, both
tie-break rules, custom lot orders, and STV with 2..k-1 seats under Droop and Hare. Each election is sent in one of
three input formats (ranking text, spaced text with `undervote` and a header line, one-rank-per-column CSV).

`fuzz/run.ts` sends every case through `handleTabulate`, the same function behind `POST /api/tabulate`, and compares
winner(s), every round's tallies (STV: exact fractions), continuing totals, elected and eliminated lists.

## Measured runs (2026-10-20, this box)

| Run | Seeds | Cases | IRV / STV | Rounds | IRV with tie-break / batch | Divergences |
|---|---|---|---|---|---|---|
| Before fix | 1 | 3,000 | 2,272 counted, 728 rejected | – | – | **728** (all BUG-028) |
| After fix | 1 | 3,000 | 2,146 / 854 | 7,655 | 274 / 186 | 0 |
| Sweep | 100-119 x 5,000 | 100,000 | 70,907 / 29,093 | 257,486 | 9,117 / 6,470 | **0** |

Files: `seed1-before-fix.json` (all 728 divergences), `seed1-after-fix.json`, `sweep-100-119.jsonl` (one line per seed),
`red-BUG-028.txt` / `green-BUG-028.txt` (Vitest output before and after the fix).

## Does the harness actually catch bugs?

Checked by planting two one-character bugs and reverting them (not committed):
- STV transfer value `(votes-quota)/quota` instead of `/votes`: frozen corpus test failed 104 of 601.
- Batch elimination `<=` instead of `<`: corpus test failed 8 of 601; `fuzz/sweep.sh 1 1 3000` reported 48 divergences and exited 1.

## In CI
- `test/fuzz-corpus.test.ts`: 600 frozen cases (`gen.py 2026 600`), runs with every `vitest run`, no Python needed.
- `.github/workflows/fuzz-nightly.yml`: 20 new seeds x 5,000 cases each night; the job fails and uploads the
  divergent requests if the two counters ever disagree. `fuzz/` is on the Vercel skip list.
