#!/usr/bin/env bash
# Usage: fuzz/sweep.sh FIRST_SEED LAST_SEED CASES_PER_SEED  -> one JSON summary line per seed; exit 1 on any divergence
set -u; fail=0; tmp=$(mktemp -d)
for s in $(seq "$1" "$2"); do
  python3 fuzz/gen.py "$s" "$3" > "$tmp/c.jsonl"
  if ! out=$(npx tsx fuzz/run.ts "$tmp/c.jsonl" "$tmp/r$s.json"); then fail=1; cp "$tmp/r$s.json" "fuzz-divergences-seed$s.json"; fi
  echo "{\"seed\":$s,${out#\{}"
done
exit $fail
