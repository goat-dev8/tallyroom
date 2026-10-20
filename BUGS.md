# Bugs found by tests

Each row is a real defect: the test that caught it, the failing run, the PR that fixed it, and the green run on that PR's head.

| ID | Area | Bug | Found by (test) | Red run | Fix PR | Green run |
|---|---|---|---|---|---|---|
| BUG-001 | api | Headerless CSV of single-choice ballots (`3,A`) is rejected as CSV_FORMAT_AMBIGUOUS | `api:csv-single-choice` | pending | fix/csv-single-choice | pending |
