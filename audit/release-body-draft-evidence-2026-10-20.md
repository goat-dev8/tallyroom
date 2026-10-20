<!-- DRAFT only: not applied. Editing the release is externally visible and needs the user's approval. -->
Evidence snapshots for the Tallyroom fix stack and audit folder.

The git tag `evidence-2026-10-20` points at `98d523f` (`main`). Its source tarball has the early ledger, through BUG-007. Everything later is in the assets below, and the fix commits are on the open PR #24 branch `ts-red-green`.

| Asset | Contents | Checksums |
|---|---|---|
| `stack-2026-10-20d.bundle`, `audit-evidence-2026-10-20.tar.gz` | First snapshot: stack and evidence for BUG-008..023 | `SHA256SUMS.txt` |
| `stack-2026-10-20-round3.bundle`, `audit-evidence-2026-10-20-round3.tar.gz` | Round 3: BUG-024..040. The bundle holds the local branch heads `fix/upload-input`, `fix/review-bugs`, `fix/hero-demo`, `fix/sankey-a11y`, `fix/ui-polish` and `test/parity-fuzz`, which were never pushed under those names. | `SHA256SUMS-round3.txt` |
| `audit-evidence-2026-10-20-prodred.tar.gz` | TestSprite regression tests run red on production for 15 ledger bugs | `SHA256SUMS-prodred.txt` |
| `audit-evidence-2026-10-21-pr24.tar.gz` | PR #24: the same 15 tests run red on the buggy-head preview and green on the fixed preview | `SHA256SUMS-pr24.txt` |

The TestSprite tests were written after each bug was found by other means: Vitest, the fuzzer, review or manual QA. They reproduce the bugs; TestSprite did not discover them. See `audit/defects.md` on `ts-red-green`.
