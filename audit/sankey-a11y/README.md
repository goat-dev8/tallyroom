# fix/sankey-a11y: manual QA on /app (NYC 2021 R1→R2), items 1–10

`before/`: momo's screenshots from the manual QA (production). `after/`: local build screenshots.
Red: `red-playwright-production.txt` (tests/e2e/sankey-a11y.spec.ts against https://tallyroom-rosy.vercel.app, 9 of 10 fail).
Green: `green-playwright-local.txt` (whole e2e suite against local `next start`: 61 passed, 11 skipped (mobile, desktop-only checks), 0 failed).

| # | Defect | Fix | Test |
|---|---|---|---|
| 1 | Focus ring drew the flow's bounding box | The SVG outline is removed. A tally-coloured stroke follows the focused curve (`sankey-focus`) | 1 |
| 2 | A focused flow was not scrolled into view | When a flow gets focus, the page scrolls until both ends of the flow are on screen (and the horizontal scroller on mobile) | 2 |
| 3 | Each of the 28 flows was a Tab stop, so Shift+Tab jumped around | One Tab stop for the whole diagram (roving tabindex). Arrow keys, Home and End move between flows, Esc clears. The table region is focusable | 3 |
| 4 | Round bars had no hover feedback | `bar-tooltip`: votes, share of continuing, transfer gain, eliminated | 4 |
| 5 | Sankey nodes had no tooltip | Node hit rects show name, count and round | 5 |
| 6 | The link tooltip needed a second mouse move | Hit paths sit on top, enter and move both set the tip, and leaving only clears the flow that is shown. A synthetic single move did not reproduce this in Chromium on production, so test 6 is a guard | 6 (guard) |
| 7 | The keyboard tooltip appeared mid-diagram | It is anchored at 92% along the flow, next to the destination node | 7 |
| 8 | Small-candidate labels overlapped and flow lines struck through the Write-in label | Labels are spread per column (15px minimum, with leader ticks), the diagram is taller (max 640), and labels have a dark halo (paint-order stroke) | 8 |
| 9 | Flows 1–3px wide could not be hovered | Each flow has an invisible hit path at least 12px wide. Thin flows are drawn last, on top | 9 |
| 10 | R2–R8 tabs had low contrast | Upcoming rounds use #b4b9c2 (9.7:1 on the panel) at 11px | 10 |

TestSprite plans, written but not created in TestSprite and never run: `testsprite/planned/frontend/ui-sankey-keyboard.json`, `ui-sankey-hover.json`, `ui-sankey-labels.json`. The existing `ui:sankey-render` plan still holds: the aria-label is unchanged and every flow keeps `data-testid="sankey-link"` and `class="sankey-link"`. The drawn curve is now `sankey-flow`.
