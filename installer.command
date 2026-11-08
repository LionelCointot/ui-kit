#!/usr/bin/env bash
# Double-clic (macOS) : installe Node, .NET et toutes les dépendances du projet.
cd "$(dirname "$0")" || exit 1
bash scripts/dev/bootstrap.sh install
status=$?
echo
if [ "$status" -eq 0 ]; then echo "Installation terminée. Double-cliquez sur lancer.command pour démarrer."; else echo "L'installation a échoué (code $status)."; fi
read -r -p "Appuyez sur Entrée pour fermer" _
exit "$status"
