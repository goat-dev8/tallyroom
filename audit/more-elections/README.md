# Extra certified elections (local prep)

| Election | Status | Notes |
|---|---|---|
| Burlington VT 2009 Mayor (IRV) | PARITY: EXACT, 3 rounds | Ballots from PrefLib 00005-00000002.toi (from the city's ballot file). Certified rounds from the ChoicePlus Pro report. Needed a new engine rule, `overvote: 'continuing'`: an overvote naming exactly one continuing candidate counts for that candidate, and a ballot stays exhausted once it is exhausted. Without the rule, Wright gets 4,060 instead of 4,061. |
| San Francisco 2019 DA (IRV) | blocked | sfelections.org returns a CloudFront 403 for the CVR zip and the detail PDF from this box. PrefLib 00021 drops blanks and overvotes, so it can't give exact parity. |
| Scotland 2022 STV (30 wards, Argyll and Bute + Highland) | FIELD PARITY: 4082/4082 with `transferDecimals: 5` | Ballots and stage reports from the councils' own websites; see audit/parity/README.md. Glasgow 2007 not attempted. |
| Cambridge MA STV | not feasible | Cambridge uses Cincinnati-style whole-ballot random transfer. The result depends on ballot order. Gregory STV can't reproduce it. |
