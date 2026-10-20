# Extra certified elections (local prep)

| Election | Status | Notes |
|---|---|---|
| Burlington VT 2009 Mayor (IRV) | PARITY: EXACT, 3 rounds | Ballots from PrefLib 00005-00000002.toi (from the city's ballot file). Certified rounds from the ChoicePlus Pro report. Needed a new engine rule, `overvote: 'continuing'`: an overvote naming exactly one continuing candidate counts for that candidate, and a ballot stays exhausted once it is exhausted. Without the rule, Wright gets 4,060 instead of 4,061. |
| San Francisco 2019 DA (IRV) | blocked | sfelections.org returns a CloudFront 403 for the CVR zip and the detail PDF from this box. PrefLib 00021 drops blanks and overvotes, so it can't give exact parity. |
| Scotland (Glasgow 2007) STV | not attempted | Scottish STV truncates transfer values to 5 dp. Our STV uses exact rationals. Exact parity needs a Scottish rounding mode first. |
| Cambridge MA STV | not feasible | Cambridge uses Cincinnati-style whole-ballot random transfer. The result depends on ballot order. Gregory STV can't reproduce it. |
