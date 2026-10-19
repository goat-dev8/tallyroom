# Tallyroom (engine, local only)

Deterministic ranked-choice (IRV) and multi-seat STV counter in TypeScript.

- `src/irv.ts`: single-winner IRV. Rules: overvote (exhaust/skip), skipped ranks (continue/two-exhaust), duplicate ranks ignored, batch elimination, previous-round then lot-order tie-break. Per-round tallies, inactive ballots by reason, threshold, transfers.
- `src/stv.ts`: STV with Droop or Hare quota, Gregory surplus transfer, exact BigInt rationals (`src/fraction.ts`).
- `src/parse.ts`: `count,A>B>C` ballots (`[A=B]` overvote, `_` skip) and the compact pattern TSV.
- `data/fixtures/maine-2018-cd2.patterns.tsv`: 296,077 official cast vote records collapsed to 1,564 ranking patterns. `scripts/maine_xlsx_to_patterns.py` regenerates it from the official spreadsheets (raw files are not committed; their hashes are in `data/SHA256SUMS.maine-2018-cd2.txt`).

```
npm test             # unit + property + certified-parity tests
npm run parity:maine # prints both rounds and the gap vs certified
```
