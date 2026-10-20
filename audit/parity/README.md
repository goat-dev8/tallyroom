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

## Field-level check against the official round tables (2026-10-21)

`npm run parity:fields` runs two steps:
1. `scripts/parity-extract.py` reads the raw official files in `sources/` and writes `official/*.json`. Nothing is typed in by hand.
2. `scripts/parity-fields.ts` compares each field with Tallyroom's own count of the cast vote records.

Its output is `field-parity.md` (the table) and `field-parity.json`. `test/parity-fields.test.ts` checks the sha256 sums and the exact result.

| Source file | Publisher | sha256 |
|---|---|---|
| maine-updated-summary-report-CD2.xls | Maine Secretary of State | 0fa57160…c2 |
| alaska-RcvDetailedReport.pdf | Alaska Division of Elections (Dominion) | 7bf3289a…b7 |
| nyc-recap.html | NYC Board of Elections, certified 2021-07-20 | c9220813…7e |
| burlington-2009-mayor.official-rounds.html | Burlington, ChoicePlus Pro 2.3.2 output (copy kept at rangevoting.org) | 6cd18bc3…11 |

The full sums are in `sources/SHA256SUMS.txt`. They are the same as the sums recorded in `data/SHA256SUMS.*.txt` when these files were first downloaded. The first three files came from release raw-cvr-v1. maine.gov now returns 404 at the original URL, and elections.alaska.gov did not answer from the box. The Burlington page was fetched again on 2026-10-21 and its hash had not changed.

**Result: 262 of 263 fields match. 3 of 4 elections match on every compared field.**
- Maine: 38/38
- Alaska: 24/24
- NYC: 149/149
- Burlington: 51/52

**The one mismatch is the Burlington winning threshold.** The report prints 4491, which is floor(8980 valid / 2) + 1. Tallyroom prints 4489, which is floor(8976 continuing / 2) + 1, because 4 ballots were inactive in round 1. These are two definitions of the threshold. No tally, transfer, elimination or winner differs.

**Not compared, listed per election in field-parity.md:**
- Percentages.
- Alaska's "Remainder Points" (always 0) and its closing line "eliminated because not elected".
- NYC round-1 inactive, which the BOE table does not print.
- Burlington's closing round 4, where no votes move, and its 4 invalid ballots, which are not in the CVR.

**Parsing choices, all in the code:**
- The NYC "Eliminated in this round" row names candidates under the first round that no longer includes them. They are matched to Tallyroom's elimination at the end of the round before.
- "-XXX" is read as "all of the candidate's votes leave".
- Names are matched case-insensitively, with party prefixes removed and "Write-ins" read as "Write-in".

## Scottish council STV wards (added 2026-10-21)

The count covers 30 contested wards from the 5 May 2022 council elections:
- Argyll and Bute: wards 1–11
- Highland: wards 1, 2, 3, 5, 6, 7, 8, 9, 10 and 12–21

For each ward, two files were downloaded from the council's own website:
- **the "Candidate Votes Per Stage" PDF**, which is the oracle
- **the preference profile (.blt)**, which holds the ballots

Both are saved in `sources/scotland/`, with sums in `sources/scotland/SHA256SUMS.txt`. Highland wards 4 and 11 are missing because I found no published file for them on highland.gov.uk.

None of these wards was in the earlier 119-figure parity set. That set had no Scottish ballots.

**Method.**
- `scripts/parity-extract-scotland.py` reads every number from the PDFs, using pdftotext. It matches rows by the candidate names in the council's .blt file and writes `official/scotland/*.json`.
- `scripts/parity-scotland.ts` counts each .blt with `tabulateStv` and compares, stage by stage:
  - each candidate's votes and transfer
  - the non-transferable transfer
  - the transfer lost to rounding
  - the votes not held by any candidate (non-transferable plus rounding)
  - which surplus or exclusion the stage handled, and its amount
  - who was elected at the stage
  - per ward: seats, valid votes, quota, number of stages and the elected set
- Elected candidates whose surplus is gone are shown at the quota, and excluded candidates at 0, as the report shows them.

**Counting rule.** Councils count under SSI 2007/42 Sch.1 r.48(3): each transferred paper's value is worked out to 5 decimal places, and the remainder is ignored. The report prints the dropped amount as "non-transferable votes due to rounding".

I added that rule to the engine as an opt-in setting, `transferDecimals: 5`. The default is still exact fractions. Each weight class's value is cut to 5 places when a surplus is transferred. `test/stv-transfer-decimals.test.ts` covers it.

**Result.**

| Mode | Fields | Wards |
|---|---|---|
| r.48(3) | 4082/4082 (Argyll and Bute 1553, Highland 2529) | 30/30 exact |
| Exact fractions (not in the totals) | 2247/4082 at 5 dp | — |

In exact-fraction mode, every stage, action and elected candidate is still the same. Only the decimals differ, by at most 0.02076.

**Not compared.**
- Ballot papers received, which include rejected papers that are not in the .blt.
- The Total line, which always equals the valid vote.
- The non-transferable and rounding running columns on their own. The report adds one stage's rounding into the next stage's non-transferable figure, for example Argyll and Bute ward 4, stages 9→10. Their sum is compared instead.

**New totals (4 US elections + 30 Scottish wards): 4344 of 4345 fields match; 33 of 34 elections match on every compared field.** The only mismatch is still the Burlington threshold explained above.
