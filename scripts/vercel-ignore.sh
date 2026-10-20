#!/usr/bin/env bash
# Vercel ignoreCommand: exit 0 = SKIP the build, exit 1 = BUILD.
# Skips deployments when every changed file is docs-only, TestSprite-plan-only or CI-only.
# Saves Hobby deploy quota (~100/24h; we cap ourselves at 80, see DEPLOY_LEDGER.md).
# Note: a skipped build produces no preview, so TestSprite does not run on that commit (intended).
set -euo pipefail
BASE="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$BASE" ] || ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
  # No usable previous deployment SHA (first deploy, or shallow clone): diff against parent if present, else build.
  if git rev-parse -q --verify HEAD^ >/dev/null; then BASE="HEAD^"; else echo "build: no base"; exit 1; fi
fi
CHANGED="$(git diff --name-only "$BASE" HEAD)"
if [ -z "$CHANGED" ]; then echo "skip: no file changes"; exit 0; fi
SKIP_RE='^(docs/.*|audit/.*|\.oxlintrc\.json|[^/]+\.md|LICENSE|\.github/.*|testsprite/.*|testsprite_tests/.*|\.testsprite/.*|scripts/vercel-ignore\.sh|scripts/testsprite-filter\.mjs|DEPLOY_LEDGER\.md)$'
while IFS= read -r f; do
  if ! [[ "$f" =~ $SKIP_RE ]]; then echo "build: $f changed"; exit 1; fi
done <<< "$CHANGED"
echo "skip: docs/test-plan/CI-only change"; exit 0
