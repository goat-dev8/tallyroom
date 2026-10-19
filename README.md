# Tallyroom (engine, local only)

Deterministic ranked-choice (IRV) and multi-seat STV counter in TypeScript.

- `src/irv.ts`: single-winner IRV. Rules: overvote (exhaust/skip), skipped ranks (continue/two-exhaust), duplicate ranks ignored, batch elimination, previous-round then lot-order tie-break. Per-round tallies, inactive ballots by reason, threshold, transfers.
- `src/stv.ts`: STV with Droop or Hare quota, Gregory surplus transfer, exact BigInt rationals (`src/fraction.ts`).
- `src/parse.ts`: `count,A>B>C` ballots (`[A=B]` overvote, `_` skip) and the compact pattern TSV.
- `data/fixtures/*.patterns.tsv`: official CVRs collapsed to ranking patterns (Maine 296,077 ballots / 1,564 patterns; Alaska 192,289 / 554; NYC 947,932 / 77,562). Converters: `scripts/maine_xlsx_to_patterns.py`, `scripts/dominion_cvr_to_patterns.ts` (streaming, for the 382 MB Alaska JSON), `scripts/nyc_xlsx_to_patterns.py`. Exact certified parity for all three: see `PARITY.md`.


```
npm test             # unit + property + certified-parity tests
npm run parity       # computed vs certified tables for Maine, Alaska, NYC; non-zero exit on any gap
```

Deploy hygiene: `vercel.json` ignoreCommand (`scripts/vercel-ignore.sh`) skips docs/test-plan/CI-only builds; `DEPLOY_LEDGER.md` tracks the 80-per-24h cap.
