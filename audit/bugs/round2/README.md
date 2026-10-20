# Local bug hunt, round 2 (fix/review-bugs)

Findings: BUG-019 (STV ignored ballot rules, on production too), BUG-020 (OpenAPI omitted report 413 and MCP 400; the routes aren't on production).
Reviewer round 2 findings, reproduced here: BUG-021..023 (evidence in ../round2b/).

Probed with nothing found:
- UI probe (`ui/probe.mjs`, output in `ui/probe-output.txt`, 18 screenshots) against a local `next start`, desktop 1280 and mobile 390:
  - landing, STV sample with 2 seats, bare-CR upload, NFD/NFC name merge;
  - deep links: round 3, round 99 (clamped to 8), round 0 (clamped to 1), and an unknown election (falls back to Maine, which `tests/e2e/dashboard.spec.ts` treats as intended);
  - 0 px horizontal overflow and 0 console/page errors.
- The UI sends only `ballots` and `seats` to /api/tabulate, so the new rule validation (BUG-013, 018, 019) can't reject a UI request.
- Non-operation methods return 405 on every route. This was left undocumented on purpose.
- `/api/elections/{id}/tabulate` ignores the request body. Its spec declares no requestBody, so that's consistent.
