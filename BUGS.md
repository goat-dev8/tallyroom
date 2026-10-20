# Bugs found by tests

Each row is a real defect: the test that caught it, the failing run, the PR that fixed it, and the green run on that PR's head.

| ID | Area | Bug | Found by (test) | Red run | Fix PR | Green run |
|---|---|---|---|---|---|---|
| BUG-001 | api | Headerless CSV of single-choice ballots (`3,A`) is rejected as CSV_FORMAT_AMBIGUOUS | `api:csv-single-choice` | pending | fix/csv-single-choice | pending |
| B-001 | ui | ArrowLeft/Right only worked when focus was inside the dashboard grid; with focus on <body> nothing happened. Now a window-level listener. | TestSprite `ui:round-keyboard` | [6128d201](https://www.testsprite.com/dashboard-v3/o/dd10cd84-8b8f-5d0b-87b0-254e74a42770/projects/f312fcf5-741d-4116-bed4-c7ac9334859a/execution/6128d201-e6b2-4306-975a-504e1e24bfc9) | #10 | pending |
| B-002 | ui | Sankey flow tooltip only opened on mouse hover; taps and automation could not read exact transfer counts. Added tap/click and an accessible transfer list. | TestSprite `ui:sankey-tooltip` | [a73e8898](https://www.testsprite.com/dashboard-v3/o/dd10cd84-8b8f-5d0b-87b0-254e74a42770/projects/f312fcf5-741d-4116-bed4-c7ac9334859a/execution/a73e8898-63bd-4d2c-8981-969b0d7f2ae7) | #10 | pending |
