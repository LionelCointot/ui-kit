#!/usr/bin/env bash
# Met à jour graphify et impeccable dans ce repo, puis remet la config des hooks Claude Code en forme portable.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
export PATH="$HOME/.local/bin:$PATH"

echo "==> graphify"
if command -v uv >/dev/null 2>&1 && uv tool list 2>/dev/null | grep -q '^graphifyy'; then
  uv tool upgrade graphifyy
fi
graphify install --project --platform claude >/dev/null
graphify hook install >/dev/null   # ré-épingle l'interpréteur après une mise à jour

echo "==> impeccable"
npx -y impeccable@latest update -y

echo "==> normalisation des hooks Claude Code"
node scripts/lib/normalize-claude-settings.mjs

git status --short .claude CLAUDE.md
echo "Relisez le diff puis commitez : git commit -am 'chore: met à jour graphify et impeccable'"
