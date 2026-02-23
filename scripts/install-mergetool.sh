#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRIVER="$ROOT_DIR/scripts/mergetool-driver.sh"

git config --global merge.tool conflictcraft
git config --global mergetool.conflictcraft.cmd "\"$DRIVER\" \"\$BASE\" \"\$LOCAL\" \"\$REMOTE\" \"\$MERGED\""
git config --global mergetool.conflictcraft.trustExitCode true

echo "ConflictCraft global mergetool installed."
