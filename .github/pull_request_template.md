<!-- Every PR fixes or proves something real. Fill in each section; delete none. -->
## Bug
One line, plus the impact on users.

## Found by
- Test: `api:…` / `ui:…` (TestSprite test id)
- FAILING TestSprite run: <url> (never re-run over it)
- Screenshot or response: `docs/evidence/<pr>/…`

## Root cause
`file.ts:line`: why it happened.

## Fix
What changed (diff summary).

## Proof
- GREEN TestSprite run on the PR head: <url>
- After screenshot or response: `docs/evidence/<pr>/…`

## Regression guard
The unit/property test that keeps it fixed, and the BUGS.md row.

Labels: `found-by-testsprite` + `api` or `ui`.
