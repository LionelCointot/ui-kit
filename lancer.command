#!/usr/bin/env bash
# Double-clic (macOS) : lance l'API et l'application, puis ouvre le navigateur. Ctrl+C arrête tout.
cd "$(dirname "$0")" || exit 1
bash scripts/dev/bootstrap.sh start
status=$?
echo
read -r -p "Appuyez sur Entrée pour fermer" _
exit "$status"
