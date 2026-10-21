# fix/ui-polish: browser QA follow-up and the remaining manual-QA items

Red: `red-playwright-production.txt` (`tests/e2e/ui-polish.spec.ts` against production: 9 failed, 2 guards passed, 3 skipped by viewport). Green: `green-playwright-local.txt` (whole e2e suite against local `next start`: 62 passed, 4 skipped, 0 failed). `after/` has screenshots from the local build.

| Item | Still on prod? | Fix |
|---|---|---|
| a. "Link copied." banner pushed the page down 54px and never went away | yes | A fixed toast (`data-testid="toast"`, role=status) fades out after 2.5s and causes no layout shift. If the clipboard fails, it shows the URL for 8s |
| b. Struck-through eliminated names truncated ("Paperboy Love Prin…", NYC R3) | yes | The ✕ moves into the rank column. The name column is wider (14.5rem), the name has a `title` with the full name, and screen readers hear "(eliminated)" |
| Counting blanked the results and the page collapsed (main 1,544px → 818px → 3,283px) | yes | When switching elections, `main` keeps its old height (min-height) until the new count lands |
| Seats input: clearing snapped to 1, typing 3 gave "13", 14px font zooms on iOS | yes | Text input with numeric keypad. Digits only, so "-" is dropped. It can be empty while typing and is clamped to 1–50 on blur. 16px on mobile |
| Mobile nav: section links hidden below md with no menu | yes | `MobileNav` button (`nav-menu`, aria-expanded) with a panel (`mnav-*`). A link or Esc closes it |
| Upload errors showed only the first bad line | yes | The parser collects every bad line (first 5 listed, then "and N more bad lines"). A single bad line keeps the old message. `test/multi-error.test.ts` |
| Hero pause froze numbers | no | Probe: pausing 100, 300 and 600ms into a transition landed exactly on the round values. The hold-final-round fix is on `fix/hero-demo` |
| Focus rings / footer hover | no | Footer and nav links have a solid focus outline and the hover colour changes. Guard test added |
| /app scroll at ~400px | no | No horizontal overflow at 400px or 390px. Guard test added |
