# Ledger re-verification, 2026-10-20 22:40 Cairo (UTC+3), fix/review-bugs

Checked every row in `audit/defects.md` (BUG-001..023, B-001, B-002, QA-1, QA-2).

## Repo paths
Every backticked path now resolves. Strict per-row output:
```
BUG-001: 0 repo paths, missing none, bare names none, vague no
B-001: 0 repo paths, missing none, bare names none, vague no
B-002: 1 repo paths, missing none, bare names none, vague no
BUG-002: 1 repo paths, missing none, bare names none, vague no
BUG-003: 1 repo paths, missing none, bare names none, vague no
BUG-004: 1 repo paths, missing none, bare names none, vague no
BUG-005: 1 repo paths, missing none, bare names none, vague no
BUG-006: 3 repo paths, missing none, bare names none, vague no
BUG-007: 3 repo paths, missing none, bare names none, vague no
BUG-008: 2 repo paths, missing ['audit/hero-hold/red-*'], bare names none, vague no
BUG-009: 5 repo paths, missing none, bare names none, vague no
BUG-010: 4 repo paths, missing none, bare names none, vague no
BUG-011: 4 repo paths, missing none, bare names none, vague no
BUG-012: 5 repo paths, missing none, bare names none, vague no
QA-1: 5 repo paths, missing none, bare names none, vague no
QA-2: 5 repo paths, missing none, bare names none, vague no
BUG-013: 4 repo paths, missing none, bare names none, vague no
BUG-014: 4 repo paths, missing none, bare names none, vague no
BUG-015: 3 repo paths, missing none, bare names none, vague no
BUG-016: 3 repo paths, missing none, bare names none, vague no
BUG-017: 3 repo paths, missing none, bare names none, vague no
BUG-018: 4 repo paths, missing none, bare names none, vague no
BUG-019: 5 repo paths, missing none, bare names none, vague no
BUG-020: 4 repo paths, missing none, bare names none, vague no
BUG-021: 5 repo paths, missing none, bare names none, vague no
BUG-022: 4 repo paths, missing none, bare names none, vague no
BUG-023: 5 repo paths, missing none, bare names none, vague no
```
The BUG-008 entry `audit/hero-hold/red-*` is a glob; it matches `audit/hero-hold/red-playwright-production.txt`.

Corrected in place in this commit:
- Bare file names resolved only relative to the path before them. They now have full paths: BUG-009, 014, 018, 019, 023.
- "same files" / "same file" now name the actual files: BUG-015, 016, 017.
- B-002 red run: in execution a73e8898, `ui:sankey-tooltip` was **blocked**, not failed. The row now says so, and the per-test JSON is committed at `audit/testsprite/ui-run1-a73e8898.json`.

## Tests
Every BUG-001..023 id is named in at least one test file:
- Vitest: test/tabulate-upload, input-edges, csv-comment, upload-input, fuzz-findings, declared-candidates, review-bugs, stv-rules, openapi-status and review-round2.
- Playwright: tests/e2e/upload-fixes (005–007) and hero-hold (008).

Results:
- Vitest: 263/263 passed at this commit.
- Playwright: 74 passed, 14 skipped at 4a4417e (`audit/ci/e2e-local-round2.txt`). The only commit since then is the parity output.

## TestSprite links
Checked with the CLI's run history and GitHub's commit statuses and comments (read-only).

| ID | Where it resolves |
|---|---|
| 6128d201 | V3 status on 9eb275e (PR #10) |
| 345b7ca3 | V3 status on 4fca0e9 (#10 head) |
| 333d888c, d3a263fb | V3 comments on #20 |
| eef98f7b | V3 comments on #22 |
| a73e8898 | the run JSON above |
| c5846629 (BUG-002 red) | the CLI history of `api:input-edges`: failed, 2026-10-20 10:18 Cairo |

**Not verifiable here:** a2c5660b (BUG-001 red) and b7a771a3 (BUG-001 green). They aren't in any PR status or comment, and they aren't in the CLI run history. Dashboard execution ids are a different namespace from run ids, and the dashboard needs a login. These two links are unconfirmed, not disproven.
