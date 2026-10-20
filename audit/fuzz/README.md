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
| Before fix | 1 | 3,000 | 2,272 counted, 728 rejected | – | – | **728** (all BUG-012) |
| After fix | 1 | 3,000 | 2,146 / 854 | 7,655 | 274 / 186 | 0 |
| Sweep | 100-119 x 5,000 | 100,000 | 70,907 / 29,093 | 257,486 | 9,117 / 6,470 | **0** |

Files: `seed1-before-fix.json` (all 728 divergences), `seed1-after-fix.json`, `sweep-100-119.jsonl` (one line per seed),
`red-BUG-012.txt` / `green-BUG-012.txt` (Vitest output before and after the fix).

## Does the harness actually catch bugs?

Checked by planting two one-character bugs and reverting them (not committed). These were measured when the corpus was 601 separate Vitest cases (1 shape check + 600 cases); it is now one test that lists the failing cases.
- STV transfer value `(votes-quota)/quota` instead of `/votes`: 104 of 601 failed.
- Batch elimination `<=` instead of `<`: 8 of 601 failed; `fuzz/sweep.sh 1 1 3000` reported 48 divergences and exited 1.

## Hostile mode (shapes of past bugs)

The random generator above only uses the names Ada to Gus and small counts, so it could never produce the bugs that were already fixed. `fuzz/hostile.py` makes inputs in exactly those shapes:
- `__proto__` and other Object.prototype names (BUG-003)
- totals above 2^53 − 1 (BUG-004), and large totals below it, which must be counted exactly
- header-only `count,ranking` files (BUG-002)
- `#` comment lines with commas (BUG-009)
- bodies just over and just under 4 MB of 2-byte characters (BUG-010)
- JSON sent as `text/csv` (BUG-011)
- non-ASCII names, CRLF and a BOM

Expected answers come from `fuzz/oracle.py`, with the oracle's own text parser applied to the canonical ballots, so the TypeScript parser is compared with it in the text format. `fuzz/hostile.ts` checks each case.

`hostile/seed1-by-build.md` has the measured run: the same 400 cases against older builds of `src/`. They find 213 divergences on main before #20 and 117 on main today, which still has BUG-009..011. They find 0 on this branch. Every bug shape it was built for shows up against the build that had that bug. No new bug was found.

## In CI (what actually runs)
- `test/fuzz-corpus.test.ts`: **one** Vitest test that checks 600 frozen cases (`gen.py 2026 600`) against the oracle's answers. It runs with every `vitest run` and needs no Python.
- `test/fuzz-hostile.test.ts`: **one** Vitest test over 120 frozen hostile cases (`hostile.py 2026 120`). Against the build on main today it fails, listing the `comments`, `bytes-over` and `json-as-csv` cases.
- `.github/workflows/fuzz-nightly.yml`: **one** scheduled job, with 20 seeds × 5,000 random cases plus 2 seeds × 400 hostile cases per run. It fails, and uploads the divergent requests, if the counters disagree. The cron has not fired yet, and it reaches main with this branch.

The 100,000-case sweep above was a one-off local run. It is evidence that the two counters agree, not a count of tests.

## Version 2 (after the independent review, 2026-10-20)

**What the 100,000-case sweep missed, and why.** The review found BUG-014..017, and the sweep above had reported 0 divergences:
- **BUG-014 (STV tie rules):** the generator never sent `rules` with STV cases, and the oracle's STV broke ties by candidate order ("later in candidate order is excluded"), which is exactly what the engine did. When both counters hard-code the same rule, a differential test can't see the difference.
- **BUG-015:** the oracle had the same mistake. Under `duplicates: ignore`, a repeat didn't reset its run of blanks either, so this was a shared misreading.
- **BUG-016 and BUG-017:** the generator only wrote LF line endings and never produced pattern TSV.
- **Item 5 / BUG-018:** names were ASCII only.

**Changes:**
- The oracle now resets the blank run on an ignored repeat, accepts LF, CRLF and bare CR, compares names after NFC, and breaks STV ties with previous-round and then lot, written separately from `src/stv.ts`.
- `gen.py` sends `tiebreak`/`lotOrder` with STV cases, uses LF/CRLF/CR line endings, and gives 15% of elections NFD names.
- `hostile.py` adds a `tsv-endings` shape.
- The frozen corpora (`test/fuzz/corpus-2026.jsonl`, `hostile-2026.jsonl`) were regenerated. Their stored answers came from the old oracle.

**Measured** (seed 1, 3,000 cases, and the same 20 seeds × 5,000 as before):

| Build of src/ | Seed 1 (3,000) | Seeds 100-119 (100,000) | What the divergences are |
|---|---|---|---|
| main 98d523f | 1,351 | not run | BUG-012 (INVALID_OVERVOTE), BUG-013 and BUG-016 (UNKNOWN_CANDIDATE), BUG-014 (42 STV), BUG-015 (2) |
| fix/ui-polish (before this branch) | 538 | **17,900** (`sweep-100-119-v2-on-fix-ui-polish.jsonl`) | 12,096 BUG-016 (bare CR, every one checked), 4,253 BUG-018, 1,512 BUG-014, 39 BUG-015 |
| this branch | 0 | **0** (`sweep-100-119-v2.jsonl`) | — |

Hostile v2, seed 7, 400 cases:

| Build of src/ | Divergences | What they are |
|---|---|---|
| main | 114 | BUG-009, 010, 011, 017 |
| fix/ui-polish | 20 | all `tsv-endings`, i.e. BUG-017 |
| this branch | 0 | — |

In the regenerated 600-case corpus, the `fix/ui-polish` build disagrees on 110 cases: BUG-014, BUG-016 and BUG-018. BUG-015 is rare (39 in 100,000), so the frozen corpus doesn't contain it; `test/review-bugs.test.ts` covers it.

This proves only that version 2 catches the bugs we now know about. A rule that both counters misread the same way would still get past it.
