#!/usr/bin/env bash
set -euo pipefail
desc="$1"; VERCEL="$2"
get() { echo "$VERCEL"; }
# Fail closed: pass only on an "N/N passed" (or "N of N passed") count. Text that doesn't parse fails the job;
# it used to fall back to 0 failed and pass.
if [[ "$desc" =~ ^[[:space:]]*([0-9]+)[[:space:]]*(/|of)[[:space:]]*([0-9]+)[[:space:]]+passed ]]; then
  passed=${BASH_REMATCH[1]}; total=${BASH_REMATCH[3]}
else echo "::error::Can't read a pass count from the TestSprite V3 status: '$desc'"; exit 1; fi
if [ "$total" -eq 0 ]; then echo "::error::TestSprite V3 ran 0 tests: $desc"; exit 1; fi
if [ "$passed" -ne "$total" ]; then
  failed=0; blocked=0
  [[ "$desc" =~ ([0-9]+)[[:space:]]+failed ]] && failed=${BASH_REMATCH[1]}
  [[ "$desc" =~ ([0-9]+)[[:space:]]+blocked ]] && blocked=${BASH_REMATCH[1]}
  if [ "$failed" -gt 0 ] || [ $((passed + blocked)) -ne "$total" ]; then echo "::error::TestSprite V3: $passed of $total passed: $desc"; exit 1; fi
  # Blocked is acceptable only when Vercel deliberately skipped the preview (docs/CI-only PR, no app change).
  v=$(get "Vercel")
  case "$v" in success*Ignored*|success*Canceled*) echo "::notice::$blocked blocked because the preview was skipped by ignoreCommand ($v)";;
    *) echo "::error::TestSprite V3 reports $blocked blocked test(s) on a built preview: $desc"; exit 1 ;; esac
fi
echo "Gate passed: $desc"
