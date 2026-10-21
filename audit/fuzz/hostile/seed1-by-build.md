# Hostile mode, seed 1, 400 cases (python3 fuzz/hostile.py 1 400), run 2026-10-20 21:45 Cairo (UTC+3)

| Build of src/ | Divergences | By shape |
|---|---|---|
| 332a7b0 (main before #20: BUG-002..004 and 009..011 present) | 213 | {'reserved': 7, 'bytes-over': 47, 'big-over': 48, 'header-only': 41, 'comments': 34, 'json-as-csv': 36} |
| c737597 (after #20) | 117 | {'bytes-over': 47, 'comments': 34, 'json-as-csv': 36} |
| 98d523f (main today: BUG-009..011 present) | 117 | {'bytes-over': 47, 'comments': 34, 'json-as-csv': 36} |
| this branch | 0 | {} |

Shapes and the bugs they correspond to: `header-only` = BUG-002, `reserved` = BUG-003 (`__proto__` and other Object.prototype names), `big-over` = BUG-004 (total above 2^53 − 1), `comments` = BUG-009, `bytes-over` = BUG-010, `json-as-csv` = BUG-011. `big-safe`, `unicode`, `crlf-bom` and `bytes-under` must be counted exactly, and they agree with `fuzz/oracle.py` on every build.

On the old build, `reserved` failed 7 of its 30 cases, the ones that used `__proto__` itself. The other reserved names already worked there.

`seed1-332a7b0.json` holds every divergence on the oldest build. Ballot text is cut to 200 characters and the oracle answers are left out to keep the file small; rerun the command to get them back.
