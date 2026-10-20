# Parity with certified results: totals

Every real election in the repo, counted by Tallyroom from its official ballot-level data and compared, line by line,
with the jurisdiction's certified round-by-round report. Run: `npm run parity` (exit code 1 on any gap).

| Election | Ballot data | Certified report | Rounds | Lines compared | Gaps |
|---|---|---|---|---|---|
| Maine 2018, US House CD2 | Maine SoS CVR spreadsheets (release `raw-cvr-v1`) | Maine SoS RCV summary report | 2 | 16 | 0 |
| Alaska 2022, US House special | Alaska DoE Dominion CVR export (release `raw-cvr-v1`) | Alaska DoE RCV detailed report | 2 | 15 | 0 |
| New York City 2021, Dem. mayor primary | NYC BOE CVR zip (release `raw-cvr-v1`) | NYC BOE official RCV rounds | 8 | 72 (+8 eliminated-set checks) | 0 |
| Burlington VT 2009, mayor | PrefLib ballot file 00005 (TOI) | City of Burlington official rounds | 3 | 16 | 0 |
| **Total** | | | **15** | **119** | **0** |

**4 of 4 elections exact; 119 of 119 compared figures exact.**

Evidence in this folder:
- `run-2026-10-20.txt`: full output of `npx tsx scripts/parity.ts` on this branch (ends `PARITY: EXACT`, exit 0).
- `sha256-check-2026-10-20.txt`: SHA-256 of all 19 raw and fixture files on the box that day. Each hash equals the
  one committed in `data/SHA256SUMS.*.txt`, so the counted inputs are the published ones.

Limits, stated plainly: Burlington's ballots come from PrefLib's copy of the city's ballot file, not from a
raw-cvr-v1 asset; NYC's recap publishes no round-1 inactive figure, so "inactive since R1" is compared instead (see `PARITY.md`).
The nightly `parity-nightly.yml` re-derives Maine, Alaska and NYC from the raw release files before counting.
