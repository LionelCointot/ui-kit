#!/usr/bin/env bash
# À lancer une fois après avoir cloné un projet créé depuis ce template (idempotent).
# - installe graphify si besoin (via uv ou pipx)
# - branche ses hooks git : le graphe est reconstruit après chaque commit / checkout / merge
# - construit le graphe initial
# - précharge le moteur d'impeccable (binaire téléchargé et vérifié par son lanceur)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
ORIGINAL_PATH="$PATH"
export PATH="$HOME/.local/bin:$PATH"

step() { printf '\n==> %s\n' "$1"; }
warn() { printf '  ! %s\n' "$1" >&2; }

step "graphify"
# Version épinglée sur celle du skill recopié dans le repo : pas de « dernière version » installée à l'aveugle.
gv="$(cat .claude/skills/graphify/.graphify_version 2>/dev/null || true)"
if ! command -v graphify >/dev/null 2>&1; then
  if command -v uv >/dev/null 2>&1; then
    uv tool install "graphifyy${gv:+==$gv}"
  elif command -v pipx >/dev/null 2>&1; then
    pipx install "graphifyy${gv:+==$gv}"
  else
    warn "Ni uv ni pipx trouvés. Installez uv (brew install uv) puis relancez ce script."
    exit 1
  fi
fi
graphify --version
graphify hook install
graphify update . || warn "Construction du graphe échouée : relancez 'graphify update .'"

step "impeccable"
IMPECCABLE=.claude/skills/impeccable/scripts/impeccable
if [ -f "$IMPECCABLE" ]; then
  if sh "$IMPECCABLE" --version >/dev/null 2>&1; then
    echo "  moteur prêt"
  else
    warn "Moteur non téléchargé (réseau ?) : il le sera au premier usage."
  fi
else
  echo "  non installé dans ce projet (pas de front ?)"
fi

case ":$ORIGINAL_PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) warn "~/.local/bin n'est pas dans votre PATH : lancez 'uv tool update-shell' puis rouvrez le terminal." ;;
esac

printf '\nTerminé. Dans Claude Code : « Initialise ce projet » (skill project-init).\n'
