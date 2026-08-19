#!/usr/bin/env bash
# Parses every JS file in the project without executing it.
# Usage: bash scripts/check-syntax.sh
set -u
tmp="$(mktemp -d)"
status=0
while IFS= read -r file; do
  cp "$file" "$tmp/module.mjs"
  if node --check "$tmp/module.mjs" 2>"$tmp/err"; then
    echo "  ok    $file"
  else
    echo "  FAIL  $file"
    sed 's/^/          /' "$tmp/err" | head -6
    status=1
  fi
done < <(find assets/js scripts sw.js -name '*.js' -o -name '*.mjs' 2>/dev/null | sort)
rm -rf "$tmp"
exit $status
