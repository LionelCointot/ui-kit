#!/usr/bin/env bash
# Copie les skills génériques vers ~/.claude/skills pour les avoir dans TOUS vos projets.
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)/.claude/skills"
DEST="$HOME/.claude/skills"
mkdir -p "$DEST"
for s in "$@"; do
  [ -d "$SRC/$s" ] && cp -r "$SRC/$s" "$DEST/" && echo "Installé : $s" || echo "Introuvable : $s"
done
[ $# -eq 0 ] && echo "Usage : $0 spec-writer adr code-review ..."
