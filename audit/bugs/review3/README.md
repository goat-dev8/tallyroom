# Independent review round 3 (`cursor-round3-report.md`, in this folder since 2026-10-21, written against ea0e692), checked at 207fc07

| Report item | Result | Ledger |
|---|---|---|
| N1 void ballots in quota | reproduced locally and on production | BUG-028 |
| N2 surplus order | reproduced locally and on production | BUG-029 |
| N3 quoted ranking field | reproduced locally and on production | BUG-030 |
| N4 MCP argument checks | `seat` typo already fixed (duplicate of BUG-024/025); id array and `arguments: null` reproduced | BUG-031 |
| N5 Sankey id collision | reproduced | BUG-032 |
| N6 candidate named "exhausted" | reproduced | BUG-033 |
| N7 130k candidates | reproduced (68.8 s, 400 SEATS_OUT_OF_RANGE) | BUG-034 |
| N8 0.67 MB STV body ~26 s | **not reproduced, dropped**. The report's generator isn't available. Two 80-candidate / 40-seat / 34,000-group bodies (480-488 KB) took 1.3-1.4 s at 207fc07 and 0.5-0.7 s now; 12 BUG-026 probe shapes up to 4 MB all finish in ≤ 0.72 s (`stv-scale-after-BUG-029.txt`) | — (BUG-026 bound still in force) |
| N9 JSON-RPC conformance | reproduced (4 parts) | BUG-035 |
| N10 MCP byte cap | reproduced | BUG-036 |
| N11 OpenAPI batch schema | reproduced | BUG-037 |
| N12 exact tallies column | reproduced (e2e) | BUG-038 |
| N13 API-id deep links | reproduced (e2e) | BUG-039 |
| N14 "holds a majority" | reproduced (e2e) | BUG-040 |

Files: `repro-207fc07.*` (local repro), `red-production-curl.txt`, `red-vitest.txt` (21 failed, 3 passed of 24; corrected 2026-10-21, it used to say 21/21),
`green-vitest.txt` (24 passed of 24; corrected 2026-10-21, it used to say 25/25), `red-e2e.txt` (8/8 fail) / `green-e2e.txt` (8/8 pass), `full-e2e.txt`, `parity.txt`,
`fuzz-sweep-300-309.jsonl`, `stv-scale-after-BUG-029.txt`, screenshots `red-*.png` and `n1*-*.png`.
