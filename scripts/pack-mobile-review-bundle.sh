#!/usr/bin/env bash
# Build a chat-safe archive: mobile PNGs + review prompt only (no .env, no source).
# Output: capital-markets-mobile-review-YYYYMMDD-HHMM.tar.gz (not .zip — fewer upload blocks)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M)"
OUT="capital-markets-mobile-review-${STAMP}.tar.gz"
MANIFEST="mobile-review-bundle-MANIFEST.txt"

if [[ ! -d screenshots ]] || [[ -z "$(ls -A screenshots 2>/dev/null)" ]]; then
  echo "No screenshots/ — run: npm run screenshots:mobile" >&2
  exit 1
fi

if [[ ! -f mobile-screenshot-review-prompt.md ]]; then
  echo "Missing mobile-screenshot-review-prompt.md" >&2
  exit 1
fi

{
  echo "Capital Markets — mobile screenshot review pack"
  echo "Built: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo ""
  echo "Contains only:"
  echo "  - screenshots/*.png"
  echo "  - mobile-screenshot-review-prompt.md"
  echo ""
  echo "Excluded by design: .env*, source, node_modules, caches, .git."
  echo "Attach ${OUT} to your chat (or rename to .tar if a client blocks .gz)."
} >"$MANIFEST"

tar -czf "$OUT" \
  mobile-screenshot-review-prompt.md \
  "$MANIFEST" \
  screenshots

rm -f "$MANIFEST"

echo "$OUT ($(du -h "$OUT" | cut -f1))"
ls -la "$OUT"
