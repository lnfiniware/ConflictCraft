#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "usage: mergetool-driver.sh <BASE> <LOCAL> <REMOTE> <MERGED>"
  exit 1
fi

BASE="$1"
LOCAL="$2"
REMOTE="$3"
MERGED="$4"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Build an explicit conflict-marked file first, then run ConflictCraft deterministic resolver.
git merge-file -p "$LOCAL" "$BASE" "$REMOTE" > "$MERGED"
"$ROOT_DIR/scripts/conflictcraft" resolve "$MERGED" --write
exit $?
