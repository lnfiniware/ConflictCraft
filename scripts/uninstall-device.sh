#!/usr/bin/env bash
set -euo pipefail

PREFIX="${PREFIX:-$HOME/.local/bin}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix)
      PREFIX="$2"
      shift
      ;;
    *)
      echo "ConflictCraft uninstall-device: unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

TARGET="$PREFIX/conflictcraft"
if [[ -f "$TARGET" ]]; then
  rm -f "$TARGET"
  echo "ConflictCraft: removed $TARGET"
else
  echo "ConflictCraft: launcher not found at $TARGET"
fi
