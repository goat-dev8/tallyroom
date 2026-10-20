# Local bug hunt, round 3 (fix/review-bugs)

Found: BUG-024 (production), BUG-025 (stack only, MCP), BUG-026 (production), BUG-027 (stack regression). Rows are in `audit/defects.md`.

Probed with nothing found:
- **Hare quota and exact surplus over several rounds.** The STV oracle now uses the same ballot rules as the engine. It went through 29,239 STV cases (seeds 300–304, about 60% of them with overvote/skips/duplicates rules, half Hare) with 0 divergences (`../../fuzz/round3/sweep-300-304.txt`). The conservation property test passes.
- **Ties at election, and zero-vote or declared-but-absent candidates.** Covered by the same sweep, since the generator declares candidates that may never appear and uses small counts so ties are frequent. 0 divergences.
- **STV report vs tabulate.** Both call the same `tabulateStv`. The STV report carries no transfer edges, and the spec doesn't promise any, so there is nothing to compare. The only inconsistency was the `rules` field (BUG-027).

Fuzzer change: STV cases now send overvote, skips and duplicates rules (this closes the BUG-019 gap). On the pre-BUG-019 build (9f120a5), seed 300 gives 1,302 STV divergences, all in cases that send those rules. The working tree gives 0.
