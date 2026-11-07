#!/usr/bin/env bash
# Hook SessionStart (Claude Code) : garantit que le graphe graphify se met à jour après chaque commit dans CE clone.
# Les hooks git ne sont pas versionnés : un repo créé depuis le template ne les a pas encore.
# Silencieux quand tout est en place ; ne bloque jamais la session.
export PATH="$HOME/.local/bin:$PATH"
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

if ! command -v graphify >/dev/null 2>&1; then
  echo "graphify n'est pas installé sur cette machine : le graphe de code ne sera pas mis à jour. Proposer à l'utilisateur de lancer ./scripts/setup.sh."
  exit 0
fi

if ! graphify hook status 2>/dev/null | grep -q "post-commit: installed"; then
  graphify hook install >/dev/null 2>&1 && echo "Hooks git graphify installés : le graphe se mettra à jour après chaque commit."
fi

if [ ! -f graphify-out/graph.json ]; then
  nohup graphify update . >/dev/null 2>&1 </dev/null &
  echo "Construction initiale du graphe graphify lancée en arrière-plan (graphify-out/)."
fi
exit 0
