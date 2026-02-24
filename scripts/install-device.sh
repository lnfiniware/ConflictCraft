#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_SCRIPT="$SCRIPT_DIR/conflictcraft"

PREFIX="${PREFIX:-$HOME/.local/bin}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix)
      PREFIX="$2"
      shift
      ;;
    *)
      echo "ConflictCraft install-device: unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

mkdir -p "$PREFIX"
TARGET="$PREFIX/conflictcraft"

cat > "$TARGET" <<EOF
#!/usr/bin/env bash
exec "$SOURCE_SCRIPT" "\$@"
EOF

chmod +x "$TARGET"

echo "ConflictCraft: installed launcher at $TARGET"
case ":$PATH:" in
  *":$PREFIX:"*)
    echo "ConflictCraft: $PREFIX is already in PATH"
    ;;
  *)
    echo "ConflictCraft: add this to your shell profile:"
    echo "  export PATH=\"$PREFIX:\$PATH\""
    ;;
esac
