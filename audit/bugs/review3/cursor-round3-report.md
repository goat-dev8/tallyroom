## Report: tallyroom stack (BUG-008..023 applied)

I found **14 new bugs**. Four are high severity, and two of those are live on production right now: quoted CSV rankings, and blank ballots counted in the STV quota. All 14 are reproduced, none overlap BUG-001..023, QA-1 or QA-2, and nothing was pushed. The four high bugs and three of the medium ones were each confirmed by a test I ran and watched fail. The slow-input bugs were confirmed by timed scripts.

### How the work was done

- **Subagents.** Model selection worked, so the reading, searching and repro work went to five Grok 4.7 subagents (high effort): STV engine, API limits and OpenAPI, MCP server, UI logic, and a TestSprite/CI inventory. I accepted only what I could re-run myself.
- **My checks.** I re-ran every accepted repro with my own scripts. I also put nine minimal tests in one temporary Vitest file: all 9 failed as expected, then I deleted the file. I sent two requests to the live site.
- **Setup did not work as written.**
  - `git apply uploads/stack.diff` fails on `main`. The diff was cut against `f6405bf` (the commit before PR #1), not `98d523f`.
  - I applied it there, skipping `DEPLOY_LEDGER.md` (conflict) and 5 `.webp` files (binary hunks without full index). The result is committed only in a local `/tmp/t`.
  - The diff has no `package-lock.json` changes, so `npm ci` fails. I installed with `npm install` instead.
  - The diff also lacks `data/fixtures/burlington-2009-mayor.patterns.tsv`, although the checksum list names it. So 2 Burlington test files fail (259/260 tests pass) and `POST /api/elections/burlington-2009/tabulate` throws an uncaught ENOENT.
  - These two may just be how the diff was exported. Check `git ls-files` on the real stack tip before pushing; I haven't counted them as bugs.

### New bugs

| # | Sev | Bug | Live on prod? |
|---|---|---|---|
| N1 | High | Blank or void ballots inflate the STV quota and change who is elected | Yes |
| N2 | High | Two surpluses in one round are transferred at once, so the last seat goes to the wrong candidate | Not checked |
| N3 | High | A quoted ranking field becomes different candidates; wrong winner with status 200 | Yes |
| N4 | High | MCP `tools/call` accepts arguments its own schema rejects and returns a successful count | Stack only |
| N5 | Med | Candidates named `inactive` or `out` collide with reserved Sankey node ids | Stack (UI) |
| N6 | Med | A candidate named `exhausted` is merged with exhausted ballots in the transfer list | Stack |
| N7 | Med | 125,087+ candidates: a stack overflow is reported as 400 `SEATS_OUT_OF_RANGE`, after about 53 s | Stack |
| N8 | Med | A 0.67 MB STV body takes about 26 s of CPU and still returns 200 | Stack |
| N9 | Low | MCP JSON-RPC conformance, counted as one batch (details below) | Stack |
| N10 | Low | MCP route's 4 MB cap counts UTF-16 characters, not bytes; 413 isn't in OpenAPI | Stack |
| N11 | Low | OpenAPI says `/api/mcp` returns an object, but a batch returns an array | Stack |
| N12 | Low | The STV column headed "Tallies (exact)" shows 4-decimal values, not the fractions | Stack (UI) |
| N13 | Low | Deep links using the API's election ids open Maine and drop the round | Stack (UI) |
| N14 | Low | The final-round Sankey says the winner "holds a majority" even when they have 0 votes | Stack (UI) |

**N1. Void ballots are counted in the quota.**
- **Repro:** `{"ballots":"10,A>C\n6,B\n5,C\n9,_","seats":2,"candidates":["A","B","C"]}` gives quota `11/1` and elects A,B. Production returns the same.
- **Expected:** quota `8/1` and winners A,C. Without the 9 blank ballots, the same request elects A,C.
- **Same flip** with first-rank `[A=B]`, an undeclared `Write-in`, `_>_>A` under two-exhaust, and with Hare.
- **Sources:** `src/stv.ts:12` says `floor(valid/(seats+1))+1`, and the property test title at `test/stv.properties.test.ts:29` says "valid". The code (`src/stv.ts:24`) sums every ballot group. The subagent also cited the Scottish 2007 Order rule 46 and Irish Electoral Act 1992 s.120 (quota from valid papers); I didn't check those rule numbers myself.
- `GET /api/options` says `floor(ballots/(seats+1))+1`. Our own docs disagree with each other, and the code follows the wrong one.

**N2. Surpluses are transferred together.**
- **Repro:** `91,A>C / 55,B>C>D / 10,C / 40,D / 44,F`, 4 seats, gives A,B,C,F. Round 2 credits C with `58/1`, including B's surplus; D ends at `1187/29` and is eliminated.
- **Expected:** A,B,C,D. Transferring A's surplus first elects C, so B's surplus skips C and goes to D (D 46 against F 44).
- **Source:** "weighted inclusive Gregory" (`src/stv.ts:11`) is the Scottish method, which transfers the largest surplus first (rule 49, as the subagent cited).

**N3. Quoted ranking fields.**
- **Repro:** text/csv `5,"Ada>Bo"\n4,"Bo>Ada"\n2,"Cy>Bo"` returns 200, winner `"Ada`, and candidates `"Ada`, `Bo"`, `"Bo`… Production returns the same.
- **Expected:** winner Bo, as for the unquoted file. RFC 4180 §2 says quoting a field doesn't change its value.
- **Realistic case:** spreadsheets quote any field that contains a comma, so `5,"Ada, Jr.>Bo"` breaks too. The rank-column CSV path already handles this correctly.
- **Root cause:** `src/parse.ts:171/180` re-parses the raw text and splits on `>` before stripping quotes.

**N4. MCP accepts schema-invalid arguments.**
- **Repro:** `count_ballots` with `{ballots, seat: 2}` (a typo for `seats`). The advertised schema has `additionalProperties:false`, yet the server returns `isError:false` and an IRV count.
- Also accepted: `election_rounds {id:["alaska-2022"]}` returns the Alaska count, while HTTP returns 404 for the same id. `arguments:null` is treated as `{}`.
- **Expected:** a −32602 error or `isError:true`. The MCP spec (2025-06-18, Tools) says servers MUST validate all tool inputs.

**N5–N8, the medium bugs.**
- **N5:** `buildFlow` (`components/sankey.tsx:15-19`) uses fixed ids for its reserved nodes.
  - `5,inactive>Alice\n3,Alice>inactive\n4,Bob\n2,_` gives 7 nodes but only 5 unique ids. `6,out>Alice…` gives 8 nodes, 7 unique.
  - d3-sankey keeps the last node for each id, so the candidate's ballots are drawn as the reserved pile.
- **N6:** `src/transfers.ts:42` uses the string `'exhausted'` as its destination.
  - `3,Zed>exhausted\n2,Zed\n6,exhausted>Alice\n6,Alice>exhausted` gives one edge, Zed→exhausted 5.
  - Expected: two edges of 3 and 2. These edges feed the rounds and report payloads.
- **N7:** `Math.min(...Object.values(tallies))` at `src/irv.ts:78`.
  - 130,000 lines of `1,cN` (1.19 MB) return 400 `SEATS_OUT_OF_RANGE` "Maximum call stack size exceeded" after 52.9 s, with no `seats` in the request.
  - Every `RangeError` is mapped to that code (`src/api.ts:62`). Nothing documents a candidate limit; the only documented limit is 4 MB.
- **N8:** 80 candidates, 40 seats, 34,000 groups (670,553 bytes): 200 after 25.9 s, 70 rounds. No time budget is documented, so I'm reporting this as CPU exhaustion with an under-4 MB body, not as a broken promise.

**N9–N14, the low bugs.**
- **N9 (MCP conformance batch):**
  - `id:true` and `id:{}` are accepted and echoed. JSON-RPC 2.0 §4 allows only string, number or null, and MCP doesn't allow null.
  - A posted JSON-RPC response gets 200 with −32600. The MCP transport spec says to return 202 with no body.
  - An empty batch `[]` returns 202; JSON-RPC §6 says it should be a −32600 error.
  - An unsupported `MCP-Protocol-Version` header is ignored; the spec says 400 Bad Request.
- **N10:** `app/api/mcp/route.ts` checks `raw.length`. A ping that is 12.5 MB in UTF-8 returns 200. It's the same class as BUG-010, in a different route.
- **N11:** `openApiDocument()` declares the `/api/mcp` 200 response as `type: object`, but a batch returns an array, which `test/mcp.test.ts` itself expects.
- **N12:** a 2-seat sample shows `4.6667` where the API's `exact` field has `14/3` (`components/dashboard.tsx:73` renders `x.tallies`).
- **N13:** `?election=alaska-2022` and `?election=nyc-2021` open Maine. These are the ids in `GET /api/elections`; `readUrl` only knows the catalog slugs.
- **N14:** for `3,[Alice]`, Alice wins with 0 votes, but the Sankey still prints "holds a majority".

**Minimal failing tests** (all 9 run, all 9 failed as expected; imports and the `post` helper omitted):

```ts
it('N1', () => { const r = post({ ballots: '10,A>C\n6,B\n5,C\n9,_', seats: 2, candidates: ['A','B','C'] });
  expect(r.body.quotaExact).toBe('8/1'); expect(r.body.winners).toEqual(['A','C']); });
it('N2', () => expect([...post({ ballots: '91,A>C\n55,B>C>D\n10,C\n40,D\n44,F', seats: 4,
  candidates: ['A','B','C','D','F'] }).body.winners].sort()).toEqual(['A','B','C','D']));
it('N3', () => expect(post('5,"Ada>Bo"\n4,"Bo>Ada"\n2,"Cy>Bo"\n', 'text/csv').body.winner).toBe('Bo'));
it('N4', () => { const r: any = handleMcpMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call',
  params: { name: 'count_ballots', arguments: { ballots: '6,Ada>Bo\n3,Bo', seat: 2 } } });
  expect(r.error?.code === -32602 || r.result?.isError === true).toBe(true); });
it('N5', () => { const { ballots, candidates } = parseBallots('5,inactive>Alice\n3,Alice>inactive\n4,Bob\n2,_');
  const ids = buildFlow(tabulateIrv(ballots, candidates), 0)!.nodes.map(n => n.id);
  expect(new Set(ids).size).toBe(ids.length); });
it('N6', () => { const { ballots } = parseBallots('3,Zed>exhausted\n2,Zed\n6,exhausted>Alice\n6,Alice>exhausted');
  const c = ['Alice','exhausted','Zed'];
  expect(eliminationTransfers(ballots, c, {}, tabulateIrv(ballots, c).rounds, 1)).toHaveLength(2); });
it('N9 ids', () => expect((handleMcpMessage({ jsonrpc: '2.0', id: true, method: 'ping' }) as any).error?.code).toBe(-32600));
it('N9 response', () => expect(handleMcpHttp('POST', '{"jsonrpc":"2.0","id":4,"result":{}}').status).toBe(202));
it('N11', () => { const s = (openApiDocument() as any).paths['/api/mcp'].post.responses['200'].content['application/json'].schema;
  expect(new Ajv2020({ strict: false }).compile(s)(handleMcpHttp('POST', '[{"jsonrpc":"2.0","id":1,"method":"ping"}]').body)).toBe(true); });
```

For N7 and N8 I ran timed scripts with the generators above; the subagents also ran the slow Vitest versions and saw them fail.

**Not counted:**
- **Round carried across elections:** a deep-linked round can stick to the next election if you switch before the first count finishes (`components/dashboard.tsx:50/65`). It was only simulated, never run in a browser.
- **Origin header:** not checked on the MCP route. It's hardening for a server with no credentials.
- **Percentages:** displayed shares summing to 100.1% is normal rounding with no source saying otherwise.
- **`tools/list` cursor:** an invalid cursor isn't rejected, but the spec only says SHOULD.
- **MCP batches:** allowed under the 2025-03-26 protocol version, which the server negotiates.
- **Checked clean:**
  - Hare at exactly the quota.
  - The exact-fraction totals over 2,143 rounds.
  - Over-election, and lot order for the last seat.
  - Every seats edge case.
  - Election-id edge cases.
  - State leaking between MCP calls.

### TestSprite ideas, ranked by impact per credit

I assumed credits are spent per test run and that config changes cost nothing; I haven't checked TestSprite's pricing.

1. **Make the merge gate fail closed and actually required (0 credits).**
   - README line 38 makes `TestSprite V3` required, but that status "reads success even when tests fail".
   - The job that really fails (`testsprite-v3-gate`) and `TestSprite CLI` are not in the required list.
   - The gate parses the status text with `[0-9]+ failed`; if that doesn't match, the count becomes 0 (`testsprite-gate.yml:42`), which passes.
   - Fix: require both jobs, and pass only when the text shows "N of N passed".
   - Proof for judges: a PR with one deliberately broken test shows a red required check and can't merge.
2. **Turn this report into TestSprite catches, red first (about 3 credits).**
   - Add `api:csv-quoted-ranking` (N3) and `api:stv-void-quota` (N1); both are red on production today. Add `api:stv-surplus-order` (N2).
   - Record the red single-test runs, then green runs on the fix preview.
   - Today only 8 of 25 ledger rows are TestSprite catches, and none of BUG-009..023.
3. **One metamorphic API test (about 1 credit per run).**
   - One TestSprite Python test checks invariants against the live API: quoting every field, reordering ballots, splitting a group, and scaling counts must not change the result.
   - It also checks the STV totals with Python's `fractions` and confirms that adding blank ballots changes no winner.
   - It would have found N1 and N3 without knowing about them. This is our own design and the strongest innovation item.
4. **A test generated from the published contract (about 1 credit).**
   - Fetch `/api/openapi`, send each documented example, and validate the live bodies with `jsonschema`.
   - Fetch MCP `tools/list` and send arguments each schema rejects, expecting −32602.
   - This catches the N4, N11 and BUG-020 classes, and stays in sync with the docs automatically.
5. **Run TestSprite when its own tests change (0 credits).**
   - `scripts/testsprite-filter.mjs:9` skips `testsprite/.*`, so a PR that edits a test never runs it.
   - The CLI job also discards `ui:` suites. Map edited files to their own test ids.
6. **Check the deployed commit before testing production (0 credits).**
   - `/api/health` would return the commit SHA, and `testsprite-prod.yml` would wait until it matches `github.sha`.
   - Today it polls health, sleeps 60 s, and never fails if health stays down.
7. **Exact sync with the TestSprite project (0 run credits; the list call's cost is unverified).**
   - Compare the remote test list with the 22 + 34 local files, and fail on drift.
   - `test/testsprite-api.test.ts` currently asserts at least 20, not exactly 22.

Items 1, 5 and 6 cost no credits and decide most of the merge-gate 40 points. Items 2 and 3 are the cheapest way to move the quality and innovation scores.