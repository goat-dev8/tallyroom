# Independent review findings (BUG-014..017) and one fuzz find (BUG-018)

A read-only independent review of main and the live site reported 5 bugs. Each one was reproduced here by hand: locally, and with curl against https://tallyroom-rosy.vercel.app where an API path reaches the code.

| Review item | Ledger | Reproduced | Notes |
|---|---|---|---|
| 1. STV ignores tie-break rules | BUG-014 | locally and on production | `finish()` never passed `rules` to `tabulateStv`, and STV broke ties by candidate order |
| 2. `duplicates: ignore` does not reset the skip run | BUG-015 | locally and on production | Maine's certified figures are still exact after the fix. One Maine ballot moves between our own inactive sub-categories (`skips` 443 → 442, `undervote` 7,684 → 7,685); the certified "undervotes" line is their sum, 13,838 both times |
| 3. A bare CR fuses records | BUG-016 | locally and on production | |
| 4. Pattern TSV keeps the CR of CRLF | BUG-017 | locally only | Pattern TSV is not an upload format. It is only used for the bundled fixtures (which have no CR) and in the browser worker, so production can't be reached by curl. It would bite a CRLF checkout of the repo |
| 5. Declared candidates not NFC-normalised | no new ID | on production (main) | Same root cause as BUG-013, already fixed on `fix/ui-polish`. The test is kept in `test/review-bugs.test.ts`; it is not counted twice |

BUG-018 (`rules.lotOrder` not NFC-normalised) was **not** from the review. The extended differential fuzz found it on its first run.

Evidence: `red-production-curl.txt`, `red-vitest.txt` (5 of 6 fail; the item-5 test already passes on this stack), `red-vitest-BUG-018.txt`, `green-vitest.txt` (7 of 7 pass).
