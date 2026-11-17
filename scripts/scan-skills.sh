#!/usr/bin/env bash
# Scanne les skills tiers du repo avec NVIDIA SkillSpector (analyse statique seule : rien n'est envoyé à un modèle).
# Usage : scripts/scan-skills.sh [--accept] [skill...]
#   sans argument : tous les skills tiers présents (ceux qui ont un fichier VERSION, plus graphify et impeccable)
#   --accept      : enregistre les constats actuels comme relus (scripts/skillspector-baseline.txt)
# N'affiche que les constats de gravité haute absents de la liste des constats relus : après une mise à jour d'un
# skill tiers, ce sont les lignes à lire. Le score de l'outil ne bloque rien : il est trop bruyant (mots isolés,
# commandes npx sans version) ; un constat nouveau se relit, puis s'accepte avec --accept ou fait retirer le skill.
# Appelé à la fin de scripts/update-tools.sh. Code de sortie : 0 (rien de nouveau ou outil absent), 1 (constats nouveaux).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
export PATH="$HOME/.local/bin:$PATH"
baseline="scripts/skillspector-baseline.txt"
# Version figée et relue de l'outil. Changer de version : relire le journal des changements amont.
ref="a09091e0ebf6c96ff327457529d7b0d372125884"   # SkillSpector 2.12.0

accept=0; [ "${1:-}" = "--accept" ] && { accept=1; shift; }
if ! command -v skillspector >/dev/null 2>&1; then
  echo "SkillSpector absent : scan des skills tiers non lancé."
  echo "  Installation : uv tool install --python 3.13 git+https://github.com/NVIDIA/SkillSpector.git@$ref"
  exit 0
fi

skills=("$@")
if [ ${#skills[@]} -eq 0 ]; then
  for d in .claude/skills/*/; do
    name="$(basename "$d")"
    if [ -f "$d/VERSION" ] || [ "$name" = graphify ] || [ "$name" = impeccable ]; then skills+=("$name"); fi
  done
fi
[ ${#skills[@]} -gt 0 ] || { echo "Aucun skill tiers à scanner."; exit 0; }

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/skills"
for name in "${skills[@]}"; do
  [ -d ".claude/skills/$name" ] || { echo "Skill introuvable : $name" >&2; exit 2; }
  cp -R ".claude/skills/$name" "$tmp/skills/$name"
done
echo "Scan de ${#skills[@]} skill(s) tiers (plusieurs minutes pour impeccable et ui-ux-pro-max)…"
skillspector scan "$tmp/skills" --recursive --no-llm --format json --output "$tmp/report.json" >/dev/null 2>&1 || true
[ -s "$tmp/report.json" ] || { echo "SkillSpector n'a produit aucun rapport." >&2; exit 2; }

python3 - "$tmp/report.json" "$baseline" "$accept" <<'PY'
import json, os, sys
report, baseline, accept = sys.argv[1], sys.argv[2], sys.argv[3] == "1"
data = json.load(open(report, encoding="utf-8"))
skills = data["skills"] if data.get("multi_skill") else [data]
known = set(open(baseline, encoding="utf-8").read().splitlines()) if os.path.exists(baseline) else set()
scanned = {s["name"] for s in skills}
current, fresh = set(), []
for s in skills:
    high = 0
    for issue in s.get("issues", []):
        # AE1 : fichier que l'outil n'a pas su analyser en entier, pas un comportement du skill.
        if issue.get("severity") != "HIGH" or issue.get("id") == "AE1":
            continue
        high += 1
        loc = issue.get("location") or {}
        key = "|".join([s["name"], issue.get("id", ""), loc.get("file") or "", " ".join((issue.get("finding") or "").split())[:120]])
        current.add(key)
        if key not in known:
            fresh.append((key, loc.get("start_line"), issue.get("pattern", "")))
    print(f"  {s['name']:<32} score {s.get('risk_score', '?'):>3}  constats hauts : {high}")
if accept:
    kept = {k for k in known if k.split("|", 1)[0] not in scanned}   # garde les constats relus des skills non scannés
    open(baseline, "w", encoding="utf-8").write("\n".join(sorted(kept | current)) + "\n")
    print(f"{len(current)} constat(s) enregistré(s) comme relus dans {baseline}.")
    sys.exit(0)
if fresh:
    print(f"\n{len(fresh)} constat(s) nouveau(x) à relire :")
    for key, line, pattern in fresh:
        skill, rule, file, finding = key.split("|", 3)
        print(f"  [{rule}] {skill}/{file}:{line}  {pattern} : {finding}")
    print("\nRelisez-les dans le skill, puis : scripts/scan-skills.sh --accept   (ou retirez le skill).")
    sys.exit(1)
print("Aucun constat nouveau par rapport aux constats déjà relus.")
PY
